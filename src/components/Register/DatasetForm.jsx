import React, { useState, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import { register_dataset } from "@fairscape/utils";
import { updateFileMetadata } from "./Utils/autoRegisterUtils";
import path from "path";
import {
  StyledForm,
  FormTitle,
  StyledButton,
  FormField,
  TextAreaField,
  JsonLdPreview,
} from "./SharedComponents";
import SchemaForm from "./SchemaComponents/SchemaForm";
import SchemaUpload from "./SchemaComponents/SchemaUpload";
import SchemaSelector from "./SchemaComponents/SchemaSelector";
import HDF5SchemaForm from "./SchemaComponents/HDF5SchemaForm";
import SchemaOptions from "./SchemaOptions";
import { generateGuid, createJsonLdPreview } from "./Utils/datasetUtils";
import { processDoiMetadata } from "./Utils/doiMetadataUtils";
import styled from "styled-components";

const ReadOnlyField = styled.div`
  margin-bottom: 15px;
`;

const ReadOnlyLabel = styled.label`
  display: block;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: 5px;
  font-size: 14px;
`;

const ReadOnlyValue = styled.div`
  background-color: ${(props) =>
    props.theme.colors.disabledBackground || "#2a2a2a"};
  color: ${(props) => props.theme.colors.textSecondary};
  padding: 10px;
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.colors.border || "#3e3e3e"};
  font-family: monospace;
`;

const initialFormState = {
  name: "",
  author: "",
  version: "",
  "date-published": "",
  description: "",
  keywords: "",
  "data-format": "",
  url: "",
  "used-by": [],
  "derived-from": [],
  schema: "",
  "associated-publication": "",
  "additional-documentation": "",
};

function DatasetForm({
  file,
  onBack,
  rocratePath,
  onSuccess,
  doiMetadata,
  mode = "create",
  existingMetadata,
}) {
  const [formData, setFormData] = useState(initialFormState);
  const [jsonLdPreview, setJsonLdPreview] = useState({});
  const [showSchemaOptions, setShowSchemaOptions] = useState(false);
  const [showSchemaSelector, setShowSchemaSelector] = useState(false);
  const [showSchemaForm, setShowSchemaForm] = useState(false);
  const [showHDF5SchemaForm, setShowHDF5SchemaForm] = useState(false);
  const [showSchemaUpload, setShowSchemaUpload] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(false);
  const [schemaGuid, setSchemaGuid] = useState(null);
  const [fileStats, setFileStats] = useState({ md5: "", contentSize: "" });

  const calculateFileStats = async (filePath) => {
    try {
      const crypto = require("crypto");
      const fs = require("fs");

      const fileBuffer = await fs.promises.readFile(filePath);
      const md5Hash = crypto.createHash("md5").update(fileBuffer).digest("hex");
      const size = fileBuffer.length;

      return {
        md5: md5Hash,
        contentSize: size.toString(),
      };
    } catch (error) {
      console.error("Error calculating file stats:", error);
      return { md5: "", contentSize: "" };
    }
  };

  useEffect(() => {
    const initializeForm = async () => {
      if (mode === "edit" && existingMetadata) {
        setFormData(existingMetadata);
        setSchemaGuid(existingMetadata.schema);
        setJsonLdPreview(
          createJsonLdPreview(existingMetadata, existingMetadata.schema)
        );

        if (existingMetadata.md5 && existingMetadata.contentSize) {
          setFileStats({
            md5: existingMetadata.md5,
            contentSize: existingMetadata.contentSize,
          });
        } else if (file !== "doi") {
          const fullFilePath = path.join(rocratePath, file);
          const stats = await calculateFileStats(fullFilePath);
          setFileStats(stats);
          setFormData((prev) => ({ ...prev, ...stats }));
        }
      } else if (file === "doi" && doiMetadata) {
        const newData = processDoiMetadata(doiMetadata);
        setFormData(newData);
        setJsonLdPreview(createJsonLdPreview(newData, schemaGuid));
      } else if (file !== "doi") {
        const fileName = path
          .basename(file, path.extname(file))
          .replace(/_/g, " ");
        const fileExtension = path.extname(file).slice(1).toUpperCase();

        const fullFilePath = path.join(rocratePath, file);
        const stats = await calculateFileStats(fullFilePath);

        const newData = {
          ...formData,
          name: fileName,
          "data-format": fileExtension,
          ...stats,
        };

        setFormData(newData);
        setFileStats(stats);
        setJsonLdPreview(createJsonLdPreview(newData, schemaGuid));
      }
    };

    initializeForm();
  }, [file, doiMetadata, mode, existingMetadata]);

  const handleChange = (e) => {
    const newData = { ...formData, [e.target.name]: e.target.value };
    setFormData(newData);
    setJsonLdPreview(createJsonLdPreview(newData, schemaGuid));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPendingRegistration(true);

    if (mode === "edit") {
      try {
        await updateFileMetadata(rocratePath, file, formData, "dataset");
        onSuccess();
      } catch (error) {
        console.error("Error updating dataset:", error);
        setPendingRegistration(false);
      }
    } else {
      setShowSchemaOptions(true);
    }
  };

  const handleSchemaOptionSelect = (action) => {
    setShowSchemaOptions(false);
    if (action === "select") {
      setShowSchemaSelector(true);
    } else if (action === "create") {
      if (file !== "doi") {
        const fileExtension = file.toLowerCase().split(".").pop();
        if (fileExtension === "h5" || fileExtension === "hdf5") {
          setShowHDF5SchemaForm(true);
        } else {
          setShowSchemaForm(true);
        }
      } else {
        setShowSchemaForm(true);
      }
    } else if (action === "upload") {
      setShowSchemaUpload(true);
    } else {
      registerDataset();
    }
  };

  const handleSchemaRegistration = (schemaData) => {
    setSchemaGuid(schemaData);
    registerDataset(schemaData);
  };

  const registerDataset = (schemaGuid = null) => {
    const guid = generateGuid(formData.name);
    const fullFilePath = file === "doi" ? "" : path.join(rocratePath, file);

    const datasetParams = {
      name: formData.name,
      author: formData.author,
      version: formData.version,
      "date-published": formData["date-published"],
      description: formData.description,
      keywords: formData.keywords,
      format: formData["data-format"],
      "@id": guid,
      url: formData.url,
      usedBy: formData["used-by"],
      derivedFrom: formData["derived-from"],
      associatedPublication: formData["associated-publication"],
      additionalDocumentation: formData["additional-documentation"],
    };

    if (schemaGuid) {
      datasetParams["evi:Schema"] = {
        "@id": schemaGuid,
      };
    }

    if (formData.md5) {
      datasetParams.md5 = formData.md5;
    }

    if (formData.contentSize) {
      datasetParams.contentSize = formData.contentSize;
    }

    const result = register_dataset(rocratePath, datasetParams, fullFilePath);

    console.log(result);
    setPendingRegistration(false);
    onSuccess();
  };

  if (showSchemaOptions) {
    return <SchemaOptions onOptionSelect={handleSchemaOptionSelect} />;
  }

  if (showSchemaSelector) {
    return (
      <SchemaSelector
        onSchemaSelect={handleSchemaRegistration}
        onCancel={() => setShowSchemaOptions(true)}
        rocratePath={rocratePath}
      />
    );
  }

  if (showSchemaForm) {
    return (
      <SchemaForm
        datasetName={formData.name}
        onSubmit={handleSchemaRegistration}
        onCancel={() => setShowSchemaOptions(true)}
        rocratePath={rocratePath}
        filePath={file}
      />
    );
  }

  if (showHDF5SchemaForm) {
    return (
      <HDF5SchemaForm
        datasetName={formData.name}
        onSubmit={handleSchemaRegistration}
        onCancel={() => setShowSchemaOptions(true)}
        rocratePath={rocratePath}
        filePath={file}
      />
    );
  }

  if (showSchemaUpload) {
    return (
      <SchemaUpload
        onSchemaSelect={handleSchemaRegistration}
        onCancel={() => setShowSchemaOptions(true)}
        rocratePath={rocratePath}
      />
    );
  }

  return (
    <StyledForm onSubmit={handleSubmit}>
      <FormTitle>
        {mode === "edit" ? "Edit" : "Register"} Dataset: {file}
      </FormTitle>
      <Row>
        <Col md={6}>
          <FormField
            label="Dataset Name"
            name="name"
            value={formData.name}
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
            label="Version"
            name="version"
            value={formData.version}
            onChange={handleChange}
            required
            placeholder="Examples: 1.0.1, 1.0"
          />
          <FormField
            label="Date Published"
            name="date-published"
            value={formData["date-published"]}
            onChange={handleChange}
            type="date"
            required
          />
          <TextAreaField
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
          <FormField
            label="Keywords"
            name="keywords"
            value={formData.keywords}
            onChange={handleChange}
            required
            placeholder="genetics, vital signs, heart rate"
          />
          <FormField
            label="Data Format"
            name="data-format"
            value={formData["data-format"]}
            onChange={handleChange}
            required
          />

          {fileStats.md5 && (
            <>
              <ReadOnlyField>
                <ReadOnlyLabel>MD5 Checksum</ReadOnlyLabel>
                <ReadOnlyValue>{fileStats.md5}</ReadOnlyValue>
              </ReadOnlyField>

              <ReadOnlyField>
                <ReadOnlyLabel>Content Size (bytes)</ReadOnlyLabel>
                <ReadOnlyValue>{fileStats.contentSize}</ReadOnlyValue>
              </ReadOnlyField>
            </>
          )}

          <StyledButton type="submit">
            {pendingRegistration
              ? mode === "edit"
                ? "Updating..."
                : "Registering..."
              : mode === "edit"
              ? "Update Dataset"
              : "Register Dataset"}
          </StyledButton>
          <StyledButton onClick={onBack} variant="secondary">
            Back
          </StyledButton>
        </Col>
        <Col md={6}>
          <JsonLdPreview jsonLdData={jsonLdPreview} />
        </Col>
      </Row>
    </StyledForm>
  );
}

export default DatasetForm;
