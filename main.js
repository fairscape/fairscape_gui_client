const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const archiver = require("archiver");
const { TabularValidationSchema } = require("./src/models/tabularSchema");
const {
  generateEvidenceGraphs,
} = require("./src/rocrate/evidence_graph_builder");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 800,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar", "index.html")
    : path.join(__dirname, "index.html");
  win.loadFile(indexPath);
}

async function convertFileToSchemaJSON(rocratePath, filePath) {
  const fullPath = path.join(rocratePath, filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  try {
    const fileExtension = path.extname(filePath);
    const fileName = path.basename(filePath, fileExtension);
    const fileType = fileExtension.slice(1).toUpperCase();

    const schema = await TabularValidationSchema.inferFromFile(
      fullPath,
      fileName,
      `Auto-generated schema for ${fileType} file: ${fileName}`
    );

    // Convert schema to the format expected by the frontend
    return {
      name: schema.name,
      description: schema.description,
      properties: Object.entries(schema.properties).map(([name, prop]) => ({
        name,
        description: prop.description,
        index: prop.index,
        valueURL: prop.valueURL || "",
        type: prop.type,
      })),
      separator: schema.separator,
      header: schema.header,
    };
  } catch (error) {
    console.error(`Error reading ${path.basename(filePath)}:`, error);
    throw error;
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

if (process.platform === "darwin") {
  app.dock.setIcon(path.join(__dirname, "build", "icon.png"));
}

// IPC Handlers
ipcMain.on("execute-command", (event, command) => {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      event.reply("command-result", `Error: ${error.message}`);
      return;
    }
    if (stderr) {
      event.reply("command-result", `stderr: ${stderr}`);
      return;
    }
    event.reply("command-result", stdout);
  });
});

ipcMain.handle("generate-evidence-graphs", async (event, rocratePath) => {
  try {
    const metadataPath = path.join(rocratePath, "ro-crate-metadata.json");
    const metadata = JSON.parse(
      await fs.promises.readFile(metadataPath, "utf8")
    );
    const updatedMetadata = generateEvidenceGraphs(metadata);
    await fs.promises.writeFile(
      metadataPath,
      JSON.stringify(updatedMetadata, null, 2)
    );
    return { success: true };
  } catch (error) {
    console.error("Error generating evidence graphs:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("zip-rocrate", async (event, rocratePath) => {
  return new Promise((resolve, reject) => {
    const folderName = path.basename(rocratePath);
    const outputPath = path.join(
      path.dirname(rocratePath),
      `${folderName}.zip`
    );
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    output.on("close", function () {
      resolve({ success: true, zipPath: output.path });
    });

    archive.on("error", function (err) {
      reject({ success: false, error: err.message });
    });

    archive.pipe(output);
    archive.directory(rocratePath, folderName);
    archive.finalize();
  });
});

ipcMain.handle("open-directory-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return result;
});

ipcMain.handle(
  "convert-parquet-to-schema",
  async (event, rocratePath, parquetFilePath) => {
    try {
      const schemaJSON = await convertFileToSchemaJSON(
        rocratePath,
        parquetFilePath
      );
      return schemaJSON;
    } catch (error) {
      console.error("Error converting Parquet to Schema:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "convert-csv-to-schema",
  async (event, rocratePath, csvFilePath) => {
    try {
      const schemaJSON = await convertFileToSchemaJSON(
        rocratePath,
        csvFilePath
      );
      return schemaJSON;
    } catch (error) {
      console.error("Error converting CSV to Schema:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "validate-dataset",
  async (event, { rocratePath, datasetId, schemaId }) => {
    try {
      const metadataPath = path.join(rocratePath, "ro-crate-metadata.json");
      const metadata = JSON.parse(
        await fs.promises.readFile(metadataPath, "utf8")
      );

      // Find dataset and schema in the graph
      const graph = metadata["@graph"];
      const dataset = graph.find((item) => item["@id"] === datasetId);
      const schema = graph.find((item) => item["@id"] === schemaId);

      if (!dataset || !schema) {
        throw new Error("Dataset or schema not found");
      }

      // Get the file path from the dataset's contentUrl
      const filePath = dataset.contentUrl.replace("file:///", "");
      const fullPath = path.join(rocratePath, filePath);

      // Create schema instance and validate
      const schemaInstance = new TabularValidationSchema({
        name: schema.name,
        description: schema.description,
        properties: schema.properties,
        required: schema.required || [],
        separator: schema.separator,
        header: schema.header,
      });

      const errors = await schemaInstance.validateFile(fullPath);
      return errors;
    } catch (error) {
      console.error("Validation error:", error);
      throw error;
    }
  }
);

module.exports = { createWindow };
