// SharedComponents.js
import React from "react";
import styled from "styled-components";
import { Form, Button, ListGroup, Card } from "react-bootstrap";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";

export const StyledForm = styled(Form)`
  background-color: ${(props) => props.theme.colors.card};
  padding: 30px;
  border-radius: 10px;
  box-shadow: ${(props) =>
    props.theme.name === "light"
      ? "0 0 10px rgba(0, 0, 0, 0.1)"
      : "0 0 10px rgba(0, 0, 0, 0.3)"};
`;

export const FormTitle = styled.h2`
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 30px;
  text-align: center;
`;

export const StyledFormGroup = styled(Form.Group)`
  margin-bottom: 20px;
`;

export const StyledLabel = styled(Form.Label)`
  color: ${(props) => props.theme.colors.text};
  font-weight: bold;
`;

export const StyledInput = styled(Form.Control)`
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

export const StyledTextArea = styled(StyledInput)`
  resize: vertical;
  min-height: 100px;
  width: 100%;
  padding: 10px;
`;

export const StyledButton = styled(Button)`
  background-color: ${(props) => props.theme.colors.accent};
  border: none;
  color: #fff;
  margin-right: 10px;
  &:hover {
    background-color: ${(props) => props.theme.colors.accentHover};
  }
`;

export const PreviewContainer = styled.div`
  background-color: ${(props) =>
    props.theme.name === "dark" ? "#1e1e1e" : props.theme.colors.card};
  border-radius: 15px;
  height: 100%;
  overflow-y: auto;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

export const PreviewTitle = styled.h3`
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 15px;
  text-align: center;
`;

export const ColumnHeader = styled.h4`
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 10px;
`;

export const StyledListGroup = styled(ListGroup)`
  background-color: ${(props) => props.theme.colors.card};
  height: 300px;
  overflow-y: auto;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 4px;
`;

export const StyledListItem = styled(ListGroup.Item)`
  background-color: ${(props) => props.theme.colors.input};
  color: ${(props) => props.theme.colors.text};
  border-color: ${(props) => props.theme.colors.border};
  &:hover {
    background-color: ${(props) => props.theme.colors.inputHover};
  }
`;

export const PropertySection = styled(Card)`
  background-color: ${(props) => props.theme.colors.card};
  border: 1px solid ${(props) => props.theme.colors.border};
  margin-bottom: 20px;
  padding: 20px;
  color: ${(props) => props.theme.colors.text};
`;

export const PropertyList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-top: 20px;
`;

export const PropertyItem = styled.div`
  background-color: ${(props) => props.theme.colors.input};
  border: 1px solid ${(props) => props.theme.colors.borderLight};
  border-radius: 5px;
  padding: 10px;
  margin-bottom: 10px;
  color: ${(props) => props.theme.colors.text};
`;

export const WhiteText = styled.h4`
  color: ${(props) => props.theme.colors.text};
`;

export const SchemaOptionsContainer = styled.div`
  padding: 20px;
  background-color: ${(props) => props.theme.colors.card};
  border-radius: 10px;
`;

export const SchemaOptionCard = styled(Card)`
  margin-bottom: 10px;
  background-color: ${(props) => props.theme.colors.input};
  border: 1px solid ${(props) => props.theme.colors.border};
  color: ${(props) => props.theme.colors.text};
`;

export const SchemaOptionCardBody = styled(Card.Body)`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const SchemaOptionCardTitle = styled(Card.Title)`
  margin: 0;
  color: ${(props) => props.theme.colors.text};
`;

export const SchemaOptionCardText = styled(Card.Text)`
  color: ${(props) => props.theme.colors.textSecondary};
`;

export const FormField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}) => (
  <StyledFormGroup>
    <StyledLabel>
      {label}
      {required && " *"}
    </StyledLabel>
    <StyledInput
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
    />
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
