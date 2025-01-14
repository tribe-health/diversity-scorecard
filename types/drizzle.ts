import type { PGlite } from "@electric-sql/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "@/database/.client/schema";

export type DrizzleClient = PgliteDatabase<typeof schema> & {
  $client: PGlite & { vector: unknown };
  schema: typeof schema;
}; 