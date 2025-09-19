import React, { createContext, useState, useContext, useEffect } from "react";
import { ThemeProvider as StyledThemeProvider } from "styled-components";

const themes = {
  dark: {
    name: "dark",
    colors: {
      background: "#121212",
      sidebar: "#000000",
      card: "#282828",
      input: "#3e3e3e",
      inputHover: "#4e4e4e",
      text: "#ffffff",
      textSecondary: "#b3b3b3",
      border: "#444",
      borderLight: "#555",
      hover: "#333333",
      scrollbar: "#555",
      scrollbarHover: "#777",
      accent: "#1976D2",
      accentHover: "#2196F3",
      danger: "#dc3545",
      dangerHover: "#c82333",
      tableHeader: "#4e4e4e",
      tableRowOdd: "#333333",
      tableRowHover: "#4e4e4e",
      errorBackground: "rgba(255, 0, 0, 0.1)",
      errorBackgroundHover: "rgba(255, 0, 0, 0.2)",
    },
  },
  light: {
    name: "light",
    colors: {
      background: "#ffffff",
      sidebar: "#f8f9fa",
      card: "#ffffff",
      input: "#f8f9fa",
      inputHover: "#e9ecef",
      text: "#212529",
      textSecondary: "#6c757d",
      border: "#dee2e6",
      borderLight: "#ced4da",
      hover: "#f8f9fa",
      scrollbar: "#ced4da",
      scrollbarHover: "#adb5bd",
      accent: "#1976D2",
      accentHover: "#2196F3",
      danger: "#dc3545",
      dangerHover: "#c82333",
      tableHeader: "#e9ecef",
      tableRowOdd: "#f8f9fa",
      tableRowHover: "#e9ecef",
      errorBackground: "rgba(220, 53, 69, 0.1)",
      errorBackgroundHover: "rgba(220, 53, 69, 0.2)",
    },
  },
};

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme && themes[savedTheme] ? savedTheme : "dark";
  });

  useEffect(() => {
    localStorage.setItem("theme", currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const value = {
    currentTheme,
    toggleTheme,
    theme: themes[currentTheme],
  };

  return (
    <ThemeContext.Provider value={value}>
      <StyledThemeProvider theme={themes[currentTheme]}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};
