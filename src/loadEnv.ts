import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/** Load .env into process.env if present. Does not override existing vars. */
export function loadEnv(cwd = process.cwd()): void {
  const path = resolve(cwd, ".env");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}



// We can use the dotenv package to load the .env file  and set the process.env variables.
// Here, we manually read the .env file and set the process.env variables ourselves.
