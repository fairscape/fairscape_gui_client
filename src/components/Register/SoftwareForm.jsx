import React, { useState, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import { register_software } from "@fairscape/utils";
import { updateFileMetadata } from "./Utils/autoRegisterUtils";
import path from "path";
import styled from "styled-components";
import {
  StyledForm,
  FormTitle,
  StyledButton,
  FormField,
  TextAreaField,
  JsonLdPreview,
} from "./SharedComponents";

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

function SoftwareForm({
  file,
  onBack,
  rocratePath,
  onSuccess,
  mode = "create",
  existingMetadata,
}) {
  const [formData, setFormData] = useState({
    name: "",
    author: "",
    version: "",
    description: "",
    keywords: "",
    "file-format": "",
    url: "",
    "date-modified": "",
    "used-by-computation": "",
    "associated-publication": "",
    "additional-documentation": "",
  });

  const [jsonLdPreview, setJsonLdPreview] = useState({});
  const [fileStats, setFileStats] = useState({ md5: "", contentSize: "" });

  useEffect(() => {
    if (mode === "edit" && existingMetadata) {
      setFormData(existingMetadata);

      if (existingMetadata.md5) {
        setFileStats({
          md5: existingMetadata.md5,
          contentSize: existingMetadata.contentSize || "",
        });
      }
    } else {
      const fileName = path
        .basename(file, path.extname(file))
        .replace(/_/g, " ");
      const fileExtension = path.extname(file).slice(1).toUpperCase();

      setFormData((prevState) => ({
        ...prevState,
        name: fileName,
        "file-format": fileExtension,
      }));
    }

    updateJsonLdPreview();
  }, [file, mode, existingMetadata]);

  useEffect(() => {
    updateJsonLdPreview();
  }, [formData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateGuid = (name) => {
    const NAAN = "59852";
    const sq = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "")
      .slice(0, 14);
    return `ark:${NAAN}/software-${name
      .toLowerCase()
      .replace(/\s+/g, "-")}-${sq}`;
  };

  const updateJsonLdPreview = () => {
    const guid = generateGuid(formData.name);
    const preview = {
      "@context": {
        "@vocab": "https://schema.org/",
        EVI: "https://w3id.org/EVI#",
      },
      "@id": guid,
      "@type": "https://w3id.org/EVI#Software",
      name: formData.name,
      author: formData.author,
      dateModified: formData["date-modified"],
      description: formData.description,
      keywords: formData.keywords.split(",").map((k) => k.trim()),
      version: formData.version,
      associatedPublication: formData["associated-publication"] || undefined,
      additionalDocumentation:
        formData["additional-documentation"] || undefined,
      format: formData["file-format"],
      usedByComputation: formData["used-by-computation"]
        ? formData["used-by-computation"].split(",").map((item) => item.trim())
        : undefined,
      url: formData.url || undefined,
    };
    setJsonLdPreview(preview);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === "edit") {
      try {
        await updateFileMetadata(rocratePath, file, formData, "software");
        onSuccess();
      } catch (error) {
        console.error("Error updating software:", error);
      }
    } else {
      const guid = generateGuid(formData.name);
      const fullFilePath = path.join(rocratePath, file);

      const softwareParams = {
        name: formData.name,
        author: formData.author,
        version: formData.version,
        description: formData.description,
        keywords: formData.keywords,
        "file-format": formData["file-format"],
        "@id": guid,
        url: formData.url,
        "date-modified": formData["date-modified"],
        "used-by-computation": formData["used-by-computation"],
        "associated-publication": formData["associated-publication"],
        "additional-documentation": formData["additional-documentation"],
      };

      if (formData.md5) {
        softwareParams.md5 = formData.md5;
      }

      if (formData.contentSize) {
        softwareParams.contentSize = formData.contentSize;
      }

      try {
        const result = register_software(
          rocratePath,
          softwareParams,
          fullFilePath
        );
        console.log(result);
        onSuccess();
      } catch (error) {
        console.error("Error registering software:", error);
      }
    }
  };

  return (
    <StyledForm onSubmit={handleSubmit}>
      <FormTitle>
        {mode === "edit" ? "Edit" : "Register"} Software: {file}
      </FormTitle>
      <Row>
        <Col md={6}>
          <FormField
            label="Name"
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
          />
          <FormField
            label="File Format"
            name="file-format"
            value={formData["file-format"]}
            onChange={handleChange}
            required
          />
          <FormField
            label="URL"
            name="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="http://github/link-to-repo"
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
            {mode === "edit" ? "Update Software" : "Register Software"}
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

export default SoftwareForm;
