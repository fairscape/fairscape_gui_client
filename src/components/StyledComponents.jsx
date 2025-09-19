import styled from "styled-components";
import React from "react";
import { Form, Button, Col, Container, Row, Modal } from "react-bootstrap";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text};
`;

const Sidebar = styled.div`
  width: 200px;
  background-color: ${(props) => props.theme.colors.sidebar};
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  border-right: ${(props) =>
    props.theme.name === "light"
      ? `1px solid ${props.theme.colors.border}`
      : "none"};
`;

const SidebarContent = styled.div`
  flex-grow: 1;
  overflow-y: auto;
`;

const SidebarFooter = styled.div`
  margin-top: auto;
`;

const SidebarItem = styled.div`
  padding: 10px;
  margin-bottom: 5px;
  cursor: pointer;
  border-radius: 4px;
  color: ${(props) => props.theme.colors.text};
  &:hover {
    background-color: ${(props) => props.theme.colors.card};
  }
  ${(props) =>
    props.active &&
    `
    background-color: ${props.theme.colors.accent};
    color: white;
    &:hover {
      background-color: ${props.theme.colors.accentHover};
    }
  `}
`;

const SidebarSubItem = styled.div`
  padding: 10px 20px 10px 40px;
  cursor: pointer;
  background-color: ${(props) =>
    props.active ? props.theme.colors.accent : "transparent"};
  color: ${(props) => (props.active ? "#ffffff" : props.theme.colors.text)};
  &:hover {
    background-color: ${(props) =>
      props.active ? props.theme.colors.accentHover : props.theme.colors.hover};
    color: ${(props) => (props.active ? "#ffffff" : props.theme.colors.text)};
  }
`;

const MainContent = styled.div`
  flex-grow: 1;
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-left: 200px;
  background-color: ${(props) => props.theme.colors.background};
`;

const StyledForm = styled(Form)`
  background-color: ${(props) => props.theme.colors.card};
  border: ${(props) =>
    props.theme.name === "light"
      ? `1px solid ${props.theme.colors.border}`
      : "none"};
  padding: 20px;
  border-radius: 8px;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
`;

const InitStyledForm = styled(Form)`
  background-color: ${(props) => props.theme.colors.card};
  border: ${(props) =>
    props.theme.name === "light"
      ? `1px solid ${props.theme.colors.border}`
      : "none"};
  padding: 15px;
  border-radius: 10px;
  box-shadow: ${(props) =>
    props.theme.name === "light"
      ? "0 0 10px rgba(0, 0, 0, 0.1)"
      : "0 0 10px rgba(0, 0, 0, 0.3)"};
`;

const StyledFormGroup = styled(Form.Group)`
  margin-bottom: 15px;
`;

const StyledFormControl = styled(Form.Control)`
  background-color: ${(props) => props.theme.colors.input};
  border: 1px solid ${(props) => props.theme.colors.borderLight};
  color: ${(props) => props.theme.colors.text};
  &:focus {
    background-color: ${(props) => props.theme.colors.input};
    color: ${(props) => props.theme.colors.text};
    box-shadow: 0 0 0 0.2rem ${(props) => props.theme.colors.accent}40;
  }
`;

const StyledButton = styled(Button)`
  background-color: ${(props) => props.theme.colors.accent};
  border: none;
  color: white;
  &:hover,
  &:focus,
  &:active {
    background-color: ${(props) => props.theme.colors.accentHover};
    color: white;
  }
`;

const OutputBox = styled.pre`
  background-color: ${(props) => props.theme.colors.card};
  color: ${(props) => props.theme.colors.accent};
  padding: 15px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
  flex-grow: 1;
  overflow-y: auto;
  margin-top: 20px;
  border: ${(props) =>
    props.theme.name === "light"
      ? `1px solid ${props.theme.colors.border}`
      : "none"};
`;

const SmallerCol = styled(Col)`
  flex: 0 0 20%;
  max-width: 20%;
`;

const LargerCol = styled(Col)`
  flex: 0 0 60%;
  max-width: 60%;
`;

export const StyledContainer = styled(Container)`
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

export const ScrollableRow = styled(Row)`
  flex: 1;
  overflow: hidden;
`;

export const SidebarCol = styled(Col)`
  padding-right: 15px;
  border-right: 1px solid ${(props) => props.theme.colors.border};
  height: 100%;
  overflow-y: auto;
`;

export const ContentCol = styled(Col)`
  padding-left: 15px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export const StyledOutputBox = styled.div`
  margin-top: 20px;
  flex: 1;
  overflow-y: auto;
`;

const MainContentWrapper = styled.div`
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  margin-left: 200px;
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text};
`;

const FormTitle = styled.h3`
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 10px;
  text-align: center;
`;

const StyledLabel = styled(Form.Label)`
  color: ${(props) => props.theme.colors.text};
  font-weight: bold;
`;

const StyledInput = styled(Form.Control)`
  background-color: ${(props) => props.theme.colors.input};
  border: 1px solid ${(props) => props.theme.colors.borderLight};
  color: ${(props) => props.theme.colors.text};
  &:focus {
    background-color: ${(props) => props.theme.colors.input};
    color: ${(props) => props.theme.colors.text};
    border-color: ${(props) => props.theme.colors.accent};
    box-shadow: 0 0 0 0.2rem ${(props) => props.theme.colors.accent}40;
  }
`;

const StyledTextArea = styled(StyledInput)`
  resize: vertical;
  min-height: 100px;
  width: 100%;
  padding: 10px;
`;

const StyledSelect = styled(Form.Select)`
  background-color: ${(props) => props.theme.colors.input};
  border: 1px solid ${(props) => props.theme.colors.borderLight};
  color: ${(props) => props.theme.colors.text};
  &:focus {
    background-color: ${(props) => props.theme.colors.input};
    color: ${(props) => props.theme.colors.text};
    border-color: ${(props) => props.theme.colors.accent};
    box-shadow: 0 0 0 0.2rem ${(props) => props.theme.colors.accent}40;
  }

  option {
    background-color: ${(props) => props.theme.colors.input};
    color: ${(props) => props.theme.colors.text};
  }
`;

const BrowseButton = styled(Button)`
  margin-top: 10px;
  background-color: ${(props) => props.theme.colors.accent};
  border: none;
  color: white;
  &:hover {
    background-color: ${(props) => props.theme.colors.accentHover};
  }
`;

const PreviewContainer = styled.div`
  background-color: ${(props) =>
    props.theme.name === "dark" ? "#1e1e1e" : props.theme.colors.card};
  border: ${(props) =>
    props.theme.name === "light"
      ? `1px solid ${props.theme.colors.border}`
      : "none"};
  border-radius: 5px;
  height: 100%;
  overflow-y: auto;
  padding: 10px;
`;

const PreviewTitle = styled.h4`
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 15px;
  text-align: center;
`;

const StyledModal = styled(Modal)`
  .modal-content {
    background-color: ${(props) => props.theme.colors.card};
    color: ${(props) => props.theme.colors.text};
    border: ${(props) =>
      props.theme.name === "light"
        ? `1px solid ${props.theme.colors.border}`
        : "none"};
  }

  .modal-header {
    border-bottom: 1px solid ${(props) => props.theme.colors.border};

    .btn-close {
      ${(props) => (props.theme.name === "light" ? "" : "filter: invert(1);")}
    }
  }

  .modal-footer {
    border-top: 1px solid ${(props) => props.theme.colors.border};
  }
`;

const ModalButton = styled(Button)`
  margin-right: 10px;
`;

const RadioGroup = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
`;

const RadioGroupLabel = styled.label`
  color: ${(props) => props.theme.colors.text};
  font-weight: bold;
  margin-bottom: 10px;
`;

const RadioOption = styled.div`
  margin-bottom: 8px;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  color: ${(props) => props.theme.colors.text};
  cursor: pointer;
  user-select: none;
`;

const RadioInput = styled.input`
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid ${(props) => props.theme.colors.accent};
  border-radius: 50%;
  margin-right: 10px;
  outline: none;
  cursor: pointer;
  background-color: ${(props) => props.theme.colors.input};

  &:checked {
    background-color: ${(props) => props.theme.colors.accent};
    border: 2px solid
      ${(props) =>
        props.theme.name === "dark" ? "#ffffff" : props.theme.colors.accent};
    box-shadow: 0 0 0 2px ${(props) => props.theme.colors.accent};
  }

  &:hover {
    border-color: ${(props) => props.theme.colors.accentHover};
  }
`;

const RadioText = styled.span`
  font-size: 14px;
`;

export const FormField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  as = "input",
  children,
}) => (
  <StyledFormGroup>
    <StyledLabel>
      {label}
      {required && " *"}
    </StyledLabel>
    {as === "select" ? (
      <StyledSelect
        name={name}
        value={value}
        onChange={onChange}
        required={required}
      >
        {children}
      </StyledSelect>
    ) : (
      <StyledInput
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
      />
    )}
  </StyledFormGroup>
);

export const TextAreaField = ({
  label,
  name,
  value,
  onChange,
  required = false,
}) => (
  <StyledFormGroup>
    <StyledLabel>
      {label}
      {required && " *"}
    </StyledLabel>
    <StyledTextArea
      as="textarea"
      name={name}
      value={value}
      onChange={onChange}
      required={required}
    />
  </StyledFormGroup>
);

export const JsonLdPreview = ({ jsonLdData }) => (
  <PreviewContainer>
    <PreviewTitle>Preview metadata in JSON-LD</PreviewTitle>
    <SyntaxHighlighter
      language="json"
      style={vs2015}
      customStyle={{
        backgroundColor: "transparent",
        padding: "0",
        margin: "0",
        fontSize: "0.9em",
      }}
    >
      {JSON.stringify(jsonLdData, null, 2)}
    </SyntaxHighlighter>
  </PreviewContainer>
);

export const RadioGroupField = ({ label, name, options, value, onChange }) => (
  <RadioGroup>
    <RadioGroupLabel>{label}</RadioGroupLabel>
    {options.map((option) => (
      <RadioOption key={option.value}>
        <RadioLabel>
          <RadioInput
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={onChange}
          />
          <RadioText>{option.label}</RadioText>
        </RadioLabel>
      </RadioOption>
    ))}
  </RadioGroup>
);

export {
  MainContentWrapper,
  AppContainer,
  Sidebar,
  MainContent,
  SidebarItem,
  SidebarContent,
  SidebarFooter,
  SidebarSubItem,
  StyledForm,
  StyledFormGroup,
  StyledFormControl,
  StyledButton,
  OutputBox,
  SmallerCol,
  LargerCol,
  FormTitle,
  StyledLabel,
  StyledInput,
  StyledTextArea,
  StyledSelect,
  BrowseButton,
  PreviewContainer,
  PreviewTitle,
  StyledModal,
  ModalButton,
  RadioGroup,
  RadioGroupLabel,
  RadioOption,
  RadioLabel,
  RadioInput,
  RadioText,
  InitStyledForm,
};
