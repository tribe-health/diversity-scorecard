/**
 * This is the configuration for the client-side database.
 */

import { defineConfig } from "drizzle-kit";

const base = "./app/database/.client";
export const migrationsFolder = `${base}/migrations`;

export default defineConfig({
  dialect: "postgresql",
  schema: `${base}/schema.ts`,
  out: migrationsFolder,
  verbose: true,
  migrations: { 
    prefix: "timestamp"
  },
});
