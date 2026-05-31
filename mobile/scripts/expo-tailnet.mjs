import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);

const PORT = process.env.EXPO_PORT ?? "8081";

function die(message, error) {
  console.error(message);

  if (error) {
    console.error(error.message ?? String(error));
  }

  process.exit(1);
}

function getTailscaleIPv4() {
  let output;

  try {
    output = execFileSync("tailscale", ["ip", "-4"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    die("Could not read Tailscale IPv4 address. Is Tailscale running?", error);
  }

  const ip = output
    .trim()
    .split(/\s+/)
    .find((value) => /^\d+\.\d+\.\d+\.\d+$/.test(value));

  if (!ip) {
    die("`tailscale ip -4` did not return an IPv4 address.");
  }

  return ip;
}

function getExpoCliPath() {
  let packageJsonPath;

  try {
    packageJsonPath = require.resolve("expo/package.json");
  } catch (error) {
    die("Could not resolve the local `expo` package. Run this from your Expo app package.", error);
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const binPath =
    typeof packageJson.bin === "string"
      ? packageJson.bin
      : packageJson.bin?.expo;

  if (!binPath) {
    die("The installed `expo` package does not expose an `expo` binary.");
  }

  return resolve(dirname(packageJsonPath), binPath);
}

const ip = getTailscaleIPv4();
const expoCliPath = getExpoCliPath();

const env = {
  ...process.env,
  EXPO_PACKAGER_PROXY_URL: `http://${ip}:${PORT}`,
};

console.log(`Starting Expo on Tailscale URL: http://${ip}:${PORT}`);

const child = spawn(
  process.execPath,
  [
    expoCliPath,
    "start",
    "--lan",
    "--port",
    PORT,
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env,
  }
);

child.on("error", (error) => {
  die("Failed to start Expo.", error);
});

child.on("close", (code) => {
  process.exit(code ?? 1);
});
