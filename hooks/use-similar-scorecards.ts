import { useCallback } from 'react';
import type { 
  ScorecardResult, 
  DemographicResults, 
  Grade, 
  Recommendation 
} from '@/types/scorecard';
import { useVectorOps } from './use-vector-ops';
import type { Vector } from '@/lib/vector-utils';
import { getEmbeddings } from '@/lib/embeddings';

export function useSimilarScorecards() {
  const { findSimilar } = useVectorOps();

  const findSimilarScorecards = useCallback(async (query: string): Promise<ScorecardResult[]> => {
    try {
      // Get embedding from API
      const embedding = await getEmbeddings(query);
      if (!embedding || embedding.length === 0) {
        console.warn('No embedding generated for query');
        return [];
      }

      // Find similar scorecards using vector operations
      const results = await findSimilar('scorecards', embedding as Vector);
      
      // Map VectorRecord to ScorecardResult
      return results.map(record => ({
        id: record.id as string,
        drug: record.drug as string,
        demographics: record.demographics as DemographicResults,
        overallGrade: record.grade as Grade,
        overallScore: record.score as number,
        embedding: record.embedding as Vector,
        recommendations: record.recommendations as Recommendation[] || [],
        similarScorecards: record.similar_scorecards as string[] || []
      }));
    } catch (error) {
      console.error('Error finding similar scorecards:', error);
      return [];
    }
  }, [findSimilar]);

  return { findSimilarScorecards };
}
