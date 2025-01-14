'use client';

import type { PGlite } from '@electric-sql/pglite';

// Create tables and initialize database
export async function runEmbeddedMigrations(pglite: PGlite): Promise<string> {
  try {
    // Verify required extensions
    console.log('Verifying required extensions...');
    
    const uuidExtension = await verifyExtension(pglite, 'uuid-ossp');
    if (!uuidExtension) {
      console.log('Creating uuid-ossp extension...');
      await pglite.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      if (!await verifyExtension(pglite, 'uuid-ossp')) {
        throw new Error('Failed to create uuid-ossp extension');
      }
    }
    console.log('uuid-ossp extension verified');

    const vectorExtension = await verifyExtension(pglite, 'vector');
    if (!vectorExtension) {
      console.log('Creating vector extension...');
      await pglite.query('CREATE EXTENSION IF NOT EXISTS vector;');
      if (!await verifyExtension(pglite, 'vector')) {
        throw new Error('Failed to create vector extension');
      }
    }
    console.log('vector extension verified');

    // Check and create vector support tables
    await ensureTable(pglite, 'vector_dims', `
      CREATE TABLE vector_dims (
        table_name text NOT NULL,
        column_name text NOT NULL,
        dimensions integer NOT NULL,
        PRIMARY KEY (table_name, column_name)
      );
    `);

    await ensureTable(pglite, 'vector_comparison', `
      CREATE TABLE vector_comparison (
        vector1 vector,
        vector2 vector,
        similarity float8
      );
    `);

    // Create scorecard status enum if it doesn't exist
    await pglite.query(`
      DO $$ BEGIN
        CREATE TYPE scorecard_status AS ENUM ('draft', 'calculating', 'complete', 'error');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Check and create options tables
    await ensureTable(pglite, 'age_options', `
      CREATE TABLE age_options (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name text NOT NULL,
        code text NOT NULL UNIQUE,
        index integer NOT NULL DEFAULT 0,
        start_age integer NOT NULL,
        end_age integer NOT NULL,
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        embedding vector
      );
    `);
    await ensureTableData(pglite, 'age_options', [
      `INSERT INTO age_options (name, code, index, start_age, end_age) VALUES ('0-17', 'pediatric', 0, 0, 17);`,
      `INSERT INTO age_options (name, code, index, start_age, end_age) VALUES ('18-64', 'adult', 1, 18, 64);`,
      `INSERT INTO age_options (name, code, index, start_age, end_age) VALUES ('65+', 'elderly', 2, 65, 120);`
    ]);

    await ensureTable(pglite, 'sex_options', `
      CREATE TABLE sex_options (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name text NOT NULL,
        code text NOT NULL UNIQUE,
        index integer NOT NULL DEFAULT 0,
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        embedding vector
      );
    `);
    await ensureTableData(pglite, 'sex_options', [
      `INSERT INTO sex_options (name, code, index) VALUES ('Male', 'male', 0);`,
      `INSERT INTO sex_options (name, code, index) VALUES ('Female', 'female', 1);`,
      `INSERT INTO sex_options (name, code, index) VALUES ('Other', 'other', 2);`
    ]);

    await ensureTable(pglite, 'race_options', `
      CREATE TABLE race_options (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name text NOT NULL,
        code text NOT NULL UNIQUE,
        index integer NOT NULL DEFAULT 0,
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        embedding vector
      );
    `);
    await ensureTableData(pglite, 'race_options', [
      `INSERT INTO race_options (name, code, index) VALUES ('White', 'white', 0);`,
      `INSERT INTO race_options (name, code, index) VALUES ('Black or African American', 'black', 1);`,
      `INSERT INTO race_options (name, code, index) VALUES ('Asian', 'asian', 2);`,
      `INSERT INTO race_options (name, code, index) VALUES ('American Indian or Alaska Native', 'native', 3);`,
      `INSERT INTO race_options (name, code, index) VALUES ('Native Hawaiian or Other Pacific Islander', 'pacific', 4);`,
      `INSERT INTO race_options (name, code, index) VALUES ('Other', 'other', 5);`
    ]);

    await ensureTable(pglite, 'ethnicity_options', `
      CREATE TABLE ethnicity_options (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name text NOT NULL,
        code text NOT NULL UNIQUE,
        index integer NOT NULL DEFAULT 0,
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        embedding vector
      );
    `);
    await ensureTableData(pglite, 'ethnicity_options', [
      `INSERT INTO ethnicity_options (name, code, index) VALUES ('Hispanic or Latino', 'hispanic', 0);`,
      `INSERT INTO ethnicity_options (name, code, index) VALUES ('Not Hispanic or Latino', 'not_hispanic', 1);`,
      `INSERT INTO ethnicity_options (name, code, index) VALUES ('Unknown', 'unknown', 2);`
    ]);

    // Check and create main scorecards table
    await ensureTable(pglite, 'scorecards', `
      CREATE TABLE scorecards (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        drug text NOT NULL,
        status scorecard_status DEFAULT 'draft',
        grade text NOT NULL,
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        embedding vector
      );
    `);

    // Check and create demographic tables
    await ensureTable(pglite, 'age_demographics', `
      CREATE TABLE age_demographics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        scorecard_id uuid REFERENCES scorecards(id) NOT NULL,
        age_group text NOT NULL,
        percentage integer NOT NULL,
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await ensureTable(pglite, 'sex_demographics', `
      CREATE TABLE sex_demographics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        scorecard_id uuid REFERENCES scorecards(id) NOT NULL,
        sex text NOT NULL,
        percentage integer NOT NULL,
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await ensureTable(pglite, 'race_demographics', `
      CREATE TABLE race_demographics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        scorecard_id uuid REFERENCES scorecards(id) NOT NULL,
        race text NOT NULL,
        percentage integer NOT NULL,
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await ensureTable(pglite, 'ethnicity_demographics', `
      CREATE TABLE ethnicity_demographics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        scorecard_id uuid REFERENCES scorecards(id) NOT NULL,
        ethnicity text NOT NULL,
        percentage integer NOT NULL,
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await pglite.query(`CREATE INDEX IF NOT EXISTS idx_scorecards_status ON scorecards(status);`);
    await pglite.query(`CREATE INDEX IF NOT EXISTS idx_scorecards_drug ON scorecards(drug);`);
    await pglite.query(`CREATE INDEX IF NOT EXISTS idx_scorecards_created_at ON scorecards(created_at);`);

    // Add updated_at trigger function
    await pglite.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at
    await ensureTrigger(pglite, 'update_scorecards_updated_at', 'scorecards', 'update_updated_at');
    await ensureTrigger(pglite, 'update_age_options_updated_at', 'age_options', 'update_updated_at');
    await ensureTrigger(pglite, 'update_sex_options_updated_at', 'sex_options', 'update_updated_at');
    await ensureTrigger(pglite, 'update_race_options_updated_at', 'race_options', 'update_updated_at');
    await ensureTrigger(pglite, 'update_ethnicity_options_updated_at', 'ethnicity_options', 'update_updated_at');

    // Add vector dimension check function
    await pglite.query(`
      CREATE OR REPLACE FUNCTION vector_dimension_check() 
      RETURNS TRIGGER AS $$
      BEGIN
        IF array_length(NEW.embedding::float[], 1) != (
          SELECT dimensions 
          FROM vector_dims 
          WHERE table_name = TG_TABLE_NAME 
          AND column_name = 'embedding'
        ) THEN
          RAISE EXCEPTION 'Vector dimension mismatch';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create vector dimension check triggers
    await ensureVectorTrigger(pglite, 'check_age_options_vector_dims', 'age_options');
    await ensureVectorTrigger(pglite, 'check_sex_options_vector_dims', 'sex_options');
    await ensureVectorTrigger(pglite, 'check_race_options_vector_dims', 'race_options');
    await ensureVectorTrigger(pglite, 'check_ethnicity_options_vector_dims', 'ethnicity_options');
    await ensureVectorTrigger(pglite, 'check_scorecards_vector_dims', 'scorecards');

    return '1.0.0';
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

async function verifyExtension(pglite: PGlite, extensionName: string): Promise<boolean> {
  try {
    const result = await pglite.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = $1
      );
    `, [extensionName]);
    return result.rows[0]?.exists ?? false;
  } catch (error) {
    console.error(`Error verifying extension ${extensionName}:`, error);
    return false;
  }
}

async function ensureTable(pglite: PGlite, tableName: string, createSql: string): Promise<void> {
  try {
    const exists = await checkTableExists(pglite, tableName);
    if (!exists) {
      console.log(`Creating table ${tableName}...`);
      await pglite.query(createSql);
      
      // Verify table was created
      const verified = await checkTableExists(pglite, tableName);
      if (!verified) {
        throw new Error(`Failed to create table ${tableName}`);
      }
      
      // Verify table structure
      const columns = await pglite.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1;
      `, [tableName]);
      console.log(`Table ${tableName} structure:`, columns.rows);
      
      console.log(`Created and verified table ${tableName}`);
    } else {
      console.log(`Table ${tableName} already exists`);
    }
  } catch (error) {
    console.error(`Error ensuring table ${tableName}:`, error);
    throw error;
  }
}

async function ensureTableData(pglite: PGlite, tableName: string, insertSqls: string[]): Promise<void> {
  try {
    const hasData = await checkTableHasData(pglite, tableName);
    if (!hasData) {
      console.log(`Seeding data for ${tableName}...`);
      for (const sql of insertSqls) {
        await pglite.query(sql);
        
        // Verify the data was inserted by checking the count
        const result = await pglite.query<{ count: number }>(`
          SELECT COUNT(*) as count 
          FROM ${tableName} 
          WHERE created_at >= NOW() - INTERVAL '1 minute'
        `);
        
        if (result.rows[0]?.count === 0) {
          throw new Error(`Failed to insert data into ${tableName}`);
        }
      }
      
      // Log the inserted data for verification
      const data = await pglite.query(`SELECT * FROM ${tableName} ORDER BY index`);
      console.log(`${tableName} data:`, data.rows);
      console.log(`Successfully seeded ${data.rows.length} rows in ${tableName}`);
    } else {
      // Log existing data for verification
      const data = await pglite.query(`SELECT * FROM ${tableName} ORDER BY index`);
      console.log(`${tableName} already has ${data.rows.length} rows:`, data.rows);
    }
  } catch (error) {
    console.error(`Error ensuring data for table ${tableName}:`, error);
    throw error;
  }
}

async function ensureTrigger(pglite: PGlite, triggerName: string, tableName: string, functionName: string): Promise<void> {
  try {
    await pglite.query(`DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName};`);
    await pglite.query(`
      CREATE TRIGGER ${triggerName}
          BEFORE UPDATE ON ${tableName}
          FOR EACH ROW
          EXECUTE FUNCTION ${functionName}();
    `);
  } catch (error) {
    console.error(`Error ensuring trigger ${triggerName}:`, error);
    throw error;
  }
}

async function ensureVectorTrigger(pglite: PGlite, triggerName: string, tableName: string): Promise<void> {
  try {
    await pglite.query(`DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName};`);
    await pglite.query(`
      CREATE TRIGGER ${triggerName}
          BEFORE INSERT OR UPDATE ON ${tableName}
          FOR EACH ROW
          WHEN (NEW.embedding IS NOT NULL)
          EXECUTE FUNCTION vector_dimension_check();
    `);
  } catch (error) {
    console.error(`Error ensuring vector trigger ${triggerName}:`, error);
    throw error;
  }
}

async function checkTableExists(pglite: PGlite, tableName: string): Promise<boolean> {
  try {
    const result = await pglite.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      );
    `, [tableName]);
    return result.rows[0]?.exists ?? false;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

async function checkTableHasData(pglite: PGlite, tableName: string): Promise<boolean> {
  try {
    const result = await pglite.query<{ count: number }>(`
      SELECT COUNT(*) as count FROM ${tableName};
    `);
    return (result.rows[0]?.count ?? 0) > 0;
  } catch (error) {
    console.error(`Error checking if table ${tableName} has data:`, error);
    return false;
  }
}
