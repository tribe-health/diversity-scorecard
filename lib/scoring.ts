import type { ScorecardInput, ScorecardResult, DemographicResult, DemographicInput } from '@/types/scorecard';
import { generateLLMRecommendations } from '@/lib/recommendations/llm-service';
import { getExpectedPercentage } from '@/lib/population-benchmarks';

function calculateDemographicScore(actual: number, expected: number): number {
  const difference = Math.abs(actual - expected);
  if (difference <= 5) return 1.0;
  if (difference <= 10) return 0.8;
  if (difference <= 15) return 0.6;
  if (difference <= 20) return 0.4;
  if (difference <= 25) return 0.2;
  return 0.0;
}

function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 0.9) return 'A';
  if (score >= 0.8) return 'B';
  if (score >= 0.7) return 'C';
  if (score >= 0.6) return 'D';
  return 'F';
}

function calculateDemographicStats(data: DemographicInput[], category: string): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  results: DemographicResult[];
} {
  const results = data.map(d => {
    const expectedPercentage = getExpectedPercentage(category, d.code);
    const score = calculateDemographicScore(d.percentage, expectedPercentage);
    
    return {
      name: d.name,
      code: d.code,
      percentage: d.percentage,
      expectedPercentage,
      numberTreated: d.numberTreated,
      diseaseIncidence: d.diseaseIncidence,
      grade: calculateGrade(score),
      score,
      embedding: [] // Initialize with empty vector
    };
  });
  
  const score = results.map(r => r.score).reduce((a, b) => a + b, 0) / results.length;
  
  return {
    score,
    grade: calculateGrade(score),
    results
  };
}

export async function calculateScorecard(input: ScorecardInput): Promise<ScorecardResult> {
  // Calculate stats for each demographic category
  const sexStats = calculateDemographicStats(input.demographics.sex, 'sex');
  const ageStats = calculateDemographicStats(input.demographics.age, 'age');
  const raceStats = calculateDemographicStats(input.demographics.race, 'race');
  const ethnicityStats = calculateDemographicStats(input.demographics.ethnicity, 'ethnicity');
  
  // Calculate overall score and grade
  const overallScore = (sexStats.score + ageStats.score + raceStats.score + ethnicityStats.score) / 4;
  const overallGrade = calculateGrade(overallScore);
  
  const result: ScorecardResult = {
    id: '',
    drug: input.drug,
    demographics: {
      sex: {
        data: sexStats.results,
        grade: sexStats.grade,
        score: sexStats.score
      },
      age: {
        data: ageStats.results,
        grade: ageStats.grade,
        score: ageStats.score
      },
      race: {
        data: raceStats.results,
        grade: raceStats.grade,
        score: raceStats.score
      },
      ethnicity: {
        data: ethnicityStats.results,
        grade: ethnicityStats.grade,
        score: ethnicityStats.score
      }
    },
    overallGrade,
    overallScore,
    embedding: [], // Initialize with empty vector
    recommendations: [],
    similarScorecards: []
  };

  // Generate LLM-based recommendations
  const llmRecommendations = await generateLLMRecommendations(result);
  result.recommendations = llmRecommendations;

  return result;
}
