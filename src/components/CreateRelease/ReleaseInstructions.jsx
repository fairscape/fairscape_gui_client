import React from "react";
import styled from "styled-components";
import { StyledButton } from "../StyledComponents";

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background-color: ${(props) => props.theme.colors.background};
`;

const InstructionCard = styled.div`
  background-color: ${(props) => props.theme.colors.card};
  border: ${(props) =>
    props.theme.name === "light"
      ? "1px solid " + props.theme.colors.border
      : "none"};
  padding: 40px;
  border-radius: 8px;
  box-shadow: ${(props) =>
    props.theme.name === "light"
      ? "0 2px 4px rgba(0, 0, 0, 0.05)"
      : "0 2px 4px rgba(0, 0, 0, 0.2)"};
  max-width: 1000px;
  width: 100%;
`;

const Title = styled.h2`
  color: ${(props) => props.theme.colors.text};
  text-align: center;
  margin-bottom: 30px;
`;

const PrepSection = styled.div`
  margin-bottom: 35px;
`;

const PrepText = styled.p`
  color: ${(props) => props.theme.colors.text};
  text-align: center;
  margin-bottom: 25px;
  font-size: 15px;
`;

const DirectoryExample = styled.pre`
  background-color: ${(props) => props.theme.colors.input};
  color: ${(props) => props.theme.colors.text};
  padding: 20px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0 auto;
  border: 1px solid ${(props) => props.theme.colors.borderLight};
  max-width: 500px;
  text-align: left;
`;

const Divider = styled.div`
  height: 1px;
  background-color: ${(props) => props.theme.colors.borderLight};
  margin: 35px 0;
`;

const ModeSelectionSection = styled.div``;

const SectionTitle = styled.h3`
  color: ${(props) => props.theme.colors.text};
  text-align: center;
  margin-bottom: 20px;
  font-size: 18px;
`;

const OptionContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 25px;
  flex-wrap: wrap;
`;

const OptionCard = styled.div`
  flex: 1;
  min-width: 320px;
  max-width: 420px;
  background-color: ${(props) => props.theme.colors.input};
  border: 1px solid ${(props) => props.theme.colors.borderLight};
  border-radius: 6px;
  padding: 25px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &:hover {
    background-color: ${(props) => props.theme.colors.inputHover};
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }
`;

const OptionTitle = styled.h4`
  color: ${(props) => props.theme.colors.accent};
  margin-bottom: 12px;
`;

const OptionDescription = styled.p`
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 20px;
  flex-grow: 1;
  line-height: 1.5;
`;

function ReleaseInstructions({ onModeSelect }) {
  return (
    <Container>
      <InstructionCard>
        <Title>Create or Edit Release RO-Crate</Title>

        <PrepSection>
          <PrepText>
            Before you begin, ensure your sub-crates are organized in a single
            root directory. You'll select this root folder in the next step.
          </PrepText>
          <DirectoryExample>
            {`./root
  ├── sub-crate-1/
  │   ├── ro-crate-metadata.json
  │   └── data-file-1.txt
  └── sub-crate-2/
      ├── ro-crate-metadata.json
      └── data-file-2.csv`}
          </DirectoryExample>
        </PrepSection>

        <Divider />

        <ModeSelectionSection>
          <SectionTitle>Choose an option to continue</SectionTitle>
          <OptionContainer>
            <OptionCard onClick={() => onModeSelect("new")}>
              <OptionTitle>Create New Release</OptionTitle>
              <OptionDescription>
                Start a new release RO-Crate from scratch. The system will scan
                your selected directory for sub-crates and help you create the
                release metadata.
              </OptionDescription>
              <StyledButton>Create New</StyledButton>
            </OptionCard>

            <OptionCard onClick={() => onModeSelect("edit")}>
              <OptionTitle>Edit Existing Release</OptionTitle>
              <OptionDescription>
                Open an existing release RO-Crate to modify its metadata. The
                system will load the current metadata and rescan for any new
                sub-crates.
              </OptionDescription>
              <StyledButton variant="secondary">Edit Existing</StyledButton>
            </OptionCard>
          </OptionContainer>
        </ModeSelectionSection>
      </InstructionCard>
    </Container>
  );
}

export default ReleaseInstructions;
