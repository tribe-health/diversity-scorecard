import type { Vector } from '../lib/vector-utils';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type DiseaseIncidence = 'Increased' | 'Similar' | 'Decreased';

export interface DemographicInput {
  code: string;
  name: string;
  percentage: number;
  expectedPercentage: number;
  numberTreated: number;
  diseaseIncidence: DiseaseIncidence;
}

export interface DemographicResult extends DemographicInput {
  score: number;
  grade: Grade;
  embedding: Vector;
}

export interface DemographicData {
  data: DemographicResult[];
  grade: Grade;
  score: number;
}

export interface Demographics {
  sex: DemographicInput[];
  age: DemographicInput[];
  race: DemographicInput[];
  ethnicity: DemographicInput[];
}

export interface DemographicResults {
  sex: DemographicData;
  age: DemographicData;
  race: DemographicData;
  ethnicity: DemographicData;
}

export interface ScorecardInput {
  drug: string;
  totalParticipants: number;
  demographics: Demographics;
}

export interface Recommendation {
  category: 'sex' | 'age' | 'race' | 'ethnicity';
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
}

export interface ScorecardResult {
  id: string;
  drug: string;
  demographics: DemographicResults;
  overallGrade: Grade;
  overallScore: number;
  embedding: Vector;
  recommendations: Recommendation[];
  similarScorecards: string[];
}
