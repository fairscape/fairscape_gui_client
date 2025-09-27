import React from "react";
import styled from "styled-components";
import { FaCheck, FaEdit } from "react-icons/fa";

// === Styles ===
const Container = styled.div`
  background-color: ${(props) => props.theme.colors.card};
  color: ${(props) => props.theme.colors.text};
  padding: 30px;
  border-radius: 12px;
  box-shadow: ${(props) =>
    props.theme.name === "light"
      ? "0 2px 12px rgba(0,0,0,0.1)"
      : "0 2px 12px rgba(0,0,0,0.4)"};
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 10px;
  color: ${(props) => props.theme.colors.text};
`;

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 450px;
  overflow-y: auto;
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background-color: ${(props) =>
    props.isRegistered
      ? props.theme.colors.inputBackground
      : props.theme.colors.cardBackground};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 8px;
  cursor: ${(props) => (props.isClickable ? "pointer" : "default")};
  transition: background-color 0.25s ease, transform 0.15s ease;

  &:hover {
    background-color: ${(props) =>
      props.isClickable
        ? props.theme.colors.inputHover
        : props.theme.colors.inputBackground};
    transform: ${(props) => (props.isClickable ? "translateY(-2px)" : "none")};
  }
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`;

const FileName = styled.span`
  font-size: 15px;
  font-weight: 500;
  color: ${(props) => props.theme.colors.text};
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CheckMark = styled(FaCheck)`
  color: ${(props) => props.theme.colors.success};
  font-size: 18px;
`;

const EditButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: ${(props) => props.theme.colors.accent};
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.25s ease;

  &:hover {
    background-color: ${(props) => props.theme.colors.accentHover};
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 25px;
`;

const ActionButton = styled.button`
  background-color: ${(props) =>
    props.variant === "primary"
      ? props.theme.colors.accent
      : props.theme.colors.secondary};
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.25s ease;

  &:hover {
    background-color: ${(props) =>
      props.variant === "primary"
        ? props.theme.colors.accentHover
        : props.theme.colors.secondaryHover};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DoiItem = styled(FileItem)`
  background-color: ${(props) => props.theme.colors.cardBackground};
  border: 2px dashed ${(props) => props.theme.colors.accent};
  justify-content: center;
  font-style: italic;
  cursor: pointer;

  &:hover {
    background-color: ${(props) => props.theme.colors.inputHover};
  }
`;
// === End Styles ===

function FileListView({
  files,
  onFileSelect,
  onEditFile,
  onDoneRegistering,
  onChangeCrate,
  onAddDoi,
}) {
  const handleFileClick = (file) => {
    if (file.status === "unregistered") {
      onFileSelect(file);
    }
  };

  const allFilesRegistered = files.every((f) => f.status !== "unregistered");

  return (
    <Container>
      <Title>Select a file to add metadata:</Title>
      <FileList>
        {files.map((file, index) => (
          <FileItem
            key={index}
            isRegistered={file.status !== "unregistered"}
            isClickable={file.status === "unregistered"}
            onClick={() => handleFileClick(file)}
          >
            <FileInfo>
              <FileName>{file.path}</FileName>
            </FileInfo>
            <StatusIndicator>
              {file.status !== "unregistered" && (
                <>
                  <CheckMark />
                  <EditButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditFile(file);
                    }}
                  >
                    <FaEdit /> Edit
                  </EditButton>
                </>
              )}
            </StatusIndicator>
          </FileItem>
        ))}
        {onAddDoi && (
          <DoiItem onClick={onAddDoi}>
            <FileName>Register a publication or dataset using DOI...</FileName>
          </DoiItem>
        )}
      </FileList>
      <ButtonContainer>
        <ActionButton
          variant="primary"
          onClick={onDoneRegistering}
          disabled={!allFilesRegistered}
        >
          Done Registering
        </ActionButton>
        <ActionButton variant="secondary" onClick={onChangeCrate}>
          Change RO-Crate
        </ActionButton>
      </ButtonContainer>
    </Container>
  );
}

export default FileListView;
