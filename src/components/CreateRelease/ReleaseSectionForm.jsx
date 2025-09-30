import React, { useState } from "react";
import styled from "styled-components";
import { FiChevronRight, FiChevronDown } from "react-icons/fi";
import releaseFormConfig from "./config/releaseFormConfig.json";
import { FormField, TextAreaField, StyledForm } from "../StyledComponents";

const SectionContainer = styled.div`
  background-color: ${(props) => props.theme.colors.card};
  border-radius: 10px;
  margin-bottom: 20px;
  overflow: hidden;
  border: ${(props) =>
    props.theme.name === "light"
      ? "1px solid " + props.theme.colors.border
      : "none"};
  box-shadow: ${(props) =>
    props.theme.name === "light"
      ? "0 2px 4px rgba(0, 0, 0, 0.05)"
      : "0 2px 4px rgba(0, 0, 0, 0.2)"};
`;

const SectionHeader = styled.div`
  background-color: ${(props) => props.theme.colors.input};
  padding: 15px 20px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.colors.inputHover};
  }
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.text};
`;

const SectionProgress = styled.div`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const SectionContent = styled.div`
  padding: 20px;
  animation: slideDown 0.3s ease-out;

  @keyframes slideDown {
    from {
      opacity: 0;
      max-height: 0;
    }
    to {
      opacity: 1;
      max-height: 2000px;
    }
  }
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: ${(props) =>
    props.singleColumn ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))"};
  gap: 20px;
`;

const FieldWrapper = styled.div`
  position: relative;
`;

const RequiredIndicator = styled.span`
  color: ${(props) => props.theme.colors.error || "#dc3545"};
  margin-left: 4px;
`;

function ReleaseSectionForm({ formData, onFieldChange }) {
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (sectionId) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const getSectionProgress = (section) => {
    const filledFields = section.fields.filter(
      (field) =>
        formData[field.name] && formData[field.name].toString().trim() !== ""
    ).length;
    const requiredFields = section.fields.filter(
      (field) => field.required
    ).length;
    const filledRequired = section.fields.filter(
      (field) =>
        field.required &&
        formData[field.name] &&
        formData[field.name].toString().trim() !== ""
    ).length;

    return {
      filled: filledFields,
      total: section.fields.length,
      requiredFilled: filledRequired,
      requiredTotal: requiredFields,
    };
  };

  const renderField = (field) => {
    const label = (
      <>
        {field.label}
        {field.required && <RequiredIndicator>*</RequiredIndicator>}
      </>
    );

    if (field.type === "textarea") {
      return (
        <TextAreaField
          key={field.name}
          label={label}
          name={field.name}
          value={formData[field.name] || ""}
          onChange={(e) => onFieldChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
      );
    }

    return (
      <FormField
        key={field.name}
        label={label}
        name={field.name}
        type={field.type}
        value={formData[field.name] || ""}
        onChange={(e) => onFieldChange(field.name, e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
      />
    );
  };

  return (
    <>
      {releaseFormConfig.sections.map((section) => {
        const progress = getSectionProgress(section);
        const isCollapsed = collapsedSections[section.id];
        const hasTextarea = section.fields.some((f) => f.type === "textarea");

        return (
          <SectionContainer key={section.id}>
            <SectionHeader onClick={() => toggleSection(section.id)}>
              <SectionTitle>
                {isCollapsed ? <FiChevronRight /> : <FiChevronDown />}
                {section.title}
              </SectionTitle>
              <SectionProgress>
                {progress.filled}/{progress.total} filled
                {progress.requiredTotal > 0 &&
                  ` (${progress.requiredFilled}/${progress.requiredTotal} required)`}
              </SectionProgress>
            </SectionHeader>

            {!isCollapsed && (
              <SectionContent>
                <FieldGrid singleColumn={hasTextarea}>
                  {section.fields.map((field) => (
                    <FieldWrapper key={field.name}>
                      {renderField(field)}
                    </FieldWrapper>
                  ))}
                </FieldGrid>
              </SectionContent>
            )}
          </SectionContainer>
        );
      })}
    </>
  );
}

export default ReleaseSectionForm;
