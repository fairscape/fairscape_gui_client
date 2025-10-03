import React from "react";
import styled from "styled-components";
import { FiDownload, FiRefreshCw, FiZap } from "react-icons/fi";

const ActionSidebar = ({
  onDownload,
  onStartOver,
  isAllSectionsReviewed,
  isReviewRequired,
  reviewProgress,
}) => {
  return (
    <SidebarContainer>
      <SidebarContent>
        <Title>Actions</Title>

        <ActionButton onClick={onDownload} variant="primary">
          <FiDownload />
          <ButtonText>Save Release</ButtonText>
        </ActionButton>

        <ActionButton variant="secondary" disabled={true}>
          <FiZap />
          <ButtonText>AI-Ready Score</ButtonText>
          <DisabledText>Coming Soon</DisabledText>
        </ActionButton>

        <Divider />

        <ActionButton onClick={onStartOver} variant="danger">
          <FiRefreshCw />
          <ButtonText>Start Over</ButtonText>
        </ActionButton>
      </SidebarContent>
    </SidebarContainer>
  );
};

const SidebarContainer = styled.div`
  position: sticky;
  top: 20px;
  width: 250px;
  height: fit-content;
`;

const SidebarContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
`;

const Title = styled.h3`
  font-size: 18px;
  color: #3e7aa8;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0e0e0;
`;

const ActionButton = styled.button`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px;
  margin-bottom: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;

  ${({ variant }) => {
    switch (variant) {
      case "primary":
        return `
          background: #3e7aa8;
          color: white;
          &:hover:not(:disabled) {
            background: #2c5f8d;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }
        `;
      case "secondary":
        return `
          background: #6c757d;
          color: white;
          &:hover:not(:disabled) {
            background: #5a6268;
            transform: translateY(-2px);
          }
        `;
      case "danger":
        return `
          background: #dc3545;
          color: white;
          &:hover {
            background: #c82333;
            transform: translateY(-2px);
          }
        `;
      default:
        return "";
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  svg {
    font-size: 20px;
  }
`;

const ButtonText = styled.span`
  font-size: 14px;
`;

const DisabledText = styled.span`
  font-size: 11px;
  opacity: 0.8;
`;

const Divider = styled.hr`
  margin: 20px 0;
  border: none;
  border-top: 1px solid #e0e0e0;
`;

export default ActionSidebar;
