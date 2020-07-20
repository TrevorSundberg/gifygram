import execa from "execa";
import fs from "fs";
import path from "path";
import readline from "readline";

(async () => {
  const read = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  // eslint-disable-next-line no-process-exit
  read.on("close", () => process.exit(0));

  const rootDir = path.join(__dirname, "..", "..");
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


  // Start the webpack dev for the tests.
  const testDir = path.join(rootDir, "test");
  execa("npm", ["run", "liveWebpackTest"], {
    stdio: "inherit",
    cwd: testDir,
    killSignal: "SIGKILL"
  });

  const testJsPath = path.join(testDir, "dist", "main.js");

  // Wait until webpack compiles the tests.
  for (;;) {
    if (fs.existsSync(testJsPath)) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  process.env.NODE_PATH = path.join(testDir, "node_modules");
  // eslint-disable-next-line no-underscore-dangle
  require("module").Module._initPaths();

  for (;;) {
    await new Promise((resolve) => read.question("Press enter to run the test...", resolve));

    // eslint-disable-next-line no-eval
    eval(await fs.promises.readFile(testJsPath, "utf8"));
  }
})();
