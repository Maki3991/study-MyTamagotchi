import { readFile } from "node:fs/promises";
import path from "node:path";

function parseEnv(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export async function loadEnvironment() {
  const files = [
    path.resolve(process.cwd(), ".env"),
    // Reuse the server-only GMI gateway credentials already configured for
    // Pocket Earth on this machine. A project-local .env always wins.
    "/Users/zhangcheng/Desktop/桌面归档_2026-07-22/Pocket-Earth-GMI/.env",
  ];
  if (process.env.WORLD_ENV_FILE) files.push(path.resolve(process.env.WORLD_ENV_FILE));

  for (const file of files) {
    try {
      const values = parseEnv(await readFile(file, "utf8"));
      for (const [key, value] of Object.entries(values)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}
