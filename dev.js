/* eslint-disable @typescript-eslint/no-var-requires */
const execa = require("execa");
const fs = require("fs");
const path = require("path");

(async () => {
  // Start the webpack dev for the frontend.
  execa("npm", ["run", "liveWebpackFrontend"], {
    stdio: "inherit",
    cwd: path.join(__dirname, "frontend")
  });

  // Start the webpack dev for the server.
  const backendDir = path.join(__dirname, "backend");
  execa("npm", ["run", "liveWebpackServer"], {
    stdio: "inherit",
    cwd: backendDir
  });

  // Cloudworker will fail if dist/worker.development.js does not exist, so write an empty file.
  const workerJsPath = path.join(backendDir, "dist", "worker.development.js");
  await fs.promises.writeFile(workerJsPath, "0");

  // Start the Cloudflare Worker emulation (cloudworker).
  execa("npm", ["run", "liveCloudWorker"], {
    stdio: "inherit",
    cwd: backendDir
  });
})();
