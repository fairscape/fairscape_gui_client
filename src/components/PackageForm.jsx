import React, { useState } from "react";
import styled from "styled-components";
import { Form, Button } from "react-bootstrap";
import { ipcRenderer } from "electron";

const StyledForm = styled(Form)`
  background-color: #282828;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
`;

const FormTitle = styled.h3`
  color: #ffffff;
  margin-bottom: 10px;
  text-align: center;
`;

const StyledFormGroup = styled(Form.Group)`
  margin-bottom: 20px;
`;

const StyledLabel = styled(Form.Label)`
  color: #ffffff;
  font-weight: bold;
`;

const StyledInput = styled(Form.Control)`
  background-color: #3e3e3e;
  border: 1px solid #555;
  color: #ffffff;
  &:focus {
    background-color: #3e3e3e;
    color: #ffffff;
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const StyledButton = styled(Button)`
  background-color: #007bff;
  border: none;
  &:hover {
    background-color: #0056b3;
  }
`;

const BrowseButton = styled(Button)`
  margin-top: 10px;
`;

const OutputContainer = styled.div`
  margin-top: 20px;
  padding: 10px;
  background-color: #3e3e3e;
  border-radius: 5px;
  color: #ffffff;
`;

const StatusContainer = styled.div`
  margin-top: 20px;
  background-color: #3e3e3e;
  border-radius: 10px;
  padding: 20px;
  color: #ffffff;
`;

const StatusTitle = styled.h4`
  margin-bottom: 15px;
`;

const ProgressBarContainer = styled.div`
  background-color: #282828;
  border-radius: 25px;
  height: 30px;
  position: relative;
  overflow: hidden;
  margin-bottom: 20px;
`;

const ProgressBar = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: ${(props) =>
    props.failed ? "#dc3545" : "linear-gradient(to right, #007bff, #28a745)"};
  width: ${(props) => props.progress}%;
  transition: width 0.5s ease-in-out, background-color 0.5s ease-in-out;
`;

const StepContainer = styled.div`
  display: flex;
  justify-content: space-between;
`;

const Step = styled.div`
  flex: 1;
  text-align: center;
  font-weight: ${(props) => (props.active ? "bold" : "normal")};
  color: ${(props) => (props.active ? "#ffffff" : "#aaaaaa")};
`;

function PackageForm({ rocratePath, setRocratePath, onComplete }) {
  const [output, setOutput] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const steps = [
    "Idle",
    "Generating Evidence Graphs",
    "Zipping File",
    "Completed",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setCurrentStep(1);
    setOutput("Starting to process RO-Crate...");
    setError(null);

    try {
      // Generate evidence graphs
      setCurrentStep(1);
      // const evidenceGraphResult = await ipcRenderer.invoke(
      //   "generate-evidence-graphs",
      //   rocratePath
      // );
      // if (evidenceGraphResult.success) {
      //   setOutput(
      //     (prevOutput) =>
      //       prevOutput + "\nEvidence graphs generated successfully."
      //   );
      // } else {
      //   throw new Error(evidenceGraphResult.error);
      // }

      // Zip the updated RO-Crate
      setCurrentStep(2);
      const zipResult = await ipcRenderer.invoke("zip-rocrate", rocratePath);
      if (zipResult.success) {
        setOutput(
          (prevOutput) =>
            prevOutput +
            `\nRO-Crate successfully zipped at: ${zipResult.zipPath}`
        );
        setCurrentStep(3);
        onComplete(zipResult.zipPath);
      } else {
        throw new Error(zipResult.error);
      }
    } catch (error) {
      console.error("Error processing RO-Crate:", error);
      setOutput((prevOutput) => prevOutput + `\nError: ${error.message}`);
      setError(error.message);
      setCurrentStep(3);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBrowse = async () => {
    try {
      const result = await ipcRenderer.invoke("open-directory-dialog");
      if (result.filePaths && result.filePaths.length > 0) {
        setRocratePath(result.filePaths[0]);
      }
    } catch (error) {
      console.error("Failed to open directory dialog:", error);
      setOutput("Error: Failed to open directory dialog");
    }
  };

  const getProgressPercentage = () => {
    return (currentStep / (steps.length - 1)) * 100;
  };

  return (
    <StyledForm onSubmit={handleSubmit}>
      <FormTitle>Package RO-Crate</FormTitle>
      <StyledFormGroup className="mb-3">
        <StyledLabel>RO-Crate Path</StyledLabel>
        <StyledInput
          type="text"
          value={rocratePath}
          onChange={(e) => setRocratePath(e.target.value)}
          required
        />
        <BrowseButton variant="secondary" onClick={handleBrowse}>
          Browse
        </BrowseButton>
      </StyledFormGroup>
      <StyledButton type="submit" disabled={isProcessing}>
        {isProcessing ? "Processing..." : "Process and Package RO-Crate"}
      </StyledButton>

      <StatusContainer>
        <StatusTitle>Packaging Progress</StatusTitle>
        <ProgressBarContainer>
          <ProgressBar progress={getProgressPercentage()} failed={!!error} />
        </ProgressBarContainer>
        <StepContainer>
          {steps.map((step, index) => (
            <Step key={index} active={index === currentStep}>
              {step}
            </Step>
          ))}
        </StepContainer>
      </StatusContainer>

      {output && <OutputContainer>{output}</OutputContainer>}
    </StyledForm>
  );
}

export default PackageForm;
