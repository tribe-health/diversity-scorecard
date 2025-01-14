import { Database } from './db';
import { tables } from '../schema';

export const seed = async (db: Database) => {
  // Seed age options
  await db.insert(tables.ageOptions).values([
    { name: '0-17', code: 'pediatric', index: 0, startAge: 0, endAge: 17 },
    { name: '18-64', code: 'adult', index: 1, startAge: 18, endAge: 64 },
    { name: '65+', code: 'elderly', index: 2, startAge: 65, endAge: 120 }
  ]);

  // Seed sex options
  await db.insert(tables.sexOptions).values([
    { name: 'Male', code: 'male', index: 0 },
    { name: 'Female', code: 'female', index: 1 },
    { name: 'Other', code: 'other', index: 2 }
  ]);

  // Seed race options
  await db.insert(tables.raceOptions).values([
    { name: 'White', code: 'white', index: 0 },
    { name: 'Black or African American', code: 'black', index: 1 },
    { name: 'Asian', code: 'asian', index: 2 },
    { name: 'American Indian or Alaska Native', code: 'native', index: 3 },
    { name: 'Native Hawaiian or Other Pacific Islander', code: 'pacific', index: 4 },
    { name: 'Other', code: 'other', index: 5 }
  ]);

  // Seed ethnicity options
  await db.insert(tables.ethnicityOptions).values([
    { name: 'Hispanic or Latino', code: 'hispanic', index: 0 },
    { name: 'Not Hispanic or Latino', code: 'not_hispanic', index: 1 },
    { name: 'Unknown', code: 'unknown', index: 2 }
  ]);

  // Create a sample scorecard
  const [scorecard] = await db.insert(tables.scorecards).values({
    drug: 'Sample Drug',
    status: 'draft',
    grade: 'B'
  }).returning();

  // Add sample demographics
  await db.insert(tables.ageDemographics).values([
    { scorecardId: scorecard.id, ageGroup: 'pediatric', percentage: 20 },
    { scorecardId: scorecard.id, ageGroup: 'adult', percentage: 60 },
    { scorecardId: scorecard.id, ageGroup: 'elderly', percentage: 20 }
  ]);

  await db.insert(tables.sexDemographics).values([
    { scorecardId: scorecard.id, sex: 'male', percentage: 48 },
    { scorecardId: scorecard.id, sex: 'female', percentage: 52 }
  ]);

  await db.insert(tables.raceDemographics).values([
    { scorecardId: scorecard.id, race: 'white', percentage: 60 },
    { scorecardId: scorecard.id, race: 'black', percentage: 20 },
    { scorecardId: scorecard.id, race: 'asian', percentage: 15 },
    { scorecardId: scorecard.id, race: 'other', percentage: 5 }
  ]);

  await db.insert(tables.ethnicityDemographics).values([
    { scorecardId: scorecard.id, ethnicity: 'hispanic', percentage: 18 },
    { scorecardId: scorecard.id, ethnicity: 'not_hispanic', percentage: 82 }
  ]);
}

export default seed;
