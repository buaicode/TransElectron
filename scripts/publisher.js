#!/usr/bin/env node
const { execSync } = require("child_process");
const os = process.platform;
try {
  if (os === "darwin") {
    execSync("bash ./publish.sh", { stdio: "inherit" });
  } else if (os === "win32") {
    execSync("powershell -ExecutionPolicy Bypass -File publish.ps1", { stdio: "inherit" });
  } else {
    console.error(`Unsupported OS: ${os}`);
    process.exit(1);
  }
} catch (e) {
  process.exit(e.status || 1);
}