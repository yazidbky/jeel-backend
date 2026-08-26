import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import pool from "./connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

export const runMigrations = async () => {
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".js"))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const moduleUrl = pathToFileURL(filePath).href;
    const migration = (await import(moduleUrl)).default;

    if (!migration || !migration.up) {
      throw new Error(`Invalid migration export in ${file}`);
    }

    await pool.query(migration.up);
    console.log(`✓ Applied migration: ${migration.name || file}`);
  }
};
