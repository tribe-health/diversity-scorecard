import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const scorecards = pgTable('scorecards', {
  id: uuid('id').primaryKey().defaultRandom(),
  drug: text('drug').notNull(),
  status: text('status').notNull(),
  grade: text('grade').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertScorecardSchema = createInsertSchema(scorecards);
export const selectScorecardSchema = createSelectSchema(scorecards);

export type Scorecard = z.infer<typeof selectScorecardSchema>;
export type NewScorecard = z.infer<typeof insertScorecardSchema>;

// Demographic tables
export const ageDemographics = pgTable('age_demographics', {
  id: uuid('id').primaryKey().defaultRandom(),
  scorecardId: uuid('scorecard_id').references(() => scorecards.id),
  data: text('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const ethnicityDemographics = pgTable('ethnicity_demographics', {
  id: uuid('id').primaryKey().defaultRandom(),
  scorecardId: uuid('scorecard_id').references(() => scorecards.id),
  data: text('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const raceDemographics = pgTable('race_demographics', {
  id: uuid('id').primaryKey().defaultRandom(),
  scorecardId: uuid('scorecard_id').references(() => scorecards.id),
  data: text('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sexDemographics = pgTable('sex_demographics', {
  id: uuid('id').primaryKey().defaultRandom(),
  scorecardId: uuid('scorecard_id').references(() => scorecards.id),
  data: text('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const tables = {
  scorecards,
  ageDemographics,
  ethnicityDemographics,
  raceDemographics,
  sexDemographics,
};
