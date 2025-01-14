-- Vector support tables
CREATE TABLE IF NOT EXISTS vector_dims (
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  PRIMARY KEY (table_name, column_name)
);

CREATE TABLE IF NOT EXISTS vector_comparison (
  vector1 TEXT,
  vector2 TEXT
);

-- Create scorecard status enum type
CREATE TYPE scorecard_status AS ENUM (
  'draft',
  'calculating', 
  'complete',
  'error'
);

-- Create demographic tables with optimized column ordering and constraints
CREATE TABLE IF NOT EXISTS age_demographics (
  id TEXT PRIMARY KEY,
  index INTEGER NOT NULL DEFAULT 0 CHECK (index >= 0),
  range_start INTEGER,
  range_end INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  embedding TEXT,
  CHECK (range_start < range_end)
);

CREATE TABLE IF NOT EXISTS ethnicity_demographics (
  id TEXT PRIMARY KEY,
  index INTEGER NOT NULL DEFAULT 0 CHECK (index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  embedding TEXT
);

CREATE TABLE IF NOT EXISTS race_demographics (
  id TEXT PRIMARY KEY,
  index INTEGER NOT NULL DEFAULT 0 CHECK (index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  embedding TEXT
);

CREATE TABLE IF NOT EXISTS sex_demographics (
  id TEXT PRIMARY KEY,
  index INTEGER NOT NULL DEFAULT 0 CHECK (index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  embedding TEXT
);

CREATE TABLE IF NOT EXISTS scorecards (
  id TEXT PRIMARY KEY,
  status scorecard_status NOT NULL DEFAULT 'draft',
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  drug TEXT NOT NULL,
  demographics JSONB,
  overall_grade TEXT,
  benchmarks JSONB,
  population_levels JSONB,
  treatment_levels JSONB,
  relative_differences JSONB,
  disease_incidence JSONB,
  statistics JSONB,
  recommendations JSONB,
  references JSONB,
  markdown_report TEXT,
  error_message TEXT,
  embedding TEXT
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for scorecards
CREATE TRIGGER update_scorecards_updated_at
  BEFORE UPDATE ON scorecards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Register vector dimensions
INSERT INTO vector_dims (table_name, column_name, dimensions)
SELECT 'age_demographics', 'embedding', 1536
WHERE NOT EXISTS (
  SELECT 1 FROM vector_dims 
  WHERE table_name = 'age_demographics' AND column_name = 'embedding'
);

INSERT INTO vector_dims (table_name, column_name, dimensions)
SELECT 'ethnicity_demographics', 'embedding', 1536
WHERE NOT EXISTS (
  SELECT 1 FROM vector_dims 
  WHERE table_name = 'ethnicity_demographics' AND column_name = 'embedding'
);

INSERT INTO vector_dims (table_name, column_name, dimensions)
SELECT 'race_demographics', 'embedding', 1536
WHERE NOT EXISTS (
  SELECT 1 FROM vector_dims 
  WHERE table_name = 'race_demographics' AND column_name = 'embedding'
);

INSERT INTO vector_dims (table_name, column_name, dimensions)
SELECT 'sex_demographics', 'embedding', 1536
WHERE NOT EXISTS (
  SELECT 1 FROM vector_dims 
  WHERE table_name = 'sex_demographics' AND column_name = 'embedding'
);

INSERT INTO vector_dims (table_name, column_name, dimensions)
SELECT 'scorecards', 'embedding', 1536
WHERE NOT EXISTS (
  SELECT 1 FROM vector_dims 
  WHERE table_name = 'scorecards' AND column_name = 'embedding'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_age_demographics_embedding 
ON age_demographics(embedding);

CREATE INDEX IF NOT EXISTS idx_ethnicity_demographics_embedding 
ON ethnicity_demographics(embedding);

CREATE INDEX IF NOT EXISTS idx_race_demographics_embedding 
ON race_demographics(embedding);

CREATE INDEX IF NOT EXISTS idx_sex_demographics_embedding 
ON sex_demographics(embedding);

CREATE INDEX IF NOT EXISTS idx_scorecards_embedding 
ON scorecards(embedding);

-- Create index on demographics JSONB
CREATE INDEX IF NOT EXISTS idx_scorecards_demographics 
ON scorecards USING gin (demographics);

-- Note: Vector distance calculation will be handled in application code
-- instead of using recursive CTEs for better performance 