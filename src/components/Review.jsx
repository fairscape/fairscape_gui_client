import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Table, Container, Button, Tabs, Tab } from "react-bootstrap";
import fs from "fs";
import path from "path";
import { ipcRenderer } from "electron";
import InitModal from "./InitModal";
import { JsonLdPreview } from "./StyledComponents";
import DatasetValidator from "./DatasetValidator";

const StyledContainer = styled(Container)`
  background-color: ${(props) => props.theme.colors.card};
  color: ${(props) => props.theme.colors.text};
  padding: 30px;
  border-radius: 10px;
  box-shadow: ${(props) =>
    props.theme.name === "light"
      ? "0 0 10px rgba(0, 0, 0, 0.1)"
      : "0 0 10px rgba(0, 0, 0, 0.3)"};
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 60px);
  overflow: hidden;
`;

const StyledTitle = styled.h2`
  margin-bottom: 30px;
  text-align: center;
  color: ${(props) => props.theme.colors.text};
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const ScrollableContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${(props) => props.theme.colors.input};
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${(props) => props.theme.colors.border};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: ${(props) => props.theme.colors.borderLight};
  }
`;

const StyledTable = styled(Table)`
  color: ${(props) => props.theme.colors.text};
  background-color: ${(props) => props.theme.colors.card};
  border-color: ${(props) => props.theme.colors.border};

  th,
  td {
    border-color: ${(props) => props.theme.colors.border};
  }

  thead th {
    background-color: ${(props) => props.theme.colors.inputHover};
    color: ${(props) => props.theme.colors.text};
    position: sticky;
    top: 0;
    z-index: 1;
  }

  tbody tr:nth-of-type(odd) {
    background-color: ${(props) => props.theme.colors.input};
  }

  tbody tr:hover {
    background-color: ${(props) => props.theme.colors.inputHover};
  }
`;

const TableRow = styled.tr`
  ${(props) =>
    props.unregistered &&
    `
    background-color: rgba(255, 0, 0, 0.1) !important;
    &:hover {
      background-color: rgba(255, 0, 0, 0.2) !important;
    }
  `}
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
`;

const StyledButton = styled(Button)`
  background-color: ${(props) => props.theme.colors.accent};
  border: none;
  color: #fff;

  &:hover {
    background-color: ${(props) => props.theme.colors.accentHover};
  }
`;

const StyledTabs = styled(Tabs)`
  margin-bottom: 20px;
`;

const TableRowComponent = ({ item, rocratePath, jsonLdData }) => {
  const hasSchema =
    jsonLdData &&
    jsonLdData["@graph"].find(
      (entry) =>
        entry["@id"] === item.guid &&
        entry.schema &&
        entry["@type"].includes("Dataset")
    );

  const handleValidate = async (datasetId, schemaId) => {
    try {
      const dataset = jsonLdData["@graph"].find(
        (entry) => entry["@id"] === datasetId
      );

      if (!dataset || !dataset.contentUrl) {
        throw new Error("Dataset or contentUrl not found");
      }

      const filePath = dataset.contentUrl.replace("file:///", "");

      const errors = await ipcRenderer.invoke("validate-dataset", {
        rocratePath,
        datasetId,
        schemaId,
        filePath,
      });

      return errors;
    } catch (error) {
      console.error("Validation error:", error);
      throw new Error(`Validation failed: ${error.message}`);
    }
  };

  return (
    <TableRow unregistered={!item.isRegistered}>
      <td>{item.name}</td>
      <td>{item.isRegistered ? "Registered" : "Unregistered"}</td>
      <td>{item.type}</td>
      <td>{item.guid}</td>
      <td>
        {hasSchema && (
          <DatasetValidator
            datasetId={item.guid}
            schemaId={item.schema}
            fileName={item.name}
            onValidate={handleValidate}
          />
        )}
      </td>
    </TableRow>
  );
};

function Review({ rocratePath, onContinue, setRocratePath, onInitRequired }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [showInitModal, setShowInitModal] = useState(false);
  const [jsonLdData, setJsonLdData] = useState(null);
  const [activeTab, setActiveTab] = useState("table");

  useEffect(() => {
    if (rocratePath) {
      loadItems(rocratePath);
    }
  }, [rocratePath]);

  const loadItems = async (dirPath) => {
    try {
      const fileList = await fs.promises.readdir(dirPath);
      const metadataExists = fileList.includes("ro-crate-metadata.json");

      if (!metadataExists) {
        setShowInitModal(true);
        return;
      }

      const metadataPath = path.join(dirPath, "ro-crate-metadata.json");
      const metadata = JSON.parse(
        await fs.promises.readFile(metadataPath, "utf8")
      );

      setJsonLdData(metadata);

      const graphItems = metadata["@graph"].reduce((acc, item) => {
        if (item.contentUrl) {
          const fileName = item.contentUrl.replace("file:///", "");
          acc[fileName] = item;
        } else if (item["@type"].includes("Computation")) {
          acc[item["@id"]] = item;
        } else if (item["@type"].includes("Schema")) {
          acc[item["@id"]] = item;
        }
        return acc;
      }, {});

      const itemDetails = await Promise.all(
        fileList
          .filter((file) => !file.startsWith("."))
          .map(async (file) => {
            const fullPath = path.join(dirPath, file);
            const stats = await fs.promises.stat(fullPath);
            const graphItem = graphItems[file];

            let type = stats.isDirectory() ? "Directory" : "File";
            let isRegistered = false;
            let name = file;
            let guid = "";
            let schema = "";

            if (file === "ro-crate-metadata.json") {
              type = "Metadata";
              isRegistered = true;
              name = "RO-Crate Metadata";
            } else if (graphItem) {
              type = graphItem["@type"].split("#")[1] || graphItem["@type"];
              isRegistered = true;
              name = graphItem.name || file;
              guid = graphItem["@id"] || "";
              schema = graphItem["schema"] || "";
            }

            return {
              name,
              isRegistered,
              type,
              guid,
              schema,
            };
          })
      );

      const computationItems = Object.values(graphItems)
        .filter((item) => item["@type"].includes("Computation"))
        .map((item) => ({
          name: item.name || "",
          isRegistered: true,
          type: "Computation",
          guid: item["@id"] || "",
        }));

      setItems([...itemDetails, ...computationItems]);
      setError(null);
    } catch (error) {
      console.error("Error reading directory or metadata:", error);
      setError(
        "Error reading directory or metadata. Please make sure the path is correct and accessible."
      );
    }
  };

  const handleSelectOrChangeCrate = async () => {
    try {
      const result = await ipcRenderer.invoke("open-directory-dialog");
      if (result.filePaths && result.filePaths.length > 0) {
        setRocratePath(result.filePaths[0]);
      }
    } catch (error) {
      console.error("Failed to open directory dialog:", error);
      setError("Failed to open directory dialog. Please try again.");
    }
  };

  const handleInitialize = () => {
    setShowInitModal(false);
    onInitRequired(rocratePath);
  };

  const renderTableContent = () => (
    <StyledTable striped bordered hover>
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Type</th>
          <th>GUID</th>
          <th>Validation</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <TableRowComponent
            key={index}
            item={item}
            rocratePath={rocratePath}
            jsonLdData={jsonLdData}
          />
        ))}
      </tbody>
    </StyledTable>
  );

  const renderJsonLdContent = () => <JsonLdPreview jsonLdData={jsonLdData} />;

  const renderContent = () => {
    if (!rocratePath) {
      return (
        <>
          <p>Please select an RO-Crate directory to review.</p>
          <StyledButton onClick={handleSelectOrChangeCrate}>
            Select RO-Crate
          </StyledButton>
        </>
      );
    }

    if (error) {
      return (
        <>
          <p>{error}</p>
          <StyledButton onClick={handleSelectOrChangeCrate}>
            Select Different RO-Crate
          </StyledButton>
        </>
      );
    }

    if (items.length === 0) {
      return (
        <>
          <p>No items found in the selected RO-Crate directory.</p>
          <StyledButton onClick={handleSelectOrChangeCrate}>
            Select Different RO-Crate
          </StyledButton>
        </>
      );
    }

    return activeTab === "table" ? renderTableContent() : renderJsonLdContent();
  };

  return (
    <StyledContainer>
      <StyledTitle>Preview RO-Crate Contents</StyledTitle>
      <ContentWrapper>
        {rocratePath && items.length > 0 && (
          <StyledTabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            <Tab eventKey="table" title="Table View" />
            <Tab eventKey="json-ld" title="JSON-LD View" />
          </StyledTabs>
        )}
        <ScrollableContent>{renderContent()}</ScrollableContent>
        {rocratePath && items.length > 0 && (
          <ButtonContainer>
            <StyledButton onClick={onContinue}>
              Continue to Package
            </StyledButton>
            <StyledButton
              onClick={handleSelectOrChangeCrate}
              variant="secondary"
            >
              Change RO-Crate
            </StyledButton>
          </ButtonContainer>
        )}
      </ContentWrapper>
      <InitModal
        show={showInitModal}
        onHide={() => setShowInitModal(false)}
        onInit={handleInitialize}
      />
    </StyledContainer>
  );
}

export default Review;
