import React, { useState, useEffect } from "react";
import FileListView from "./FileListView";
import DatasetForm from "./DatasetForm";
import SoftwareForm from "./SoftwareForm";
import AutoRegistrationLoader from "./AutoRegistrationLoader";
import InitModal from "../InitModal";
import { loadRoCrateFiles, determineFileType } from "./Utils/fileUtils";
import {
  autoRegisterFile,
  extractFileMetadata,
} from "./Utils/autoRegisterUtils";
import { ipcRenderer } from "electron";
import styled from "styled-components";

// === Styles ===
const BrowseContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 20px;
`;

const BrowseTitle = styled.h2`
  font-size: 20px;
  color: ${(props) => props.theme.colors.text};
`;

const BrowseButton = styled.button`
  background-color: ${(props) => props.theme.colors.accent};
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 12px 28px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.25s ease;

  &:hover {
    background-color: ${(props) => props.theme.colors.accentHover};
  }
`;
// === End Styles ===

function FileSelectorOrchestrator({
  rocratePath,
  setRocratePath,
  onDoneRegistering,
  onSkipComputations,
  onFileRegister,
  onInitRequired,
}) {
  const [state, setState] = useState({
    view: "loading",
    files: [],
    roCrateMetadata: null,
    autoCompleteEnabled: false,
    packageType: null,
    currentFile: null,
    currentFileType: null,
    editMode: false,
    existingMetadata: null,
    autoRegProgress: { current: 0, total: 0 },
    error: null,
    showInitModal: false,
  });

  useEffect(() => {
    if (rocratePath) {
      initializeFileSelector();
    } else {
      setState((prev) => ({ ...prev, view: "browse" }));
    }
  }, [rocratePath]);

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

  const initializeFileSelector = async () => {
    setState((prev) => ({ ...prev, view: "loading" }));

    try {
      const result = await loadRoCrateFiles(rocratePath);

      if (result.needsInit) {
        setState((prev) => ({ ...prev, showInitModal: true, view: "list" }));
        return;
      }

      const filesWithStatus = result.files.map((file) => ({
        ...file,
        type: file.type || determineFileType(file.path),
      }));

      setState((prev) => ({
        ...prev,
        files: filesWithStatus,
        roCrateMetadata: result.metadata,
        autoCompleteEnabled: result.autoComplete || false,
        packageType: result.packageType,
        view: "list",
      }));

      if (result.autoComplete) {
        await performAutoRegistration(filesWithStatus, result.metadata);
      }
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message, view: "error" }));
    }
  };

  const handleInitialize = () => {
    setState((prev) => ({ ...prev, showInitModal: false }));
    onInitRequired(rocratePath);
  };

  const performAutoRegistration = async (files, metadata) => {
    const unregisteredFiles = files.filter((f) => f.status === "unregistered");
    if (unregisteredFiles.length === 0) return;

    setState((prev) => ({
      ...prev,
      view: "autoRegistering",
      autoRegProgress: { current: 0, total: unregisteredFiles.length },
    }));

    const updatedFiles = [...files];
    for (let i = 0; i < unregisteredFiles.length; i++) {
      const file = unregisteredFiles[i];
      try {
        const autoMetadata = await autoRegisterFile(
          rocratePath,
          file.path,
          file.type,
          metadata
        );
        const fileIndex = updatedFiles.findIndex((f) => f.path === file.path);
        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          status: "auto-registered",
          metadata: autoMetadata,
        };
        setState((prev) => ({
          ...prev,
          files: updatedFiles,
          autoRegProgress: { current: i + 1, total: unregisteredFiles.length },
        }));
      } catch (error) {
        console.error(`Failed to auto-register ${file.path}:`, error);
      }
    }
    setState((prev) => ({ ...prev, view: "list" }));
  };

  const handleFileSelect = (file) => {
    if (file.status === "unregistered" && !state.autoCompleteEnabled) {
      if (state.packageType === "dataset") {
        setState((prev) => ({
          ...prev,
          currentFile: file.path,
          currentFileType: "dataset",
          view: "form",
        }));
      } else {
        setState((prev) => ({
          ...prev,
          currentFile: file.path,
          currentFileType: null,
          view: "typeSelection",
        }));
      }
    }
  };

  const handleEditFile = async (file) => {
    try {
      const metadata = await extractFileMetadata(rocratePath, file.path);
      setState((prev) => ({
        ...prev,
        currentFile: file.path,
        currentFileType: file.type,
        existingMetadata: metadata,
        editMode: true,
        view: "form",
      }));
    } catch (error) {
      console.error("Failed to load file metadata:", error);
    }
  };

  const handleFormSubmit = async (isEdit) => {
    const updatedFiles = state.files.map((f) =>
      f.path === state.currentFile
        ? { ...f, status: isEdit ? f.status : "manually-registered" }
        : f
    );
    setState((prev) => ({
      ...prev,
      files: updatedFiles,
      view: "list",
      currentFile: null,
      currentFileType: null,
      editMode: false,
      existingMetadata: null,
    }));
    onFileRegister();
  };

  const handleFormBack = () => {
    setState((prev) => ({
      ...prev,
      view: "list",
      currentFile: null,
      currentFileType: null,
      editMode: false,
      existingMetadata: null,
    }));
  };

  const handleDoneRegistering = () => {
    if (state.packageType === "dataset") {
      onSkipComputations();
    } else {
      onDoneRegistering();
    }
  };

  const handleChangeCrate = async () => {
    try {
      const result = await ipcRenderer.invoke("open-directory-dialog");
      if (result.filePaths && result.filePaths.length > 0) {
        setRocratePath(result.filePaths[0]);
        setState({
          view: "loading",
          files: [],
          roCrateMetadata: null,
          autoCompleteEnabled: false,
          packageType: null,
          currentFile: null,
          currentFileType: null,
          editMode: false,
          existingMetadata: null,
          autoRegProgress: { current: 0, total: 0 },
          error: null,
          showInitModal: false,
        });
      }
    } catch (error) {
      console.error("Failed to open directory dialog:", error);
    }
  };

  const renderView = () => {
    switch (state.view) {
      case "browse":
        return (
          <BrowseContainer>
            <BrowseTitle>Please select an RO-Crate directory:</BrowseTitle>
            <BrowseButton onClick={handleBrowse}>Browse</BrowseButton>
          </BrowseContainer>
        );
      case "loading":
        return <div>Loading RO-Crate...</div>;
      case "autoRegistering":
        return (
          <AutoRegistrationLoader
            current={state.autoRegProgress.current}
            total={state.autoRegProgress.total}
          />
        );
      case "list":
        return (
          <>
            <FileListView
              files={state.files}
              onFileSelect={handleFileSelect}
              onEditFile={handleEditFile}
              onDoneRegistering={handleDoneRegistering}
              onChangeCrate={handleChangeCrate}
            />
            <InitModal
              show={state.showInitModal}
              onHide={() =>
                setState((prev) => ({ ...prev, showInitModal: false }))
              }
              onInit={handleInitialize}
            />
          </>
        );
      case "typeSelection":
        return (
          <div>
            <h3>Is {state.currentFile} a dataset or software?</h3>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  currentFileType: "dataset",
                  view: "form",
                }))
              }
            >
              Dataset
            </button>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  currentFileType: "software",
                  view: "form",
                }))
              }
            >
              Software
            </button>
          </div>
        );
      case "form":
        const FormComponent =
          state.currentFileType === "dataset" ? DatasetForm : SoftwareForm;
        return (
          <FormComponent
            file={state.currentFile}
            rocratePath={rocratePath}
            onBack={handleFormBack}
            onSuccess={() => handleFormSubmit(state.editMode)}
            mode={state.editMode ? "edit" : "create"}
            existingMetadata={state.existingMetadata}
          />
        );
      case "error":
        return <div>Error: {state.error}</div>;
      default:
        return null;
    }
  };

  return <div>{renderView()}</div>;
}

export default FileSelectorOrchestrator;
