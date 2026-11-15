import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadRootEnv() {
  const envMap = {};
  const candidates = [
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, "utf8");
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eqIdx = line.indexOf("=");
        if (eqIdx <= 0) continue;
        const key = line.slice(0, eqIdx).trim();
        const val = line
          .slice(eqIdx + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        if (!(key in envMap)) {
          envMap[key] = val;
        }
      }
    } catch {
      // Ignore read errors
    }
  }
  return envMap;
}

const rootEnv = loadRootEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
  env: {
    NEXT_PUBLIC_API_URL:
      rootEnv.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000",
    NEXT_PUBLIC_VIETQR_BANK_ID:
      rootEnv.VIETQR_BANK_ID ||
      rootEnv.NEXT_PUBLIC_VIETQR_BANK_ID ||
      process.env.NEXT_PUBLIC_VIETQR_BANK_ID ||
      "MB",
    NEXT_PUBLIC_VIETQR_ACCOUNT_NO:
      rootEnv.VIETQR_ACCOUNT_NO ||
      rootEnv.NEXT_PUBLIC_VIETQR_ACCOUNT_NO ||
      process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO ||
      "0000000001",
    NEXT_PUBLIC_VIETQR_ACCOUNT_NAME:
      rootEnv.VIETQR_ACCOUNT_NAME ||
      rootEnv.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME ||
      process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME ||
      "BrewLite",
    NEXT_PUBLIC_VIETQR_TEMPLATE:
      rootEnv.VIETQR_TEMPLATE ||
      rootEnv.NEXT_PUBLIC_VIETQR_TEMPLATE ||
      process.env.NEXT_PUBLIC_VIETQR_TEMPLATE ||
      "compact2",
  },
};

export default nextConfig;