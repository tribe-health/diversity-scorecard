-- Create vector support tables
CREATE TABLE IF NOT EXISTS vector_dims (
  table_name text NOT NULL,
  column_name text NOT NULL,
  dimensions integer NOT NULL,
  PRIMARY KEY (table_name, column_name)
);

CREATE TABLE IF NOT EXISTS vector_comparison (
  vector1 vector,
  vector2 vector,
  similarity float8
);

-- Create scorecard status enum
DO $$ BEGIN
  CREATE TYPE scorecard_status AS ENUM ('draft', 'calculating', 'complete', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create options tables
CREATE TABLE IF NOT EXISTS age_options (
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

CREATE TABLE IF NOT EXISTS sex_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  embedding vector
);

CREATE TABLE IF NOT EXISTS race_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  embedding vector
);

CREATE TABLE IF NOT EXISTS ethnicity_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  embedding vector
);

-- Create main scorecards table
CREATE TABLE IF NOT EXISTS scorecards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug text NOT NULL,
  status scorecard_status DEFAULT 'draft',
  grade text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  embedding vector
);

-- Create demographic tables
CREATE TABLE IF NOT EXISTS age_demographics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scorecard_id uuid REFERENCES scorecards(id) NOT NULL,
  age_group text NOT NULL,
  percentage integer NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sex_demographics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scorecard_id uuid REFERENCES scorecards(id) NOT NULL,
  sex text NOT NULL,
  percentage integer NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS race_demographics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scorecard_id uuid REFERENCES scorecards(id) NOT NULL,
  race text NOT NULL,
  percentage integer NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ethnicity_demographics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scorecard_id uuid REFERENCES scorecards(id) NOT NULL,
  ethnicity text NOT NULL,
  percentage integer NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scorecards_status ON scorecards(status);
CREATE INDEX IF NOT EXISTS idx_scorecards_drug ON scorecards(drug);
CREATE INDEX IF NOT EXISTS idx_scorecards_created_at ON scorecards(created_at);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_scorecards_updated_at ON scorecards;
CREATE TRIGGER update_scorecards_updated_at
    BEFORE UPDATE ON scorecards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_age_options_updated_at ON age_options;
CREATE TRIGGER update_age_options_updated_at
    BEFORE UPDATE ON age_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_sex_options_updated_at ON sex_options;
CREATE TRIGGER update_sex_options_updated_at
    BEFORE UPDATE ON sex_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_race_options_updated_at ON race_options;
CREATE TRIGGER update_race_options_updated_at
    BEFORE UPDATE ON race_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_ethnicity_options_updated_at ON ethnicity_options;
CREATE TRIGGER update_ethnicity_options_updated_at
    BEFORE UPDATE ON ethnicity_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Add vector dimension check function
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

-- Create vector dimension check triggers
DROP TRIGGER IF EXISTS check_age_options_vector_dims ON age_options;
CREATE TRIGGER check_age_options_vector_dims
    BEFORE INSERT OR UPDATE ON age_options
    FOR EACH ROW
    WHEN (NEW.embedding IS NOT NULL)
    EXECUTE FUNCTION vector_dimension_check();

DROP TRIGGER IF EXISTS check_sex_options_vector_dims ON sex_options;
CREATE TRIGGER check_sex_options_vector_dims
    BEFORE INSERT OR UPDATE ON sex_options
    FOR EACH ROW
    WHEN (NEW.embedding IS NOT NULL)
    EXECUTE FUNCTION vector_dimension_check();

DROP TRIGGER IF EXISTS check_race_options_vector_dims ON race_options;
CREATE TRIGGER check_race_options_vector_dims
    BEFORE INSERT OR UPDATE ON race_options
    FOR EACH ROW
    WHEN (NEW.embedding IS NOT NULL)
    EXECUTE FUNCTION vector_dimension_check();

DROP TRIGGER IF EXISTS check_ethnicity_options_vector_dims ON ethnicity_options;
CREATE TRIGGER check_ethnicity_options_vector_dims
    BEFORE INSERT OR UPDATE ON ethnicity_options
    FOR EACH ROW
    WHEN (NEW.embedding IS NOT NULL)
    EXECUTE FUNCTION vector_dimension_check();

DROP TRIGGER IF EXISTS check_scorecards_vector_dims ON scorecards;
CREATE TRIGGER check_scorecards_vector_dims
    BEFORE INSERT OR UPDATE ON scorecards
    FOR EACH ROW
    WHEN (NEW.embedding IS NOT NULL)
    EXECUTE FUNCTION vector_dimension_check();
