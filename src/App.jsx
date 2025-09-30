import React, { useState, useEffect } from "react";
import { ThemeProvider } from "./themes";
import InitForm from "./components/InitForm";
import FileSelectorOrchestrator from "./components/Register/FileSelectorOrchestrator";
import ComputationForm from "./components/Register/ComputationForm";
import Review from "./components/Review";
import PackageForm from "./components/PackageForm";
import UploadForm from "./components/UploadForm";
import SidebarComponent from "./components/SideBar";
import Questionnaire from "./components/Questionnaire";
import ReleaseForm from "./components/CreateRelease/ReleaseForm";
import {
  AppContainer,
  MainContentWrapper,
} from "./components/StyledComponents";

function App() {
  const [currentView, setCurrentView] = useState("questionnaire");
  const [rocratePath, setRocratePath] = useState("");
  const [packagedPath, setPackagedPath] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [registeredFiles, setRegisteredFiles] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleViewSelect = (view) => {
    setCurrentView(view);
  };

  const handleInitSuccess = () => {
    setCurrentView("register");
  };

  const handleInitRequired = (path) => {
    setRocratePath(path);
    setCurrentView("init");
  };

  const handleDoneRegistering = () => {
    setCurrentView("computation");
  };

  const handleComputationComplete = () => {
    setCurrentView("review");
  };

  const handleReviewComplete = () => {
    setCurrentView("package");
  };

  const handlePackageComplete = (zipPath) => {
    setPackagedPath(zipPath);
    setCurrentView("upload");
  };

  const handleLogin = (data) => {
    setIsLoggedIn(true);
    setUserData(data);
    localStorage.setItem("authToken", data.token);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    localStorage.removeItem("authToken");
    setCurrentView("questionnaire");
  };

  const handleFileRegister = (newFiles) => {
    setRegisteredFiles([...registeredFiles, ...newFiles]);
  };

  const renderMainContent = () => {
    switch (currentView) {
      case "questionnaire":
        return <Questionnaire onStepSelect={handleViewSelect} />;
      case "init":
        return (
          <InitForm
            rocratePath={rocratePath}
            setRocratePath={setRocratePath}
            onSuccess={handleInitSuccess}
          />
        );
      case "register":
        return (
          <FileSelectorOrchestrator
            rocratePath={rocratePath}
            setRocratePath={setRocratePath}
            onDoneRegistering={handleDoneRegistering}
            onSkipComputations={handleComputationComplete}
            onFileRegister={handleFileRegister}
            onInitRequired={handleInitRequired}
          />
        );
      case "computation":
        return (
          <ComputationForm
            rocratePath={rocratePath}
            registeredFiles={registeredFiles}
            onComplete={handleFileRegister}
            onSkip={handleComputationComplete}
          />
        );
      case "review":
        return (
          <Review
            rocratePath={rocratePath}
            onContinue={handleReviewComplete}
            setRocratePath={setRocratePath}
          />
        );
      case "package":
        return (
          <PackageForm
            rocratePath={rocratePath}
            setRocratePath={setRocratePath}
            onComplete={handlePackageComplete}
          />
        );
      case "upload":
        return <UploadForm packagedPath={packagedPath} />;
      case "release":
        return <ReleaseForm />;
      default:
        return <div>Select a step from the sidebar</div>;
    }
  };

  return (
    <ThemeProvider>
      <AppContainer>
        <SidebarComponent
          selectedView={currentView}
          handleViewSelect={handleViewSelect}
          isLoggedIn={isLoggedIn}
          userData={userData}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
        <MainContentWrapper>{renderMainContent()}</MainContentWrapper>
      </AppContainer>
    </ThemeProvider>
  );
}

export default App;
