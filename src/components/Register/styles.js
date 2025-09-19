import styled from "styled-components";
import { ListGroup, Button, Form, Container } from "react-bootstrap";

export const StyledContainer = styled(Container)`
  background-color: ${(props) => props.theme.colors.card};
  color: ${(props) => props.theme.colors.text};
  padding: 30px;
  border-radius: 10px;
  box-shadow: ${(props) =>
    props.theme.name === "light"
      ? "0 0 10px rgba(0, 0, 0, 0.1)"
      : "0 0 10px rgba(0, 0, 0, 0.3)"};
`;

export const StyledTitle = styled.h2`
  margin-bottom: 30px;
  text-align: center;
  color: ${(props) => props.theme.colors.text};
`;

export const StyledListGroup = styled(ListGroup)`
  background-color: ${(props) => props.theme.colors.input};
`;

export const StyledListGroupItem = styled(ListGroup.Item)`
  background-color: ${(props) => props.theme.colors.input};
  color: ${(props) =>
    props.isRegistered
      ? props.theme.colors.textSecondary
      : props.theme.colors.text};
  border-color: ${(props) => props.theme.colors.border};
  cursor: ${(props) => (props.isRegistered ? "not-allowed" : "pointer")};
  pointer-events: ${(props) => (props.isRegistered ? "none" : "auto")};

  &:hover {
    background-color: ${(props) =>
      props.isRegistered
        ? props.theme.colors.input
        : props.theme.colors.inputHover};
  }
`;

export const DoiListItem = styled(ListGroup.Item)`
  background-color: ${(props) => props.theme.colors.card} !important;
  color: ${(props) => props.theme.colors.text};
  border-color: ${(props) => props.theme.colors.border};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  font-style: italic;

  &:hover {
    background-color: ${(props) => props.theme.colors.inputHover} !important;
  }
`;

export const StyledButton = styled(Button)`
  margin-right: 10px;
  background-color: ${(props) => props.theme.colors.accent};
  border: none;
  color: #fff;

  &:hover {
    background-color: ${(props) => props.theme.colors.accentHover};
  }
`;

export const CheckMark = styled.span`
  color: ${(props) => props.theme.colors.accent};
  margin-left: 10px;
`;

export const DoneButton = styled(StyledButton)`
  margin-top: 20px;
`;

export const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
`;

export const RightAlignedButton = styled(StyledButton)`
  margin-left: auto;
`;

export const DoiContainer = styled.div`
  margin-bottom: 20px;
`;

export const DoiInput = styled(Form.Control)`
  background-color: ${(props) => props.theme.colors.input};
  color: ${(props) => props.theme.colors.text};
  border-color: ${(props) => props.theme.colors.border};

  &:focus {
    background-color: ${(props) => props.theme.colors.input};
    color: ${(props) => props.theme.colors.text};
    border-color: ${(props) => props.theme.colors.accent};
    box-shadow: 0 0 0 0.2rem ${(props) => props.theme.colors.accent}40;
  }
`;
