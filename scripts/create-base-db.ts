import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { vector } from '@electric-sql/pglite/vector';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { drizzle } from 'drizzle-orm/pglite';
import type { Database } from '../app/database/.client/db';

async function verifyExtension(client: PGlite, extensionName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = $1
    );
  `, [extensionName]);
  return result.rows[0]?.exists ?? false;
}

async function verifyTable(client: PGlite, tableName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = $1
    );
  `, [tableName]);
  return result.rows[0]?.exists ?? false;
}

async function verifyTableData(client: PGlite, tableName: string): Promise<number> {
  const result = await client.query<{ count: number }>(`
    SELECT COUNT(*) as count FROM ${tableName};
  `);
  return result.rows[0]?.count ?? 0;
}

async function createBaseDatabase() {
  try {
    // Initialize PGLite with required extensions
    const client = new PGlite({
      extensions: { live, uuid_ossp, vector }
    });

    // Create and verify extensions
    console.log('Setting up extensions...');
    
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    if (!await verifyExtension(client, 'uuid-ossp')) {
      throw new Error('Failed to create uuid-ossp extension');
    }
    console.log('uuid-ossp extension enabled and verified');

    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    if (!await verifyExtension(client, 'vector')) {
      throw new Error('Failed to create vector extension');
    }
    console.log('vector extension enabled and verified');

    const db = drizzle(client) as unknown as Database;
    
    // Run initial migration
    const migrationPath = join(process.cwd(), 'app/database/.client/migrations', '0000_initial.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    
    // Execute migration and verify tables
    console.log('Applying initial migration...');
    await client.exec(migrationSql);
    
    // Verify core tables
    const coreTables = ['sex_options', 'age_options', 'race_options', 'ethnicity_options', 'scorecards'];
    for (const table of coreTables) {
      if (!await verifyTable(client, table)) {
        throw new Error(`Failed to create table: ${table}`);
      }
      
      // Log table structure
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1;
      `, [table]);
      console.log(`Table ${table} structure:`, columns.rows);
    }
    console.log('Migration applied and tables verified');

    // Run and verify seeding
    console.log('Seeding database...');
    const seedModule = await import('../app/database/.client/seed');
    await seedModule.default(db);
    
    // Verify seeded data
    for (const table of coreTables) {
      const count = await verifyTableData(client, table);
      console.log(`Table ${table} has ${count} rows`);
      
      if (table.endsWith('_options') && count === 0) {
        throw new Error(`No data found in ${table} after seeding`);
      }
    }
    console.log('Database seeded and verified successfully');

    // Dump database to file
    const file = await client.dumpDataDir("auto");
    const buffer = await file.arrayBuffer();
    writeFileSync(join(process.cwd(), "app/database/snapshots/base.db"), Buffer.from(buffer));
    
    console.log("Base database created and saved to app/database/snapshots/base.db");
  } catch (error) {
    console.error("Error creating base database:", error);
    process.exit(1);
  }
}

createBaseDatabase().catch(console.error);
