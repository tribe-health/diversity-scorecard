import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './init';

async function resetDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const url = new URL(process.env.DATABASE_URL);
  const dbName = url.pathname.slice(1); // Remove leading slash
  
  // Connect to postgres database to drop/create target database
  const rootUrl = new URL(process.env.DATABASE_URL);
  rootUrl.pathname = '/postgres';
  const rootClient = postgres(rootUrl.toString());

  try {
    console.log(`Dropping database ${dbName} if exists...`);
    await rootClient.unsafe(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
    console.log(`Creating database ${dbName}...`);
    await rootClient.unsafe(`CREATE DATABASE ${dbName}`);
    
    console.log('Database reset complete. Running initialization...');
    await initializeDatabase();
    
    console.log('Database successfully reset and initialized');
  } catch (error) {
    console.error('Failed to reset database:', error);
    throw error;
  } finally {
    await rootClient.end();
  }
}

// ES modules version of running directly
if (import.meta.url === fileURLToPath(import.meta.url)) {
  resetDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Reset failed:', error);
      process.exit(1);
    });
} 