import 'dotenv/config';
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import { readdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workersPath = __dirname;

const files = readdirSync(workersPath).filter(
  (file) =>
    file !== "index.ts" &&
    file !== "index.js" &&
    (file.endsWith(".ts") || file.endsWith(".js"))
);

console.log("[WORKERS] Loading workers...");

for (const file of files) {
  const filePath = path.join(workersPath, file);
  import(pathToFileURL(filePath).href)
    .then(() => console.log(`[WORKERS] Loaded ${file}`))
    .catch((err) =>
      console.error(`[WORKERS] Failed to load ${file}`, err)
    );
}
