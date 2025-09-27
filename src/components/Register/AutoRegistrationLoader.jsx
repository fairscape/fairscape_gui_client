import React from "react";
import styled from "styled-components";

const LoaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
`;

const LoaderTitle = styled.h2`
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 30px;
  font-size: 24px;
`;

const ProgressBar = styled.div`
  width: 400px;
  height: 30px;
  background-color: ${(props) => props.theme.colors.inputBackground};
  border-radius: 15px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: ${(props) => props.theme.colors.accent};
  transition: width 0.3s ease;
  width: ${(props) => (props.progress / props.total) * 100}%;
`;

const ProgressText = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 20px;
  font-size: 18px;
`;

const Spinner = styled.div`
  border: 3px solid ${(props) => props.theme.colors.inputBackground};
  border-top: 3px solid ${(props) => props.theme.colors.accent};
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-top: 20px;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

function AutoRegistrationLoader({ current, total }) {
  console.log(
    "[AutoRegistrationLoader] Rendered with current:",
    current,
    "total:",
    total
  );

  return (
    <LoaderContainer>
      <LoaderTitle>Auto-registering Files</LoaderTitle>
      <ProgressBar>
        <ProgressFill progress={current} total={total} />
      </ProgressBar>
      <ProgressText>
        Registering file {current} of {total}...
      </ProgressText>
      <Spinner />
    </LoaderContainer>
  );
}

export default AutoRegistrationLoader;
