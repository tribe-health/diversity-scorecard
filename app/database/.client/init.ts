import { readFileSync } from 'fs';
import { join } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Database } from './db';

export async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client) as unknown as Database;

  try {
    // Run initial migration
    const migrationPath = join(process.cwd(), 'app/database/.client/migrations', '0000_initial.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    await client.unsafe(migrationSql);
    console.log('Applied initial migration');

    // Run seeding
    const { default: seed } = await import('./seed');
    await seed(db);
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  } finally {
    await client.end();
  }
} 