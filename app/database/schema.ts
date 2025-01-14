import { pgTable, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const scorecards = pgTable('scorecards', {
  id: uuid('id').primaryKey().defaultRandom(),
  drug: text('drug').notNull(),
  status: text('status').notNull(),
  grade: text('grade').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertScorecardSchema = createInsertSchema(scorecards);
export const selectScorecardSchema = createSelectSchema(scorecards);

export type Scorecard = z.infer<typeof selectScorecardSchema>;
export type NewScorecard = z.infer<typeof insertScorecardSchema>;

// Demographic option tables
export const ageOptions = pgTable('age_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  index: integer('index').notNull(),
  startAge: integer('start_age').notNull(),
  endAge: integer('end_age').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertAgeOptionSchema = createInsertSchema(ageOptions);
export const selectAgeOptionSchema = createSelectSchema(ageOptions);

export type AgeOption = z.infer<typeof selectAgeOptionSchema>;
export type NewAgeOption = z.infer<typeof insertAgeOptionSchema>;

// Demographic tables
export const ageDemographics = pgTable('age_demographics', {
  id: uuid('id').primaryKey().defaultRandom(),
  scorecardId: uuid('scorecard_id').references(() => scorecards.id).notNull(),
  ageGroup: text('age_group').notNull(),
  percentage: integer('percentage').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ethnicityDemographics = pgTable('ethnicity_demographics', {
  id: uuid('id').primaryKey().defaultRandom(),
  scorecardId: uuid('scorecard_id').references(() => scorecards.id).notNull(),
  ethnicity: text('ethnicity').notNull(),
  percentage: integer('percentage').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const raceDemographics = pgTable('race_demographics', {
  id: uuid('id').primaryKey().defaultRandom(),
  scorecardId: uuid('scorecard_id').references(() => scorecards.id).notNull(),
  race: text('race').notNull(),
  percentage: integer('percentage').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sexDemographics = pgTable('sex_demographics', {
  id: uuid('id').primaryKey().defaultRandom(),
  scorecardId: uuid('scorecard_id').references(() => scorecards.id).notNull(),
  sex: text('sex').notNull(),
  percentage: integer('percentage').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sex options table
export const sexOptions = pgTable('sex_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  index: integer('index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertSexOptionSchema = createInsertSchema(sexOptions);
export const selectSexOptionSchema = createSelectSchema(sexOptions);

export type SexOption = z.infer<typeof selectSexOptionSchema>;
export type NewSexOption = z.infer<typeof insertSexOptionSchema>;

// Race options table
export const raceOptions = pgTable('race_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  index: integer('index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertRaceOptionSchema = createInsertSchema(raceOptions);
export const selectRaceOptionSchema = createSelectSchema(raceOptions);

export type RaceOption = z.infer<typeof selectRaceOptionSchema>;
export type NewRaceOption = z.infer<typeof insertRaceOptionSchema>;

// Ethnicity options table
export const ethnicityOptions = pgTable('ethnicity_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  index: integer('index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertEthnicityOptionSchema = createInsertSchema(ethnicityOptions);
export const selectEthnicityOptionSchema = createSelectSchema(ethnicityOptions);

export type EthnicityOption = z.infer<typeof selectEthnicityOptionSchema>;
export type NewEthnicityOption = z.infer<typeof insertEthnicityOptionSchema>;

// Export all tables as a single object
export const tables = {
  scorecards,
  ageDemographics,
  ethnicityDemographics,
  raceDemographics,
  sexDemographics,
  ageOptions,
  sexOptions,
  raceOptions,
  ethnicityOptions,
}; 