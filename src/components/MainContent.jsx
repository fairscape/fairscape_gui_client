import React from "react";
import InitForm from "./InitForm";
import PackageForm from "./PackageForm";
import UploadForm from "./UploadForm";
import Register from "./Register/FileSelectorOrchestrator";

function MainContent({ currentView, rocratePath, setRocratePath }) {
  switch (currentView) {
    case "init":
      return (
        <InitForm rocratePath={rocratePath} setRocratePath={setRocratePath} />
      );
    case "register":
      return <Register rocratePath={rocratePath} />;
    case "package":
      return <PackageForm rocratePath={rocratePath} />;
    case "upload":
      return <UploadForm />;
    default:
      return <div>Select an action from the sidebar</div>;
  }
}

export default MainContent;
