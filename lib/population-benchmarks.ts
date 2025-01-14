import type { Grade } from '@/types/scorecard';

interface PopulationBenchmark {
  code: string;
  percentage: number;
}

const POPULATION_BENCHMARKS: Record<string, PopulationBenchmark[]> = {
  sex: [
    { code: 'male', percentage: 49.2 },
    { code: 'female', percentage: 50.8 },
  ],
  age: [
    { code: '18-24', percentage: 12.2 },
    { code: '25-34', percentage: 17.8 },
    { code: '35-44', percentage: 16.4 },
    { code: '45-64', percentage: 33.2 },
    { code: '65+', percentage: 20.4 },
  ],
  race: [
    { code: 'white', percentage: 59.3 },
    { code: 'black', percentage: 13.6 },
    { code: 'asian', percentage: 6.1 },
    { code: 'native', percentage: 1.3 },
    { code: 'pacific', percentage: 0.3 },
    { code: 'biracial', percentage: 2.9 },
    { code: 'other', percentage: 16.5 },
  ],
  ethnicity: [
    { code: 'hispanic', percentage: 18.9 },
    { code: 'non-hispanic', percentage: 81.1 },
  ],
};

export function getExpectedPercentage(category: string, code: string): number {
  const benchmark = POPULATION_BENCHMARKS[category]?.find(b => b.code === code);
  if (!benchmark) {
    throw new Error(`No benchmark found for ${category}/${code}`);
  }
  return benchmark.percentage;
}

export function calculateDiversityScore(actual: number, expected: number): number {
  // Calculate the relative difference between actual and expected
  const difference = Math.abs(actual - expected);
  const maxDifference = Math.max(actual, expected);
  
  // Convert to a score between 0 and 1
  // Perfect match = 1, 50% difference = 0.5, 100% difference = 0
  return Math.max(0, 1 - (difference / maxDifference));
}

export function getDiversityGrade(score: number): Grade {
  if (score >= 0.9) return 'A';
  if (score >= 0.8) return 'B';
  if (score >= 0.7) return 'C';
  if (score >= 0.6) return 'D';
  return 'F';
} 