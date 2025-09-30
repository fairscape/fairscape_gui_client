import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import styled from "styled-components";
import { useTheme } from "../themes";
import LoginComponent from "./LoginComponent";
import {
  Sidebar,
  SidebarContent,
  SidebarItem,
  SidebarFooter,
} from "./StyledComponents";

import logoDark from "../assets/logo_dark.svg";
import logoLight from "../assets/logo_light.svg";

const ThemeSwitcher = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 4px;
  overflow: hidden;
`;

const ThemeOption = styled.button`
  flex: 1;
  padding: 8px;
  background-color: ${(props) =>
    props.active ? props.theme.colors.accent : props.theme.colors.input};
  color: ${(props) =>
    props.active ? "#fff" : props.theme.colors.textSecondary};
  border: none;
  cursor: ${(props) => (props.active ? "default" : "pointer")};
  font-weight: ${(props) => (props.active ? "bold" : "normal")};
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) =>
      props.active ? props.theme.colors.accent : props.theme.colors.inputHover};
  }
`;

const UserCircle = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${(props) => props.theme.colors.accent};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.colors.accentHover};
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background-color: ${(props) => props.theme.colors.card};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 4px;
  padding: 15px;
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
  width: 100%;
  box-sizing: border-box;
`;

const UserProfileContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UserInfo = styled.div`
  margin-bottom: 8px;
  color: ${(props) => props.theme.colors.text};
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 6px;
  background-color: ${(props) => props.theme.colors.danger};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: ${(props) => props.theme.colors.dangerHover};
  }
`;

const SectionSeparator = styled.div`
  border-top: 1px solid ${(props) => props.theme.colors.border};
  margin: 15px 0;
`;

function SidebarComponent({
  selectedView,
  handleViewSelect,
  isLoggedIn,
  userData,
  onLogin,
  onLogout,
}) {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [user, setUser] = useState(null);
  const { currentTheme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isLoggedIn && userData) {
      decodeUserToken();
    }
  }, [isLoggedIn, userData]);

  const decodeUserToken = () => {
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        const decodedToken = jwtDecode(token);
        setUser({
          givenName: decodedToken.name.split(" ")[0],
          surname: decodedToken.name.split(" ")[1],
          email: decodedToken.email,
          organization: decodedToken.iss
            ? decodedToken.iss.replace("https://", "").replace("/", "")
            : "Unknown",
        });
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error("Error decoding token:", error);
      handleLogout();
    }
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    onLogout();
    setDropdownVisible(false);
  };

  const steps = [
    { id: "init", label: "1: Init" },
    { id: "register", label: "2: Register" },
    { id: "review", label: "3: Review" },
    { id: "package", label: "4: Package" },
    { id: "upload", label: "5: Upload" },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <img
            src={currentTheme === "dark" ? logoDark : logoLight}
            alt="FAIRSCAPE ROCrate Repository"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>
        <SidebarItem
          onClick={() => handleViewSelect("questionnaire")}
          active={selectedView === "questionnaire"}
        >
          Steps
        </SidebarItem>
        {steps.map((step) => (
          <SidebarItem
            key={step.id}
            onClick={() => handleViewSelect(step.id)}
            active={selectedView === step.id}
          >
            {step.label}
          </SidebarItem>
        ))}

        <SectionSeparator />

        <SidebarItem
          onClick={() => handleViewSelect("release")}
          active={selectedView === "release"}
        >
          Create Release
        </SidebarItem>
      </SidebarContent>
      <SidebarFooter>
        <ThemeSwitcher>
          <ThemeOption
            active={currentTheme === "dark"}
            onClick={() =>
              currentTheme !== "dark" ? toggleTheme() : undefined
            }
          >
            🌙 Dark
          </ThemeOption>
          <ThemeOption
            active={currentTheme === "light"}
            onClick={() =>
              currentTheme !== "light" ? toggleTheme() : undefined
            }
          >
            ☀️ Light
          </ThemeOption>
        </ThemeSwitcher>
        {isLoggedIn && user ? (
          <UserProfileContainer>
            {dropdownVisible && (
              <DropdownMenu>
                <UserInfo>
                  <strong>Name:</strong> {user.givenName} {user.surname}
                </UserInfo>
                <UserInfo>
                  <strong>Email:</strong> {user.email}
                </UserInfo>
                <UserInfo>
                  <strong>Organization:</strong> {user.organization}
                </UserInfo>
                <LogoutButton onClick={handleLogout}>Log Out</LogoutButton>
              </DropdownMenu>
            )}
            <UserCircle onClick={toggleDropdown}>
              {user.givenName.charAt(0)}
            </UserCircle>
          </UserProfileContainer>
        ) : (
          <LoginComponent onLogin={onLogin} />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export default SidebarComponent;
