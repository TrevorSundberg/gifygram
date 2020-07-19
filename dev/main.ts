import execa from "execa";
import fs from "fs";
import path from "path";

const rootDir = path.join(__dirname, "..", "..");

(async () => {
  await execa("npm", ["run", "buildTsSchemaLoader"], {
    stdio: "inherit",
    cwd: rootDir,
    killSignal: "SIGKILL"
  });

  // Start the webpack dev for the frontend.
  execa("npm", ["run", "liveWebpackFrontend"], {
    stdio: "inherit",
    cwd: path.join(rootDir, "frontend"),
    killSignal: "SIGKILL"
  });

  // Start the webpack dev for the backend.
  const backendDir = path.join(rootDir, "backend");
  execa("npm", ["run", "liveWebpackBackend"], {
    stdio: "inherit",
    cwd: backendDir,
    killSignal: "SIGKILL"
  });

  // Cloudworker will fail if dist/worker.development.js does not exist, so write an empty file.
  const workerJsPath = path.join(backendDir, "dist", "worker.development.js");
  await fs.promises.writeFile(workerJsPath, "0");

  // Start the Cloudflare Worker emulation (cloudworker).
  execa("npm", ["run", "liveCloudWorker"], {
    stdio: "inherit",
    cwd: backendDir,
    killSignal: "SIGKILL"
  });
})();
