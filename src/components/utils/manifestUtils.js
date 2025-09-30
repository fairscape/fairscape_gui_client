import fs from "fs/promises";
import path from "path";
import axios from "axios";

export async function validateManifestCSV(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          resolve({ isValid: false, error: "CSV file appears to be empty" });
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const urlIndex = headers.indexOf("url");

        if (urlIndex === -1) {
          resolve({ isValid: false, error: "CSV must contain a 'url' column" });
          return;
        }

        const urls = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",");
          if (values[urlIndex]) {
            const url = values[urlIndex].trim();
            if (url && url.startsWith("http")) {
              urls.push(url);
            }
          }
        }

        if (urls.length === 0) {
          resolve({ isValid: false, error: "No valid URLs found in the CSV" });
          return;
        }

        resolve({ isValid: true, urls });
      } catch (error) {
        resolve({
          isValid: false,
          error: `Failed to parse CSV: ${error.message}`,
        });
      }
    };

    reader.readAsText(file);
  });
}

export async function downloadManifestFiles(
  file,
  targetDirectory,
  progressCallback
) {
  const validation = await validateManifestCSV(file);

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const urls = validation.urls;
  const total = urls.length;
  let current = 0;

  progressCallback(current, total);

  for (const url of urls) {
    try {
      const filename =
        path.basename(new URL(url).pathname) || `download_${Date.now()}`;
      const filepath = path.join(targetDirectory, filename);

      const response = await axios({
        method: "GET",
        url: url,
        responseType: "arraybuffer",
        timeout: 30000,
        maxContentLength: 500 * 1024 * 1024,
      });

      const buffer = Buffer.from(response.data);
      await fs.writeFile(filepath, buffer);

      current++;
      progressCallback(current, total);
    } catch (error) {
      console.error(`Failed to download ${url}:`, error.message);
      current++;
      progressCallback(current, total);
    }
  }

  return { downloaded: current, total };
}
