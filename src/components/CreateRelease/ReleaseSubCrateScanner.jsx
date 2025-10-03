import React, { useState } from "react";
import styled from "styled-components";
import { FiPlus, FiTrash2, FiFolder } from "react-icons/fi";
import {
  StyledButton,
  StyledInput,
  StyledLabel,
  StyledFormGroup,
  StyledTextArea,
} from "../StyledComponents";

const Container = styled.div`
  background-color: ${(props) => props.theme.colors.card};
  border-radius: 10px;
  padding: 20px;
  margin: 20px 0;
  border: ${(props) =>
    props.theme.name === "light"
      ? "1px solid " + props.theme.colors.border
      : "none"};
`;

const SectionTitle = styled.h3`
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid ${(props) => props.theme.colors.borderLight};
`;

const SubCrateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
`;

const SubCrateItem = styled.div`
  background-color: ${(props) => props.theme.colors.input};
  border: 1px solid ${(props) => props.theme.colors.borderLight};
  border-radius: 6px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const SubCrateInfo = styled.div`
  flex: 1;
`;

const SubCrateName = styled.div`
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 5px;
`;

const SubCrateId = styled.div`
  font-family: monospace;
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const SubCratePath = styled.div`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
`;

const SubCrateDetail = styled.div`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 5px;
`;

const RemoveButton = styled.button`
  background: transparent;
  border: none;
  color: ${(props) => props.theme.colors.error || "#dc3545"};
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
  }
`;

const AddForm = styled.div`
  background-color: ${(props) => props.theme.colors.input};
  border: 2px dashed ${(props) => props.theme.colors.accent};
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 15px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

function ReleaseSubCrateScanner({
  subCrates,
  onSubCratesChange,
  selectedDirectory,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubCrate, setNewSubCrate] = useState({
    "@id": "",
    name: "",
    description: "",
    keywords: [],
    isPartOf: [],
    version: "",
    hasPart: [],
    author: "",
    path: "",
  });

  const handleRemove = (id) => {
    onSubCratesChange(subCrates.filter((sc) => sc["@id"] !== id));
  };

  const handleAdd = () => {
    if (!newSubCrate["@id"] || !newSubCrate.name) {
      alert("ID and Name are required");
      return;
    }

    const updatedSubCrates = [
      ...subCrates,
      {
        ...newSubCrate,
        "@type": ["Dataset", "https://w3id.org/EVI#ROCrate"],
        keywords: newSubCrate.keywords.length > 0 ? newSubCrate.keywords : [],
        isPartOf: newSubCrate.isPartOf.length > 0 ? newSubCrate.isPartOf : [],
        hasPart: newSubCrate.hasPart.length > 0 ? newSubCrate.hasPart : [],
      },
    ];

    onSubCratesChange(updatedSubCrates);
    setNewSubCrate({
      "@id": "",
      name: "",
      description: "",
      keywords: [],
      isPartOf: [],
      version: "",
      hasPart: [],
      author: "",
      path: "",
    });
    setShowAddForm(false);
  };

  return (
    <Container>
      <SectionTitle>Sub-Crates ({subCrates.length})</SectionTitle>

      {subCrates.length === 0 ? (
        <EmptyState>
          <FiFolder size={48} />
          <p>No sub-crates detected in the selected directory</p>
        </EmptyState>
      ) : (
        <SubCrateList>
          {subCrates.map((subCrate) => (
            <SubCrateItem key={subCrate["@id"]}>
              <SubCrateInfo>
                <SubCrateName>{subCrate.name}</SubCrateName>
                <SubCrateId>{subCrate["@id"]}</SubCrateId>
                {subCrate.path && (
                  <SubCratePath>
                    <FiFolder size={12} />
                    {subCrate.path}
                  </SubCratePath>
                )}
                {subCrate.description && (
                  <SubCrateDetail>{subCrate.description}</SubCrateDetail>
                )}
                {subCrate.version && (
                  <SubCrateDetail>Version: {subCrate.version}</SubCrateDetail>
                )}
                {subCrate.keywords && subCrate.keywords.length > 0 && (
                  <SubCrateDetail>
                    Keywords: {subCrate.keywords.join(", ")}
                  </SubCrateDetail>
                )}
                {subCrate.author && (
                  <SubCrateDetail>
                    Author:{" "}
                    {Array.isArray(subCrate.author)
                      ? subCrate.author.join(", ")
                      : subCrate.author}
                  </SubCrateDetail>
                )}
              </SubCrateInfo>
              <RemoveButton
                onClick={() => handleRemove(subCrate["@id"])}
                title="Remove sub-crate"
              >
                <FiTrash2 />
              </RemoveButton>
            </SubCrateItem>
          ))}
        </SubCrateList>
      )}

      {!showAddForm ? (
        <StyledButton onClick={() => setShowAddForm(true)}>
          <FiPlus /> Add Sub-Crate Manually
        </StyledButton>
      ) : (
        <AddForm>
          <h4 style={{ marginBottom: "20px" }}>Add Sub-Crate</h4>
          <FormRow>
            <StyledFormGroup>
              <StyledLabel>ID *</StyledLabel>
              <StyledInput
                type="text"
                value={newSubCrate["@id"]}
                onChange={(e) =>
                  setNewSubCrate({ ...newSubCrate, "@id": e.target.value })
                }
                placeholder="ark:59852/subcrate-1"
              />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel>Name *</StyledLabel>
              <StyledInput
                type="text"
                value={newSubCrate.name}
                onChange={(e) =>
                  setNewSubCrate({ ...newSubCrate, name: e.target.value })
                }
                placeholder="Sub-crate name"
              />
            </StyledFormGroup>
          </FormRow>
          <FormRow>
            <StyledFormGroup>
              <StyledLabel>Version</StyledLabel>
              <StyledInput
                type="text"
                value={newSubCrate.version}
                onChange={(e) =>
                  setNewSubCrate({ ...newSubCrate, version: e.target.value })
                }
                placeholder="1.0.0"
              />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel>Author</StyledLabel>
              <StyledInput
                type="text"
                value={newSubCrate.author}
                onChange={(e) =>
                  setNewSubCrate({ ...newSubCrate, author: e.target.value })
                }
                placeholder="Author name"
              />
            </StyledFormGroup>
          </FormRow>
          <StyledFormGroup>
            <StyledLabel>Description</StyledLabel>
            <StyledTextArea
              value={newSubCrate.description}
              onChange={(e) =>
                setNewSubCrate({ ...newSubCrate, description: e.target.value })
              }
              placeholder="Description of the sub-crate"
              rows={3}
            />
          </StyledFormGroup>
          <StyledFormGroup>
            <StyledLabel>Keywords (comma-separated)</StyledLabel>
            <StyledInput
              type="text"
              value={
                Array.isArray(newSubCrate.keywords)
                  ? newSubCrate.keywords.join(", ")
                  : ""
              }
              onChange={(e) =>
                setNewSubCrate({
                  ...newSubCrate,
                  keywords: e.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter((k) => k),
                })
              }
              placeholder="keyword1, keyword2, keyword3"
            />
          </StyledFormGroup>
          <StyledFormGroup>
            <StyledLabel>Path to metadata.json</StyledLabel>
            <StyledInput
              type="text"
              value={newSubCrate.path}
              onChange={(e) =>
                setNewSubCrate({ ...newSubCrate, path: e.target.value })
              }
              placeholder="./subcrate-folder/ro-crate-metadata.json"
            />
          </StyledFormGroup>
          <ButtonGroup>
            <StyledButton onClick={handleAdd}>Add</StyledButton>
            <StyledButton
              variant="secondary"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </StyledButton>
          </ButtonGroup>
        </AddForm>
      )}
    </Container>
  );
}

export default ReleaseSubCrateScanner;
