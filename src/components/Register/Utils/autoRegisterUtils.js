import {
  register_dataset,
  register_software,
  register_schema,
} from "@fairscape/utils";
import { ipcRenderer } from "electron";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const findRootNode = (metadata) => {
  if (metadata["@graph"]?.[0]?.about?.["@id"]) {
    const rootId = metadata["@graph"][0].about["@id"];
    const rootNode = metadata["@graph"].find((item) => item["@id"] === rootId);
    if (rootNode) {
      return rootNode;
    }
  }

  if (metadata["@graph"]?.[1]) {
    return metadata["@graph"][1];
  }

  return metadata["@graph"].find(
    (item) =>
      item["@type"] === "https://w3id.org/EVI#ROCrate" ||
      item["@type"] === "EVI:ROCrate"
  );
};

export const calculateMD5 = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash("md5");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
};

export const getFileStats = async (filePath) => {
  const stats = await fs.stat(filePath);
  return {
    contentSize: stats.size,
    dateModified: stats.mtime.toISOString().split("T")[0],
  };
};

export const generateAutoMetadata = async (
  rocratePath,
  filePath,
  fileType,
  roCrateMetadata
) => {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(rocratePath, filePath);
  const { contentSize, dateModified } = await getFileStats(fullPath);
  const md5 = await calculateMD5(fullPath);
  const fileName = path
    .basename(filePath, path.extname(filePath))
    .replace(/_/g, " ");
  const fileExtension = path.extname(filePath).slice(1).toUpperCase();

  const rootNode = findRootNode(roCrateMetadata);

  const baseMetadata = {
    name: fileName,
    author: rootNode?.author || "Unknown Author",
    version: "1.0",
    description: `${fileName}: in RO-Crate: ${rootNode?.name || "Unknown"}`,
    keywords: rootNode?.keywords?.join(", ") || "",
    contentSize: contentSize,
    md5: md5,
    datePublished: new Date().toISOString().split("T")[0],
  };

  if (fileType === "dataset") {
    return {
      ...baseMetadata,
      "data-format": fileExtension,
      url: "",
      "used-by": [],
      "derived-from": [],
      "associated-publication": "",
      "additional-documentation": "",
    };
  } else {
    return {
      ...baseMetadata,
      "file-format": fileExtension,
      "date-modified": dateModified,
      url: "",
      "used-by-computation": "",
      "associated-publication": "",
      "additional-documentation": "",
    };
  }
};

const generateGuid = (name, type) => {
  const NAAN = "59852";
  const sq = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "")
    .slice(0, 14);
  return `ark:${NAAN}/${type}-${name.toLowerCase().replace(/\s+/g, "-")}-${sq}`;
};

export const autoRegisterFile = async (
  rocratePath,
  filePath,
  fileType,
  roCrateMetadata
) => {
  const metadata = await generateAutoMetadata(
    rocratePath,
    filePath,
    fileType,
    roCrateMetadata
  );
  const fullFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(rocratePath, filePath);
  const guid = generateGuid(metadata.name, fileType);

  let schemaGuid = null;

  if (typeof metadata.keywords === "string") {
    metadata.keywords = metadata.keywords
      .split(",")
      .map((keyword) => keyword.trim());
  }

  if (fileType === "dataset") {
    const fileExtension = filePath.toLowerCase().split(".").pop();

    if (["csv", "tsv"].includes(fileExtension)) {
      try {
        const relativePath = path.isAbsolute(filePath)
          ? path.relative(rocratePath, filePath)
          : filePath;

        const schemaJSON = await ipcRenderer.invoke(
          "convert-csv-to-schema",
          rocratePath,
          relativePath
        );

        const schemaId = generateGuid(`${metadata.name}-schema`, "schema");

        schemaGuid = await register_schema(
          rocratePath,
          schemaJSON.name || `${metadata.name} Schema`,
          schemaJSON.description ||
            `Auto-generated schema for ${metadata.name}`,
          schemaJSON.properties,
          Object.keys(schemaJSON.properties),
          schemaJSON.separator || ",",
          schemaJSON.header !== undefined ? schemaJSON.header : true,
          schemaId,
          null,
          true,
          []
        );
      } catch (error) {
        console.error(`Failed to generate schema for ${filePath}:`, error);
      }
    }

    const datasetParams = {
      name: metadata.name,
      author: metadata.author,
      version: metadata.version,
      datePublished: metadata.datePublished,
      description: metadata.description,
      keywords: metadata.keywords,
      format: metadata["data-format"],
      "@id": guid,
      url: metadata.url,
      usedBy: metadata["used-by"],
      derivedFrom: metadata["derived-from"],
      associatedPublication: metadata["associated-publication"],
      additionalDocumentation: metadata["additional-documentation"],
      contentSize: metadata.contentSize,
      md5: metadata.md5,
    };

    if (schemaGuid) {
      datasetParams["evi:Schema"] = {
        "@id": schemaGuid,
      };
    }

    register_dataset(rocratePath, datasetParams, fullFilePath);
  } else {
    const softwareParams = {
      name: metadata.name,
      author: metadata.author,
      version: metadata.version,
      description: metadata.description,
      keywords: metadata.keywords,
      format: metadata["file-format"],
      "@id": guid,
      url: metadata.url,
      dateModified: metadata["date-modified"],
      usedByComputation: metadata["used-by-computation"],
      associatedPublication: metadata["associated-publication"],
      additionalDocumentation: metadata["additional-documentation"],
      contentSize: metadata.contentSize,
      md5: metadata.md5,
    };

    register_software(rocratePath, softwareParams, fullFilePath);
  }

  await new Promise((resolve) => setTimeout(resolve, 250));

  return { ...metadata, "@id": guid, schema: schemaGuid, autoRegistered: true };
};

export const extractFileMetadata = async (rocratePath, filePath) => {
  const metadataPath = path.join(rocratePath, "ro-crate-metadata.json");
  const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));

  const normalizedPath = filePath.replace(/^\//, "").replace(/\\/g, "/");
  const fileNode = metadata["@graph"].find(
    (item) =>
      item.contentUrl === `file:///${normalizedPath}` ||
      item.contentUrl === normalizedPath
  );

  if (!fileNode) {
    throw new Error(`No metadata found for file: ${filePath}`);
  }

  const isDataset =
    fileNode["@type"] === "https://w3id.org/EVI#Dataset" ||
    fileNode["@type"] === "EVI:Dataset";

  if (isDataset) {
    return {
      name: fileNode.name,
      author: fileNode.author,
      version: fileNode.version,
      "date-published": fileNode.datePublished,
      description: fileNode.description,
      keywords: Array.isArray(fileNode.keywords)
        ? fileNode.keywords.join(", ")
        : fileNode.keywords,
      "data-format": fileNode.format,
      url: fileNode.url || "",
      "used-by": fileNode.usedBy || [],
      "derived-from": fileNode.derivedFrom || [],
      schema: fileNode.schema || "",
      "associated-publication": fileNode.associatedPublication || "",
      "additional-documentation": fileNode.additionalDocumentation || "",
    };
  } else {
    return {
      name: fileNode.name,
      author: fileNode.author,
      version: fileNode.version,
      description: fileNode.description,
      keywords: Array.isArray(fileNode.keywords)
        ? fileNode.keywords.join(", ")
        : fileNode.keywords,
      "file-format": fileNode.format,
      url: fileNode.url || "",
      "date-modified": fileNode.dateModified,
      "used-by-computation": fileNode.usedByComputation || "",
      "associated-publication": fileNode.associatedPublication || "",
      "additional-documentation": fileNode.additionalDocumentation || "",
    };
  }
};

export const updateFileMetadata = async (
  rocratePath,
  filePath,
  newMetadata,
  fileType
) => {
  const metadataPath = path.join(rocratePath, "ro-crate-metadata.json");
  const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));

  const normalizedPath = filePath.replace(/^\//, "").replace(/\\/g, "/");
  const fileNodeIndex = metadata["@graph"].findIndex(
    (item) =>
      item.contentUrl === `file:///${normalizedPath}` ||
      item.contentUrl === normalizedPath
  );

  if (fileNodeIndex === -1) {
    throw new Error(`No metadata found for file: ${filePath}`);
  }

  const existingNode = metadata["@graph"][fileNodeIndex];

  if (fileType === "dataset") {
    metadata["@graph"][fileNodeIndex] = {
      ...existingNode,
      name: newMetadata.name,
      author: newMetadata.author,
      version: newMetadata.version,
      datePublished: newMetadata["date-published"],
      description: newMetadata.description,
      keywords: newMetadata.keywords.split(",").map((k) => k.trim()),
      format: newMetadata["data-format"],
      url: newMetadata.url || undefined,
      usedBy: newMetadata["used-by"] || undefined,
      derivedFrom: newMetadata["derived-from"] || undefined,
      schema: newMetadata.schema || undefined,
      associatedPublication: newMetadata["associated-publication"] || undefined,
      additionalDocumentation:
        newMetadata["additional-documentation"] || undefined,
    };
  } else {
    metadata["@graph"][fileNodeIndex] = {
      ...existingNode,
      name: newMetadata.name,
      author: newMetadata.author,
      version: newMetadata.version,
      description: newMetadata.description,
      keywords: newMetadata.keywords.split(",").map((k) => k.trim()),
      format: newMetadata["file-format"],
      url: newMetadata.url || undefined,
      dateModified: newMetadata["date-modified"],
      usedByComputation: newMetadata["used-by-computation"] || undefined,
      associatedPublication: newMetadata["associated-publication"] || undefined,
      additionalDocumentation:
        newMetadata["additional-documentation"] || undefined,
    };
  }

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  return metadata["@graph"][fileNodeIndex];
};
