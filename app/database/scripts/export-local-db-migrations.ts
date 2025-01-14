#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readMigrationFiles } from "drizzle-orm/migrator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const file = join(__dirname, "../.client/migrations/export.json");

async function exportMigrations() {
  try {
    const migrations = readMigrationFiles({
      migrationsFolder: join(__dirname, "../.client/migrations")
    });

    await writeFile(
      file,
      JSON.stringify(migrations, null, 2),
      { flag: "w" }
    );
    
    console.log('Migration export completed successfully');
  } catch (error) {
    console.error('Failed to export migrations:', error);
    process.exit(1);
  }
}

exportMigrations();
