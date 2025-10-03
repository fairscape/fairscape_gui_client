import React, { useState, useEffect } from "react";
import { ipcRenderer } from "electron";
import fs from "fs/promises";
import path from "path";
import styled from "styled-components";
import ReleaseInstructions from "./ReleaseInstructions";
import ReleaseSubCrateScanner from "./ReleaseSubCrateScanner";
import ReleaseSectionForm from "./ReleaseSectionForm";
import ActionSidebar from "./ActionSidebar";
import releaseFormConfig from "./config/releaseFormConfig.json";
import {
  StyledButton,
  FormTitle,
  BrowseButton,
  StyledInput,
  StyledLabel,
  StyledFormGroup,
} from "../StyledComponents";

const MainContainer = styled.div`
  display: flex;
  gap: 20px;
  height: calc(100vh - 100px);
  padding: 20px;
  background-color: ${(props) => props.theme.colors.background};
`;

const FormColumn = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
`;

const PreviewColumn = styled.div`
  width: 400px;
  position: sticky;
  top: 0;
  height: fit-content;
  max-height: 100%;
`;

const DirectorySelector = styled.div`
  background-color: ${(props) => props.theme.colors.card};
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: ${(props) =>
    props.theme.name === "light"
      ? "0 0 10px rgba(0, 0, 0, 0.1)"
      : "0 0 10px rgba(0, 0, 0, 0.3)"};
`;

const StatusMessage = styled.div`
  background-color: ${(props) => props.theme.colors.input};
  color: ${(props) => props.theme.colors.text};
  padding: 10px;
  border-radius: 5px;
  margin-top: 10px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
`;

function ReleaseForm() {
  const [mode, setMode] = useState("selection");
  const [selectedDirectory, setSelectedDirectory] = useState("");
  const [formData, setFormData] = useState({});
  const [subCrates, setSubCrates] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [existingMetadata, setExistingMetadata] = useState(null);

  useEffect(() => {
    initializeForm();
  }, []);

  const initializeForm = () => {
    const initialData = {};
    releaseFormConfig.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.defaultValue === "today") {
          initialData[field.name] = new Date().toISOString().split("T")[0];
        } else if (field.defaultValue) {
          initialData[field.name] = field.defaultValue;
        } else {
          initialData[field.name] = "";
        }
      });
    });
    initialData.hasPart = [];
    setFormData(initialData);
  };

  const handleModeSelect = async (selectedMode) => {
    if (selectedMode === "new") {
      initializeForm();
      setMode("directory");
    } else {
      setMode("directory");
    }
  };

  const handleBrowse = async () => {
    try {
      const result = await ipcRenderer.invoke("open-directory-dialog");
      if (result.filePaths && result.filePaths.length > 0) {
        setSelectedDirectory(result.filePaths[0]);
        await scanDirectory(result.filePaths[0]);
      }
    } catch (error) {
      console.error("Failed to open directory dialog:", error);
    }
  };

  const scanDirectory = async (dirPath) => {
    setIsScanning(true);
    try {
      const metadataPath = path.join(dirPath, "ro-crate-metadata.json");
      const metadataExists = await fs
        .access(metadataPath)
        .then(() => true)
        .catch(() => false);

      if (metadataExists) {
        const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
        const metadataDescriptor = metadata["@graph"]?.find(
          (item) => item["@id"] === "ro-crate-metadata.json"
        );

        let rootNode;
        if (metadataDescriptor && metadataDescriptor.about) {
          const aboutId = metadataDescriptor.about["@id"];
          rootNode = metadata["@graph"]?.find(
            (item) => item["@id"] === aboutId
          );
        }

        if (!rootNode) {
          rootNode = metadata["@graph"]?.find((item) => item["@id"] === "./");
        }

        if (rootNode) {
          setExistingMetadata(rootNode);
          setFormData((prev) => ({
            ...prev,
            ...extractFormDataFromMetadata(rootNode),
          }));
        }
      }

      const detectedSubCrates = await scanForSubCrates(dirPath);
      setSubCrates(detectedSubCrates);
      setFormData((prev) => ({
        ...prev,
        hasPart: detectedSubCrates.map((sc) => ({
          "@id": sc["@id"],
        })),
      }));

      setMode("form");
    } catch (error) {
      console.error("Error scanning directory:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const scanForSubCrates = async (rootPath) => {
    const subCrateList = [];
    try {
      const items = await fs.readdir(rootPath, { withFileTypes: true });

      for (const item of items) {
        if (item.isDirectory()) {
          const metadataPath = path.join(
            rootPath,
            item.name,
            "ro-crate-metadata.json"
          );
          const exists = await fs
            .access(metadataPath)
            .then(() => true)
            .catch(() => false);

          if (exists) {
            const metadata = JSON.parse(
              await fs.readFile(metadataPath, "utf8")
            );

            const metadataDescriptor = metadata["@graph"]?.find(
              (node) => node["@id"] === "ro-crate-metadata.json"
            );

            let rootNode;
            if (metadataDescriptor && metadataDescriptor.about) {
              const aboutId = metadataDescriptor.about["@id"];
              rootNode = metadata["@graph"]?.find(
                (node) => node["@id"] === aboutId
              );
            }

            if (!rootNode) {
              rootNode = metadata["@graph"]?.find(
                (node) => node["@id"] === "./"
              );
            }

            if (rootNode) {
              subCrateList.push({
                "@id": rootNode["@id"] || item.name,
                "@type": rootNode["@type"] || [
                  "Dataset",
                  "https://w3id.org/EVI#ROCrate",
                ],
                name: rootNode.name || item.name,
                description: rootNode.description || "",
                keywords: rootNode.keywords || [],
                isPartOf: rootNode.isPartOf || [],
                version: rootNode.version || "",
                hasPart: rootNode.hasPart || [],
                author: rootNode.author || "",
                path: `./${item.name}/ro-crate-metadata.json`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error scanning for sub-crates:", error);
    }
    return subCrateList;
  };

  const extractFormDataFromMetadata = (metadata) => {
    const extracted = {};
    releaseFormConfig.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (metadata[field.name]) {
          extracted[field.name] = metadata[field.name];
        }
      });
    });
    if (metadata.additionalProperty) {
      metadata.additionalProperty.forEach((prop) => {
        if (prop.name) {
          extracted[prop.name] = prop.value;
        }
      });
    }
    return extracted;
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubCratesChange = (updatedSubCrates) => {
    setSubCrates(updatedSubCrates);
    setFormData((prev) => ({
      ...prev,
      hasPart: updatedSubCrates.map((sc) => ({
        "@id": sc["@id"],
      })),
    }));
  };

  const generateReleaseJson = () => {
    const guid =
      formData["@id"] || `ark:59853/release-${formData.name}-${Date.now()}`;

    const additionalProperties = [];
    const additionalPropertyFields = [
      "Completeness",
      "Prohibited Uses",
      "Human Subject",
      "Data Governance Committee",
    ];

    additionalPropertyFields.forEach((fieldName) => {
      if (formData[fieldName]) {
        additionalProperties.push({
          "@type": "PropertyValue",
          name: fieldName,
          value: formData[fieldName],
        });
      }
    });

    const rootDataset = {
      "@id": "./",
      "@type": ["Dataset", "https://w3id.org/EVI#ROCrate"],
    };

    Object.keys(formData).forEach((key) => {
      if (!additionalPropertyFields.includes(key)) {
        rootDataset[key] = formData[key];
      }
    });

    rootDataset["@id"] = guid;

    if (additionalProperties.length > 0) {
      rootDataset.additionalProperty = additionalProperties;
    }

    const jsonOutput = {
      "@context": {
        "@vocab": "https://schema.org/",
        EVI: "https://w3id.org/EVI#",
      },
      "@graph": [
        {
          "@id": "ro-crate-metadata.json",
          "@type": "CreativeWork",
          about: { "@id": guid },
        },
        rootDataset,
        ...subCrates.map((sc) => ({
          "@id": sc["@id"],
          "@type": sc["@type"],
          name: sc.name,
          description: sc.description,
          keywords: sc.keywords,
          isPartOf: sc.isPartOf,
          version: sc.version,
          hasPart: sc.hasPart,
          author: sc.author,
          "ro-crate-metadata": sc.path,
        })),
      ],
    };

    return jsonOutput;
  };

  const handleSave = async () => {
    const jsonOutput = generateReleaseJson();
    const outputPath = path.join(selectedDirectory, "ro-crate-metadata.json");

    try {
      await fs.writeFile(outputPath, JSON.stringify(jsonOutput, null, 2));
      alert("Release metadata saved successfully!");
    } catch (error) {
      console.error("Error saving release metadata:", error);
      alert("Failed to save release metadata");
    }
  };

  const handleStartOver = () => {
    setMode("selection");
    setSelectedDirectory("");
    setSubCrates([]);
    initializeForm();
  };

  if (mode === "selection") {
    return <ReleaseInstructions onModeSelect={handleModeSelect} />;
  }

  if (mode === "directory") {
    return (
      <DirectorySelector>
        <FormTitle>Select Release Directory</FormTitle>
        <StyledFormGroup>
          <StyledLabel>Directory Path</StyledLabel>
          <StyledInput
            type="text"
            value={selectedDirectory}
            onChange={(e) => setSelectedDirectory(e.target.value)}
            placeholder="Select directory containing sub-crates"
            readOnly
          />
          <BrowseButton onClick={handleBrowse}>Browse</BrowseButton>
        </StyledFormGroup>
        {isScanning && (
          <StatusMessage>Scanning for sub-crates...</StatusMessage>
        )}
        {selectedDirectory && !isScanning && (
          <ButtonGroup>
            <StyledButton onClick={() => scanDirectory(selectedDirectory)}>
              Continue
            </StyledButton>
          </ButtonGroup>
        )}
      </DirectorySelector>
    );
  }

  if (mode === "form") {
    return (
      <MainContainer>
        <FormColumn>
          <ReleaseSectionForm
            formData={formData}
            onFieldChange={handleFieldChange}
          />
          <ReleaseSubCrateScanner
            subCrates={subCrates}
            onSubCratesChange={handleSubCratesChange}
            selectedDirectory={selectedDirectory}
          />
        </FormColumn>
        <ActionSidebar
          onDownload={handleSave}
          onStartOver={handleStartOver}
          isAllSectionsReviewed={true}
          isReviewRequired={false}
        />
      </MainContainer>
    );
  }

  return null;
}

export default ReleaseForm;
