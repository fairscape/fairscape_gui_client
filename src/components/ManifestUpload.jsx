import React, { useState, useRef } from "react";
import styled from "styled-components";
import {
  validateManifestCSV,
  downloadManifestFiles,
} from "./Utils/manifestUtils";

const ManifestContainer = styled.div`
  margin: 20px 0;
  padding: 15px;
  border: 2px dashed ${(props) => props.theme.colors.borderLight};
  border-radius: 8px;
  background-color: ${(props) => props.theme.colors.inputBackground}20;
  position: relative;
`;

const ManifestHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`;

const OptionalBadge = styled.span`
  background-color: ${(props) => props.theme.colors.accent}30;
  color: ${(props) => props.theme.colors.accent};
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
`;

const InfoIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: ${(props) => props.theme.colors.accent};
  color: white;
  font-size: 12px;
  cursor: help;
  position: relative;

  &:hover .tooltip {
    opacity: 1;
    visibility: visible;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 25px;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  padding: 10px;
  background-color: ${(props) => props.theme.colors.card};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 6px;
  font-size: 13px;
  color: ${(props) => props.theme.colors.text};
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  &:before {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${(props) => props.theme.colors.card};
  }
`;

const FileInput = styled.input`
  display: none;
`;

const UploadButton = styled.button`
  padding: 8px 16px;
  background-color: ${(props) => props.theme.colors.accent};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.colors.accentHover};
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
`;

const FileName = styled.span`
  margin-left: 10px;
  color: ${(props) => props.theme.colors.text};
  font-size: 14px;
`;

const ProgressBar = styled.div`
  margin-top: 10px;
  height: 20px;
  background-color: ${(props) => props.theme.colors.inputBackground};
  border-radius: 10px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${(props) =>
    props.completed
      ? props.theme.colors.success
      : `linear-gradient(90deg, ${props.theme.colors.accent} 0%, ${props.theme.colors.success} 100%)`};
  width: ${(props) => props.progress}%;
  transition: width 0.3s ease, background 0.3s ease;
`;

const ProgressText = styled.div`
  text-align: center;
  margin-top: 5px;
  font-size: 12px;
  color: ${(props) =>
    props.completed
      ? props.theme.colors.success
      : props.theme.colors.textSecondary};
  font-weight: ${(props) => (props.completed ? "bold" : "normal")};
`;

const ErrorText = styled.div`
  color: ${(props) => props.theme.colors.error || "#dc3545"};
  font-size: 13px;
  margin-top: 8px;
`;

const SuccessIcon = styled.span`
  color: ${(props) => props.theme.colors.success};
  margin-right: 5px;
`;

function ManifestUpload({
  rocratePath,
  onFileSelect,
  onDownloadStart,
  onDownloadComplete,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setCompleted(false);

    try {
      const validation = await validateManifestCSV(file);
      if (!validation.isValid) {
        setError(validation.error);
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);

      if (rocratePath) {
        setDownloading(true);
        onDownloadStart();

        await downloadManifestFiles(file, rocratePath, (current, total) => {
          setProgress({ current, total });
        });

        setDownloading(false);
        setCompleted(true);
        onDownloadComplete();
      }
    } catch (err) {
      setError(err.message);
      setDownloading(false);
      onDownloadComplete();
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <ManifestContainer>
      <ManifestHeader>
        <span style={{ fontSize: "14px" }}>Manifest File</span>
        <OptionalBadge>OPTIONAL</OptionalBadge>
        <InfoIcon>
          ℹ
          <Tooltip className="tooltip">
            Upload a CSV file containing URLs to automatically download files to
            your RO-Crate directory.
            <br />
            <br />
            <strong>Requirements:</strong>
            <br />• CSV must have a column named "url"
            <br />• Each URL should point to a downloadable file
            <br />• Files will be downloaded to the selected directory
          </Tooltip>
        </InfoIcon>
      </ManifestHeader>

      <FileInput
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
      />

      <UploadButton type="button" onClick={handleButtonClick}>
        📄 {selectedFile ? "Change Manifest" : "Select Manifest CSV"}
      </UploadButton>

      {selectedFile && <FileName>{selectedFile.name}</FileName>}

      {(downloading || completed) && progress.total > 0 && (
        <>
          <ProgressBar>
            <ProgressFill
              progress={(progress.current / progress.total) * 100}
              completed={completed}
            />
          </ProgressBar>
          <ProgressText completed={completed}>
            {completed ? (
              <>
                <SuccessIcon>✓</SuccessIcon>
                Successfully downloaded {progress.current} of {progress.total}{" "}
                files
              </>
            ) : (
              `Downloading file ${progress.current} of ${progress.total}...`
            )}
          </ProgressText>
        </>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </ManifestContainer>
  );
}

export default ManifestUpload;
