/* eslint-disable @typescript-eslint/no-var-requires */
const execa = require("execa");
const fs = require("fs");
const path = require("path");

(async () => {
  // Start the webpack dev for the client.
  execa("npm", ["run", "liveWebpackClient"], {
    stdio: "inherit",
    cwd: path.join(__dirname, "client")
  });

  // Start the webpack dev for the server.
  const backendDir = path.join(__dirname, "www");
  execa("npm", ["run", "liveWebpackServer"], {
    stdio: "inherit",
    cwd: backendDir
  });

  // Cloudworker will fail if dist/worker.development.js does not exist, so wait for it.
  const workerJsPath = path.join(backendDir, "dist", "worker.development.js");
  await new Promise((resolve) => {
    const interval = setInterval(() => {
      if (fs.existsSync(workerJsPath)) {
        clearInterval(interval);
        resolve();
        console.log(`Worker '${workerJsPath}' exists!`);
      } else {
        console.log(`Waiting for '${workerJsPath}' to exist...`);
      }
    }, 500);
  });

  // Start the Cloudflare Worker emulation (cloudworker).
  execa("npm", ["run", "liveCloudWorker"], {
    stdio: "inherit",
    cwd: backendDir
  });
})();
