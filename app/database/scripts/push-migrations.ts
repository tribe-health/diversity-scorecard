import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { join } from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import * as schema from '../.client/schema';
import { IDBFactory } from 'fake-indexeddb';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const migrationsFolder = join(__dirname, '../.client/migrations');
const DB_NAME = 'diversity-scorecard-dev';

// Initialize the global object for PGlite
if (typeof global.indexedDB === 'undefined') {
  global.indexedDB = new IDBFactory();
}

// Split SQL file into individual statements
function splitSqlStatements(sql: string): string[] {
  // First split by statement-breakpoint
  const blocks = sql.split('--> statement-breakpoint');
  
  // Process each block
  return blocks
    .map(block => {
      // Get all non-empty lines
      const lines = block
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Find all INSERT statements
      const statements: string[] = [];
      let currentStatement = '';

      for (const line of lines) {
        // Skip pure comment lines
        if (line.startsWith('--')) continue;
        
        currentStatement += ' ' + line;
        
        // If we have a complete statement
        if (line.endsWith(';')) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }

      // If we have a pending statement
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim() + ';');
      }

      return statements;
    })
    .flat()
    .filter(statement => statement.length > 0);
}

// Delete IndexedDB database
async function deleteIndexedDB(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = global.indexedDB.deleteDatabase(name);
    request.onerror = () => reject(new Error('Could not delete database'));
    request.onsuccess = () => resolve();
  });
}

async function main() {
  try {
    // Delete existing database
    console.log('Deleting existing database...');
    await deleteIndexedDB(DB_NAME);

    // Create PGlite instance
    const client = await PGlite.create({
      dataDir: `idb://${DB_NAME}`
    });

    // Initialize drizzle with the schema
    drizzle(client, { schema });

    // Read migration files
    console.log('Reading migration files...');
    const files = await fs.readdir(migrationsFolder);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    if (sqlFiles.length === 0) {
      throw new Error('No migration files found');
    }

    // Read and execute each migration file in order
    for (const file of sqlFiles) {
      console.log(`\nProcessing migration file: ${file}`);
      const sql = await fs.readFile(join(migrationsFolder, file), 'utf-8');
      const statements = splitSqlStatements(sql);
      
      console.log(`Found ${statements.length} statements`);
      for (const statement of statements) {
        console.log('\nExecuting statement:');
        console.log(statement);
        await client.query(statement);
      }
    }
    
    // Verify data was inserted
    console.log('\nVerifying data...');
    const tables = ['sex_demographics', 'age_demographics', 'race_demographics', 'ethnicity_demographics'];
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM "${table}"`);
      console.log(`${table} count:`, (result.rows[0] as { count: number }).count);
      
      // Show actual data
      const data = await client.query(`SELECT * FROM "${table}" ORDER BY "index"`);
      console.log(`${table} data:`, data.rows);
    }
    
    console.log('\nMigrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

main();
