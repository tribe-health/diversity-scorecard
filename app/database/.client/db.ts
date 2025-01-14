'use client';

import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { vector } from '@electric-sql/pglite/vector';
import { drizzle } from 'drizzle-orm/pglite';
import { tables } from '../schema';
import { runEmbeddedMigrations } from './migrations';
import { DATABASE_CID } from '../constants';

// Export Database type
export type Database = ReturnType<typeof drizzle<typeof tables>>;

let isInitialized = false;
let isInitializing = false;
let db: Database | null = null;
let pglite: PGlite | null = null;

// Constants for IndexedDB
const IDB_NAME = 'diversity_scorecard';
const IDB_STORE_NAME = 'database';
const DB_KEY = 'database';
const VERSION_KEY = 'version';
const CURRENT_DB_VERSION = '1.0.0';

// Export getDB function
export function getDB(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

// Export getPGlite function
export function getPGlite(): PGlite & { live: { query: <T>(query: string, callback: (results: T) => void) => Promise<() => Promise<void>> } } {
  if (!pglite) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  
  const pg = pglite;
  
  // Add live extension to PGlite instance
  const pgliteWithLive = Object.assign(pg, {
    live: {
      query: async <T>(query: string, callback: (results: T) => void) => {
        const unsubscribe = async () => {
          // No-op for now, as PGlite doesn't support unsubscribing yet
        };
        const result = await pg.query(query);
        callback(result as T);
        return unsubscribe;
      }
    }
  });
  
  return pgliteWithLive;
}

// Export initializeDB function
export async function initializeDB(): Promise<void> {
  const result = await initializeDatabase();
  db = result.db;
  pglite = result.pglite;
}

export async function resetDatabase(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Close any existing connections
    if (pglite) {
      pglite.close();
    }

    const deleteRequest = window.indexedDB.deleteDatabase(IDB_NAME);

    deleteRequest.onerror = () => {
      reject(new Error('Failed to delete database'));
    };

    deleteRequest.onsuccess = async () => {
      console.log('IndexedDB database deleted successfully');
      // Reset state
      isInitialized = false;
      isInitializing = false;
      db = null;
      pglite = null;

      try {
        // Reinitialize
        await initializeDB();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
  });
}

// Function to update status
const updateStatus = (status: { status: string; message: string }) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('database-status', { detail: status }));
  }
};

// Function to download database from Pinata
async function downloadFromPinata(): Promise<ArrayBuffer> {
  updateStatus({ 
    status: 'initializing', 
    message: 'Downloading database from Pinata...' 
  });

  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL?.replace(/\/$/, '') || 'https://gateway.pinata.cloud';
  const gatewayKey = process.env.NEXT_PUBLIC_PINATA_GATEWAY_KEY;

  // Debug logging for environment variables
  console.log('Environment check:', {
    hasGatewayUrl: !!process.env.NEXT_PUBLIC_GATEWAY_URL,
    gatewayUrl,
    hasGatewayKey: !!process.env.NEXT_PUBLIC_PINATA_GATEWAY_KEY,
    cid: DATABASE_CID
  });

  const fileUrl = `${gatewayUrl}/ipfs/${DATABASE_CID}${gatewayKey ? `?pinataGatewayToken=${gatewayKey}` : ''}`;
  console.log('Constructed URL:', fileUrl.replace(gatewayKey || '', '[REDACTED]'));

  try {
    console.log('Making fetch request...');
    const response = await fetch(fileUrl, { 
      method: 'GET',
      credentials: 'omit',
      mode: 'cors',
    });

    if (!response.ok) {
      console.error('Pinata download response details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url.replace(gatewayKey || '', '[REDACTED]'),
        type: response.type,
        redirected: response.redirected,
        bodyUsed: response.bodyUsed
      });
      throw new Error(`Failed to download database from Pinata: ${response.status} ${response.statusText}`);
    }

    console.log('Response received:', {
      status: response.status,
      type: response.type,
      redirected: response.redirected
    });

    const buffer = await response.arrayBuffer();
    console.log('Buffer received:', {
      byteLength: buffer.byteLength,
      type: Object.prototype.toString.call(buffer)
    });

    if (!buffer || buffer.byteLength === 0) {
      throw new Error('Received empty response from Pinata');
    }

    console.log('Successfully downloaded database from Pinata');
    return buffer;
  } catch (error) {
    console.error('Pinata download error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

// IndexedDB Manager class
class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(IDB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.createObjectStore(IDB_STORE_NAME);
      };
    });
  }

  async get(key: string): Promise<any> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to get from IndexedDB:', error);
      return null;
    }
  }

  async put(key: string, value: any): Promise<void> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to put to IndexedDB:', error);
    }
  }
}

const idbManager = new IndexedDBManager();

// Function to save database to IndexedDB
async function saveToIndexedDB(buffer: ArrayBuffer) {
  await idbManager.put(DB_KEY, buffer);
  await idbManager.put(VERSION_KEY, CURRENT_DB_VERSION);
}

// Function to load database from IndexedDB
async function loadFromIndexedDB(): Promise<{ buffer: ArrayBuffer | null; version: string | null }> {
  const buffer = await idbManager.get(DB_KEY);
  const version = await idbManager.get(VERSION_KEY);
  return { buffer, version };
}

// Function to check if migrations are needed
async function checkMigrations(currentVersion: string | null): Promise<boolean> {
  if (!currentVersion) return true;
  
  const current = currentVersion.split('.').map(Number);
  const target = CURRENT_DB_VERSION.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (target[i] > (current[i] || 0)) return true;
    if (target[i] < (current[i] || 0)) return false;
  }
  
  return false;
}

// Function to run migrations
async function runMigrations(currentVersion: string | null) {
  try {
    updateStatus({ 
      status: 'initializing', 
      message: 'Running database migrations...' 
    });

    if (!pglite) {
      throw new Error('PGlite instance not initialized');
    }

    const newVersion = await runEmbeddedMigrations(pglite);
    await idbManager.put(VERSION_KEY, newVersion);
    console.log('Migrations completed successfully');
    
    return newVersion;
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

// Function to initialize database
export async function initializeDatabase() {
  // Early return if not in browser
  if (typeof window === 'undefined') {
    console.log('Skipping database initialization on server');
    return { db: null, pglite: null };
  }

  // Check if API routes are available
  try {
    const statusResponse = await fetch('/api/database/status');
    if (!statusResponse.ok) {
      console.log('API routes not available, proceeding with client-side initialization');
    }
  } catch (error) {
    console.log('API routes not available, proceeding with client-side initialization');
  }

  if (isInitialized) {
    return { db, pglite };
  }

  if (isInitializing) {
    updateStatus({ 
      status: 'initializing', 
      message: 'Database initialization in progress...' 
    });
    return { db, pglite };
  }

  try {
    isInitializing = true;
    updateStatus({ 
      status: 'initializing', 
      message: 'Starting database initialization...' 
    });

    let dbBuffer: ArrayBuffer | null = null;
    let storedVersion: string | null = null;

    console.log('Checking IndexedDB for existing database...');
    const result = await loadFromIndexedDB();
    dbBuffer = result.buffer;
    storedVersion = result.version;
    console.log('IndexedDB result:', { 
      hasBuffer: !!dbBuffer, 
      bufferSize: dbBuffer?.byteLength || 0,
      version: storedVersion 
    });

    // If no database in IndexedDB or version mismatch, download from Pinata
    if (!dbBuffer || await checkMigrations(storedVersion)) {
      console.log('Downloading fresh database from Pinata...');
      dbBuffer = await downloadFromPinata();
      console.log('Download complete, buffer size:', dbBuffer.byteLength);
      await saveToIndexedDB(dbBuffer);
      console.log('Database saved to IndexedDB');
      // Set version to current since we just downloaded a fresh database
      storedVersion = CURRENT_DB_VERSION;
    }

    // Verify buffer before initialization
    if (!dbBuffer || dbBuffer.byteLength === 0) {
      throw new Error('Database buffer is empty or invalid');
    }

    console.log('Initializing PGLite with buffer:', {
      bufferSize: dbBuffer.byteLength,
      wasmUrl: '/pglite/pglite.wasm'
    });

    // Initialize PGLite with required extensions
    pglite = await PGlite.create({
      database: 'diversity_scorecard',
      wasmUrl: '/pglite/pglite.wasm',
      wasmBinary: dbBuffer,
      relaxedDurability: true,
      extensions: { live, uuid_ossp, vector }
    });

    // Create extensions
    try {
      await pglite.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      console.log('uuid-ossp extension enabled');

      await pglite.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('vector extension enabled');
    } catch (error) {
      console.error('Failed to enable extensions:', error instanceof Error ? error.message : error);
      throw error;
    }

    console.log('PGLite initialized successfully');

    // Initialize Drizzle
    db = drizzle(pglite, { schema: tables });
    console.log('Drizzle initialized with schema');

    // Always run migrations to ensure tables are created
    await runMigrations(storedVersion);
    console.log('Migrations completed');

    isInitialized = true;
    isInitializing = false;

    updateStatus({ 
      status: 'ready', 
      message: 'Database initialized successfully' 
    });

    return { db, pglite };
  } catch (error: unknown) {
    console.error('Database initialization error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        stack: error.stack
      });
    }
    
    isInitializing = false;
    updateStatus({ 
      status: 'error', 
      message: `Error initializing database: ${error instanceof Error ? error.message : String(error)}` 
    });
    throw error;
  }
}
