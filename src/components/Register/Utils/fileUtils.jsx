import fs from "fs/promises";
import path from "path";

const SOFTWARE_EXTENSIONS = [
  "py",
  "js",
  "java",
  "cpp",
  "c",
  "h",
  "hpp",
  "jar",
  "exe",
  "sh",
  "bat",
  "r",
  "rb",
  "go",
  "rs",
  "swift",
  "kt",
  "scala",
  "pl",
];

const DATASET_EXTENSIONS = [
  "csv",
  "tsv",
  "json",
  "xml",
  "xlsx",
  "xls",
  "parquet",
  "h5",
  "hdf5",
  "txt",
  "dat",
  "npy",
  "npz",
  "feather",
  "arrow",
  "sqlite",
  "db",
];

const findRootNode = (metadata) => {
  if (metadata["@graph"]?.[0]?.about?.["@id"]) {
    const rootId = metadata["@graph"][0].about["@id"];
    const rootNode = metadata["@graph"].find((item) => item["@id"] === rootId);
    if (rootNode) return rootNode;
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

export const determineFileType = (filePath) => {
  const extension = path.extname(filePath).slice(1).toLowerCase();

  if (SOFTWARE_EXTENSIONS.includes(extension)) {
    return "software";
  } else if (DATASET_EXTENSIONS.includes(extension)) {
    return "dataset";
  }

  return "dataset"; // default
};

export const readFilesRecursively = async (dir, baseDir) => {
  let results = [];
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (item.isDirectory()) {
      results = results.concat(await readFilesRecursively(fullPath, baseDir));
    } else if (
      item.isFile() &&
      item.name !== "ro-crate-metadata.json" &&
      item.name !== ".DS_Store"
    ) {
      results.push(relativePath);
    }
  }

  return results;
};

export const normalizePath = (filePath) =>
  filePath.replace(/^\//, "").replace(/\\/g, "/");

export const loadRoCrateFiles = async (rocratePath) => {
  if (!rocratePath) {
    throw new Error("Please select an RO-Crate directory.");
  }

  const fileList = await fs.readdir(rocratePath);
  const metadataExists = fileList.includes("ro-crate-metadata.json");

  if (!metadataExists) {
    return { needsInit: true };
  }

  const files = await readFilesRecursively(rocratePath, rocratePath);

  if (files.length === 0) {
    throw new Error(
      "No files found in the RO-Crate directory. Please add files to the selected folder."
    );
  }

  const metadataPath = path.join(rocratePath, "ro-crate-metadata.json");
  const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
  const rootNode = findRootNode(metadata);

  const registeredItems = metadata["@graph"]
    .filter((item) => item.contentUrl)
    .map((item) => {
      const cleanPath = item.contentUrl.replace("file://", "");
      const normalizedPath = normalizePath(cleanPath);

      return {
        path: normalizedPath,
        isAutoRegistered: item.autoRegistered === true,
        type: item["@type"]?.includes("Dataset") ? "dataset" : "software",
      };
    });

  const filesWithStatus = files.map((filePath) => {
    const normalizedFilePath = normalizePath(filePath);
    const registered = registeredItems.find(
      (item) => item.path === normalizedFilePath
    );

    return {
      path: normalizedFilePath,
      status: registered
        ? registered.isAutoRegistered
          ? "auto-registered"
          : "manually-registered"
        : "unregistered",
      type: registered
        ? registered.type
        : determineFileType(normalizedFilePath),
      metadata: null,
    };
  });

  return {
    files: filesWithStatus,
    registeredFiles: registeredItems.map((item) => item.path),
    packageType: rootNode?.packageType || null,
    metadata: metadata,
    autoComplete: rootNode?.autoComplete || false,
    needsInit: false,
  };
};

export const generateGuid = (name) => {
  const NAAN = "59853";
  const sq = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "")
    .slice(0, 14);
  return `ark:${NAAN}/dataset-${name.toLowerCase().replace(/\s+/g, "-")}-${sq}`;
};

export const createJsonLdPreview = (formData, schemaGuid) => {
  const guid = generateGuid(formData.name);
  return {
    "@context": {
      "@vocab": "https://schema.org/",
      EVI: "https://w3id.org/EVI#",
    },
    "@id": guid,
    "@type": "https://w3id.org/EVI#Dataset",
    name: formData.name,
    author: formData.author,
    version: formData.version,
    datePublished: formData["date-published"],
    description: formData.description,
    keywords: formData.keywords
      ? formData.keywords.split(",").map((k) => k.trim())
      : [],
    format: formData["data-format"],
    url: formData.url || undefined,
    usedBy: formData["used-by"] || undefined,
    derivedFrom: formData["derived-from"] || undefined,
    schema: schemaGuid || undefined,
    associatedPublication: formData["associated-publication"] || undefined,
    additionalDocumentation: formData["additional-documentation"] || undefined,
  };
};
