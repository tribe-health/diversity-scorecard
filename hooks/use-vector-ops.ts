import { getDB } from '@/database/.client/db';
import { cosineSimilarity, type Vector } from '@/lib/vector-utils';
import { sql } from 'drizzle-orm';

export interface VectorRecord {
  id: string;
  embedding: Vector;
  similarity?: number;
  [key: string]: unknown;
}

export interface VectorOps {
  findSimilar: (tableName: string, embedding: Vector, limit?: number, threshold?: number) => Promise<VectorRecord[]>;
  storeVectorDimensions: (tableName: string, columnName: string, dimensions: number) => Promise<void>;
  getVectorDimensions: (tableName: string, columnName: string) => Promise<number | null>;
  compareVectors: (vector1: Vector, vector2: Vector) => Promise<number>;
  updateEmbedding: (tableName: string, id: string, embedding: Vector) => Promise<void>;
  getEmbedding: (tableName: string, id: string) => Promise<Vector | null>;
}

export function useVectorOps(): VectorOps {
  const getDbClient = async () => {
    const db = await getDB();
    if (!db) throw new Error('Database not initialized');
    return db;
  };

  /**
   * Find similar items in a table using vector similarity
   */
  async function findSimilar(
    tableName: string,
    embedding: Vector,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<VectorRecord[]> {
    const db = await getDbClient();
    const query = sql.raw(`SELECT *, '[${embedding}]'::vector <=> embedding as similarity 
       FROM ${tableName} 
       WHERE embedding IS NOT NULL
       ORDER BY similarity DESC
       LIMIT ${limit}`);
    
    const results = await db.execute(query);
    
    // Filter results by threshold and add calculated similarity
    return (Array.isArray(results) ? results : []).filter((row: VectorRecord) => {
      const similarity = cosineSimilarity(embedding, row.embedding);
      row.similarity = similarity;
      return similarity >= threshold;
    });
  }

  /**
   * Store vector dimensions for a table column
   */
  async function storeVectorDimensions(
    tableName: string,
    columnName: string,
    dimensions: number
  ): Promise<void> {
    const db = await getDbClient();
    const query = sql.raw(`INSERT INTO vector_dims (table_name, column_name, dimensions)
       VALUES ('${tableName}', '${columnName}', ${dimensions})
       ON CONFLICT (table_name, column_name) DO UPDATE
       SET dimensions = ${dimensions}`);
       
    await db.execute(query);
  }

  /**
   * Get vector dimensions for a table column
   */
  async function getVectorDimensions(
    tableName: string,
    columnName: string
  ): Promise<number | null> {
    const db = await getDbClient();
    const query = sql.raw(`SELECT dimensions FROM vector_dims
       WHERE table_name = '${tableName}' AND column_name = '${columnName}'`);
       
    const result = await db.execute(query);
    return Array.isArray(result) && result.length > 0 ? result[0].dimensions : null;
  }

  /**
   * Compare two vectors and store the result
   */
  async function compareVectors(vector1: Vector, vector2: Vector): Promise<number> {
    const db = await getDbClient();
    const similarity = cosineSimilarity(vector1, vector2);
    
    const query = sql.raw(`INSERT INTO vector_comparison (vector1, vector2, similarity)
       VALUES ('[${vector1}]'::vector, '[${vector2}]'::vector, ${similarity})`);
       
    await db.execute(query);
    return similarity;
  }

  /**
   * Update embedding for a record
   */
  async function updateEmbedding(
    tableName: string,
    id: string,
    embedding: Vector
  ): Promise<void> {
    const db = await getDbClient();
    const query = sql.raw(`UPDATE ${tableName}
       SET embedding = '[${embedding}]'::vector
       WHERE id = '${id}'`);
       
    await db.execute(query);
  }

  /**
   * Get embedding for a record
   */
  async function getEmbedding(
    tableName: string,
    id: string
  ): Promise<Vector | null> {
    const db = await getDbClient();
    const query = sql.raw(`SELECT embedding FROM ${tableName}
       WHERE id = '${id}'`);
       
    const result = await db.execute(query);
    return Array.isArray(result) && result.length > 0 ? result[0].embedding : null;
  }

  return {
    findSimilar,
    storeVectorDimensions,
    getVectorDimensions,
    compareVectors,
    updateEmbedding,
    getEmbedding,
  };
}
