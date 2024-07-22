import styled from "styled-components";
import { Form, Button, Col } from "react-bootstrap";

const accentColor = "#1976D2";
const accentColorHover = "#2196F3";

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: #121212;
  color: #ffffff;
`;

const Sidebar = styled.div`
  width: 200px;
  background-color: #000000;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
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
  color: white;
  &:hover {
    background-color: #282828;
  }
  ${(props) =>
    props.active &&
    `
    background-color: ${accentColor};
    &:hover {
      background-color: ${accentColorHover};
    }
  `}
`;

const MainContent = styled.div`
  flex-grow: 1;
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-left: 200px;
`;

const StyledForm = styled(Form)`
  background-color: #282828;
  padding: 20px;
  border-radius: 8px;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
`;

const StyledFormGroup = styled(Form.Group)`
  margin-bottom: 15px;
`;

const StyledFormControl = styled(Form.Control)`
  background-color: #3e3e3e;
  border: none;
  color: #ffffff;
  &:focus {
    background-color: #3e3e3e;
    color: #ffffff;
    box-shadow: 0 0 0 0.2rem rgba(25, 118, 210, 0.25);
  }
`;

const StyledButton = styled(Button)`
  background-color: ${accentColor};
  border: none;
  &:hover,
  &:focus,
  &:active {
    background-color: ${accentColorHover};
  }
`;

const OutputBox = styled.pre`
  background-color: #282828;
  color: ${accentColor};
  padding: 15px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
  flex-grow: 1;
  overflow-y: auto;
  margin-top: 20px;
`;

const SmallerCol = styled(Col)`
  flex: 0 0 20%;
  max-width: 20%;
`;

const LargerCol = styled(Col)`
  flex: 0 0 60%;
  max-width: 60%;
`;

export {
  AppContainer,
  Sidebar,
  MainContent,
  SidebarItem,
  SidebarContent,
  SidebarFooter,
  StyledForm,
  StyledFormGroup,
  StyledFormControl,
  StyledButton,
  OutputBox,
  SmallerCol,
  LargerCol,
};
