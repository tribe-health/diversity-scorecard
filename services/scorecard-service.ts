import { calculateScorecard } from '@/lib/scorecard/calculate';
import { generateScorecardReport } from '@/lib/report/generate-report';
import type { ScorecardInput, ScorecardResult } from '@/types/scorecard';
import type { VectorOps } from '@/hooks/use-vector-ops';
import { initializeDB, getDB } from "@/database/.client/db";

let dbInitialized = false;

async function ensureDBInitialized() {
  if (!dbInitialized) {
    await initializeDB();
    dbInitialized = true;
  }
  return getDB();
}

export async function calculateAndSaveScorecard(
  input: ScorecardInput,
  vectorOps: VectorOps
): Promise<ScorecardResult> {
    const db = await ensureDBInitialized();
    
    const result = await calculateScorecard(input, vectorOps);
    
    // Generate the markdown report
    const markdownReport = await generateScorecardReport(result);
    
    // Save the scorecard with the report
    await db.$client.query(`
      INSERT INTO scorecards (
        drug_name,
        sex_demographics,
        age_demographics,
        race_demographics,
        ethnicity_demographics,
        overall_grade,
        sex_diversity_score,
        age_diversity_score,
        race_diversity_score,
        ethnicity_diversity_score,
        overall_score,
        embedding,
        recommendations,
        similar_scorecards,
        markdown_report
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
    `, [
      result.drug,
      JSON.stringify(result.demographics.sex),
      JSON.stringify(result.demographics.age),
      JSON.stringify(result.demographics.race),
      JSON.stringify(result.demographics.ethnicity),
      result.overallGrade,
      result.demographics.sex.score,
      result.demographics.age.score,
      result.demographics.race.score,
      result.demographics.ethnicity.score,
      result.overallScore,
      JSON.stringify(result.embedding),
      JSON.stringify(result.recommendations),
      JSON.stringify(result.similarScorecards),
      markdownReport
    ]);
  
    return result;
  }
  
  export async function generatePDF(scorecardId: string): Promise<Uint8Array> {
    // First get the markdown report
    const markdown = await getMarkdownReport(scorecardId);
    
    const response = await fetch('/api/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ markdown, scorecardId }),
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate PDF');
    }
  
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
  
  // Function to retrieve markdown report for a scorecard
  export async function getMarkdownReport(scorecardId: string): Promise<string> {
    const db = await ensureDBInitialized();
    
    const result = await db.$client.query<{ markdown_report: string }>(`
      SELECT markdown_report FROM scorecards WHERE id = $1
    `, [scorecardId]);
    
    if (result.rows.length === 0) {
      throw new Error('Scorecard not found');
    }
    
    return result.rows[0].markdown_report;
  }
  
  export class ScorecardService {
    private vectorOps: VectorOps;

    constructor(vectorOps: VectorOps) {
      this.vectorOps = vectorOps;
    }

    async calculateAndSaveScorecard(input: ScorecardInput): Promise<ScorecardResult> {
      return calculateAndSaveScorecard(input, this.vectorOps);
    }

    async generatePDF(scorecardId: string): Promise<Uint8Array> {
      return generatePDF(scorecardId);
    }

    async getMarkdownReport(scorecardId: string): Promise<string> {
      return getMarkdownReport(scorecardId);
    }
  }
