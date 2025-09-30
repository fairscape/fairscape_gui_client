import React, { useState, useEffect } from "react";
import { Row, Col, Modal, Form } from "react-bootstrap";
import { rocrate_create } from "@fairscape/utils";
import { ipcRenderer } from "electron";
import fs from "fs/promises";
import styled from "styled-components";
import {
  InitStyledForm,
  FormTitle,
  StyledButton,
  BrowseButton,
  PreviewContainer,
  PreviewTitle,
  StyledModal,
  ModalButton,
  FormField,
  TextAreaField,
  JsonLdPreview,
  RadioGroupField,
} from "./StyledComponents";
import ManifestUpload from "./ManifestUpload";

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin: 20px 0;
  padding: 15px;
  background-color: ${(props) => props.theme.colors.inputBackground};
  border-radius: 8px;
`;

const CheckboxLabel = styled.label`
  color: ${(props) => props.theme.colors.text};
  margin-left: 10px;
  cursor: pointer;
  user-select: none;
`;

const CheckboxInput = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
`;

const LICENSE_OPTIONS = [
  {
    label: "CC BY 4.0",
    value: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    label: "CC BY-SA 4.0",
    value: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    label: "CC BY-NC 4.0",
    value: "https://creativecommons.org/licenses/by-nc/4.0/",
  },
  {
    label: "CC BY-NC-SA 4.0",
    value: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  },
  {
    label: "CC BY-ND 4.0",
    value: "https://creativecommons.org/licenses/by-nd/4.0/",
  },
  {
    label: "CC BY-NC-ND 4.0",
    value: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
  },
  {
    label: "CC0 1.0",
    value: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  {
    label: "MIT License",
    value: "https://opensource.org/licenses/MIT",
  },
  {
    label: "Apache License 2.0",
    value: "https://opensource.org/licenses/Apache-2.0",
  },
];

const organizations = [
  { name: "UVA", guid: "ark:59852/organization-uva" },
  { name: "UCSD", guid: "ark:59852/organization-ucsd" },
  { name: "Stanford", guid: "ark:59852/organization-stanford" },
  { name: "USF", guid: "ark:59852/organization-usf" },
  { name: "UCSF", guid: "ark:59852/organization-ucsf" },
  { name: "Yale", guid: "ark:59852/organization-yale" },
  { name: "SFU", guid: "ark:59852/organization-sfu" },
  { name: "Texas", guid: "ark:59852/organization-texas" },
  { name: "UA", guid: "ark:59852/organization-ua" },
  {
    name: "Université de Montréal",
    guid: "ark:59852/organization-universite-de-montreal",
  },
];

const projects = [
  { name: "CM4AI", guid: "ark:59852/project-cm4ai" },
  { name: "CHORUS", guid: "ark:59852/project-chorus" },
  { name: "PreMo", guid: "ark:59852/project-premo" },
  { name: "Voice", guid: "ark:59852/project-voice" },
  { name: "AI-READI", guid: "ark:59852/project-ai-readi" },
];

function InitForm({ rocratePath, setRocratePath, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    organization_name: "",
    project_name: "",
    description: "",
    keywords: "",
    packageType: "pipeline",
    author: "",
    license: LICENSE_OPTIONS[0].value,
    autoComplete: true,
  });

  const [jsonLdPreview, setJsonLdPreview] = useState({});
  const [showOverwriteConfirmation, setShowOverwriteConfirmation] =
    useState(false);

  const [manifestFile, setManifestFile] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    updateJsonLdPreview();
  }, [formData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.checked });
  };

  const generateGuid = (name) => {
    const NAAN = "59852";
    const sq = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "")
      .slice(0, 14);
    return `ark:${NAAN}/rocrate-${name
      .toLowerCase()
      .replace(/\s+/g, "-")}-${sq}/`;
  };

  const updateJsonLdPreview = () => {
    const guid = generateGuid(formData.name || "unnamed");

    const node = {
      "@id": guid,
      "@type": "https://w3id.org/EVI#ROCrate",
      name: formData.name,
      isPartOf: [],
      keywords: (formData.keywords || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      description: formData.description,
      author: formData.author,
      packageType: formData.packageType,
      license: formData.license,
      autoComplete: formData.autoComplete,
    };

    if (formData.organization_name) {
      const organization = organizations.find(
        (org) => org.name === formData.organization_name
      );
      if (organization) {
        node.isPartOf.push({
          "@id": organization.guid,
          "@type": "Organization",
          name: organization.name,
        });
      }
    }

    if (formData.project_name) {
      const project = projects.find(
        (proj) => proj.name === formData.project_name
      );
      if (project) {
        node.isPartOf.push({
          "@id": project.guid,
          "@type": "Project",
          name: project.name,
        });
      }
    }

    const preview = {
      "@context": {
        "@vocab": "https://schema.org/",
        EVI: "https://w3id.org/EVI#",
      },
      "@graph": [node],
    };

    setJsonLdPreview(preview);
  };

  const checkForExistingMetadata = async () => {
    try {
      const fileList = await fs.readdir(rocratePath);
      return fileList.includes("ro-crate-metadata.json");
    } catch (error) {
      console.error("Failed to check for existing metadata:", error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const metadataExists = await checkForExistingMetadata();

    if (metadataExists) {
      setShowOverwriteConfirmation(true);
    } else {
      createROCrate();
    }
  };

  const createROCrate = () => {
    const guid = generateGuid(formData.name);
    try {
      const organization = organizations.find(
        (org) => org.name === formData.organization_name
      );
      const project = projects.find(
        (proj) => proj.name === formData.project_name
      );

      const result = rocrate_create(
        rocratePath,
        formData.name,
        formData.description,
        formData.keywords,
        formData.author,
        formData.license,
        "1.0.0",
        guid,
        organization?.guid || null,
        project?.guid || null,
        null,
        {
          packageType: formData.packageType,
          autoComplete: formData.autoComplete,
        }
      );
      console.log(result);
      onSuccess();
    } catch (error) {
      console.error("Failed to create RO-Crate:", error);
    }
  };

  const handleOverwriteConfirm = () => {
    setShowOverwriteConfirmation(false);
    createROCrate();
  };

  const handleOverwriteCancel = () => {
    setShowOverwriteConfirmation(false);
    onSuccess();
  };

  const handleBrowse = async () => {
    try {
      const result = await ipcRenderer.invoke("open-directory-dialog");
      if (result.filePaths && result.filePaths.length > 0) {
        setRocratePath(result.filePaths[0]);
      }
    } catch (error) {
      console.error("Failed to open directory dialog:", error);
    }
  };

  return (
    <>
      <InitStyledForm onSubmit={handleSubmit}>
        <FormTitle>Initialize an RO-Crate</FormTitle>
        <Row>
          <Col md={6}>
            <FormField
              label="RO-Crate Path"
              name="rocratePath"
              value={rocratePath}
              onChange={(e) => setRocratePath(e.target.value)}
              required
            />
            <BrowseButton variant="secondary" onClick={handleBrowse}>
              Browse
            </BrowseButton>
            <FormField
              label="RO-Crate Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <FormField
              label="Organization Name"
              name="organization_name"
              value={formData.organization_name}
              onChange={handleChange}
              required
              as="select"
            >
              <option value="">Select an organization</option>
              {organizations.map((org) => (
                <option key={org.guid} value={org.name}>
                  {org.name}
                </option>
              ))}
            </FormField>
            <FormField
              label="Project Name"
              name="project_name"
              value={formData.project_name}
              onChange={handleChange}
              required
              as="select"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.guid} value={project.name}>
                  {project.name}
                </option>
              ))}
            </FormField>
            <TextAreaField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
            />
            <FormField
              label="Author"
              name="author"
              value={formData.author}
              onChange={handleChange}
              required
              placeholder="1st Author First Last, 2nd Author First Last, ..."
            />
            <FormField
              label="License"
              name="license"
              value={formData.license}
              onChange={handleChange}
              required
              as="select"
            >
              {LICENSE_OPTIONS.map((license) => (
                <option key={license.value} value={license.value}>
                  {license.label}
                </option>
              ))}
            </FormField>
            <FormField
              label="Keywords"
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              placeholder="Enter keywords separated by commas"
              required
            />
            <CheckboxContainer>
              <CheckboxInput
                type="checkbox"
                id="autoComplete"
                name="autoComplete"
                checked={formData.autoComplete}
                onChange={handleCheckboxChange}
              />
              <CheckboxLabel htmlFor="autoComplete">
                Autocomplete Dataset/Software Metadata
              </CheckboxLabel>
            </CheckboxContainer>
            {rocratePath && (
              <ManifestUpload
                rocratePath={rocratePath}
                onFileSelect={setManifestFile}
                onDownloadStart={() => setIsDownloading(true)}
                onDownloadComplete={() => setIsDownloading(false)}
              />
            )}
            <ButtonContainer>
              <StyledButton type="submit" disabled={isDownloading}>
                {isDownloading ? "Downloading files..." : "Initialize RO-Crate"}
              </StyledButton>
            </ButtonContainer>
          </Col>
          <Col md={6}>
            <PreviewContainer>
              <JsonLdPreview jsonLdData={jsonLdPreview} />
            </PreviewContainer>
          </Col>
        </Row>
      </InitStyledForm>

      <StyledModal
        show={showOverwriteConfirmation}
        onHide={() => setShowOverwriteConfirmation(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Existing RO-Crate Metadata Found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          An ro-crate-metadata.json file already exists in the selected
          directory. Do you want to overwrite it or continue to the registration
          page?
        </Modal.Body>
        <Modal.Footer>
          <ModalButton variant="secondary" onClick={handleOverwriteCancel}>
            Continue to Register
          </ModalButton>
          <ModalButton variant="primary" onClick={handleOverwriteConfirm}>
            Overwrite
          </ModalButton>
        </Modal.Footer>
      </StyledModal>
    </>
  );
}

export default InitForm;
