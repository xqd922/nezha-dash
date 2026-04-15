import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "lib", "maxmind-db");
const targetDir = path.join(rootDir, "public", "maxmind-db");

if (!existsSync(sourceDir)) {
  console.error(`MaxMind database source directory is missing: ${sourceDir}`);
  process.exit(1);
}

mkdirSync(path.dirname(targetDir), { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true, force: true });
