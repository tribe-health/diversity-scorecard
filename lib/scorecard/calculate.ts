import type { 
  ScorecardInput, 
  ScorecardResult, 
  Grade, 
  DemographicData, 
  DemographicInput, 
  Recommendation 
} from '@/types/scorecard';

import { type Vector, normalize, randomUnitVector, arrayToVector, vectorToArray } from '@/lib/vector-utils';
import type { VectorOps } from '@/hooks/use-vector-ops';

const VECTOR_DIMENSIONS = 384; // Using 384 dimensions for embeddings

/**
 * Generate embedding for text (placeholder - replace with actual embedding model)
 */
async function generateTextEmbedding(): Promise<Vector> {
  return randomUnitVector(VECTOR_DIMENSIONS);
}

/**
 * Generate embedding for a scorecard
 */
async function generateScoreCardEmbedding(input: ScorecardInput, vectorOps: VectorOps): Promise<Vector> {
  // Create a base embedding from the drug name
  const baseEmbedding = await generateTextEmbedding();

  // Combine with demographic embeddings
  const demographicEmbeddings = await Promise.all([
    ...input.demographics.sex.map((d: DemographicInput) => vectorOps.getEmbedding('sex_demographics', d.code)),
    ...input.demographics.age.map((d: DemographicInput) => vectorOps.getEmbedding('age_demographics', d.code)),
    ...input.demographics.race.map((d: DemographicInput) => vectorOps.getEmbedding('race_demographics', d.code)),
    ...input.demographics.ethnicity.map((d: DemographicInput) => vectorOps.getEmbedding('ethnicity_demographics', d.code))
  ]);

  // Combine all embeddings (simple average for now)
  const validEmbeddings = [baseEmbedding, ...demographicEmbeddings.filter((e: Vector | null): e is Vector => e !== null)];
  const combined = validEmbeddings.reduce((acc: Vector, curr: Vector) => {
    const arrA = vectorToArray(curr);
    const arrB = vectorToArray(acc);
    return arrayToVector(arrA.map((val: number, i: number) => val + arrB[i]));
  }, randomUnitVector(VECTOR_DIMENSIONS));

  return normalize(combined);
}

function calculateGrade(average: number): Grade {
  if (average >= 3.25) return 'A';
  if (average >= 2.5) return 'B';
  if (average >= 1.75) return 'C';
  if (average >= 1.0) return 'D';
  return 'F';
}

function calculateDemographicData(inputs: DemographicInput[]): DemographicData {
  const totalPercentage = inputs.reduce((sum, d) => sum + d.percentage, 0);
  const treatmentLevel = 2; // Default to highest level since we don't have numberTreated in DemographicInput

  // Calculate grade based on percentage and treatment level
  let numericGrade = 0;
  if (treatmentLevel === 2) {
    if (totalPercentage >= 90) numericGrade = 4;
    else if (totalPercentage >= 80) numericGrade = 3;
    else if (totalPercentage >= 70) numericGrade = 2;
    else if (totalPercentage >= 60) numericGrade = 1;
  } else if (treatmentLevel === 1) {
    if (totalPercentage >= 90) numericGrade = 3;
    else if (totalPercentage >= 80) numericGrade = 2;
    else if (totalPercentage >= 70) numericGrade = 1;
  }

  const grade = calculateGrade(numericGrade);
  const score = totalPercentage / 100;
  
  return {
    data: inputs.map(d => ({
      name: d.name,
      code: d.code,
      percentage: d.percentage,
      expectedPercentage: d.expectedPercentage,
      numberTreated: d.numberTreated,
      diseaseIncidence: d.diseaseIncidence,
      grade,
      score,
      embedding: randomUnitVector(VECTOR_DIMENSIONS)
    })),
    grade,
    score
  };
}

/**
 * Generate recommendations based on demographic data and similar scorecards
 */
async function generateRecommendations(
  _demographics: {
    sex: DemographicData;
    age: DemographicData;
    race: DemographicData;
    ethnicity: DemographicData;
  },
  _similarScorecards: Array<{ id: string; similarity: number }>
): Promise<Recommendation[]> {
  // TODO: Implement recommendation generation based on:
  // 1. Current demographic scores
  // 2. Similar scorecards' performance
  // 3. Best practices
  return [];
}

export async function calculateScorecard(
  input: ScorecardInput,
  vectorOps: VectorOps
): Promise<ScorecardResult> {
  const demographics = {
    sex: calculateDemographicData(input.demographics.sex),
    age: calculateDemographicData(input.demographics.age),
    race: calculateDemographicData(input.demographics.race),
    ethnicity: calculateDemographicData(input.demographics.ethnicity)
  };

  const scores = [
    demographics.sex.score,
    demographics.age.score,
    demographics.race.score,
    demographics.ethnicity.score
  ];
  const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const overallGrade = calculateGrade(overallScore * 100);

  // Generate embedding and find similar scorecards
  const embedding = await generateScoreCardEmbedding(input, vectorOps);
  const similarRecords = await vectorOps.findSimilar('scorecards', embedding);
  const similarScorecards = similarRecords.map((record: { id: string; similarity?: number }) => ({
    id: record.id,
    similarity: record.similarity || 0
  }));
  const recommendations = await generateRecommendations(demographics, similarScorecards);

  return {
    id: crypto.randomUUID(),
    drug: input.drug,
    demographics,
    overallGrade,
    overallScore,
    embedding,
    recommendations,
    similarScorecards: similarScorecards.map((s: { id: string }) => s.id)
  };
}
