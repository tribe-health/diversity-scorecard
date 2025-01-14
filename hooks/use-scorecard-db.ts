// src/hooks/use-scorecard-db.ts
import type { ScorecardInput, ScorecardResult, DemographicData, Grade, Recommendation } from '@/types/scorecard';
import { useScorecardStore } from '@/stores/scorecard-store';
import { useDatabase } from '@/providers/database-provider';
import { scorecards } from '@/database/schema';
import { eq } from 'drizzle-orm';
import type { Scorecard } from '@/database/schema';

type ScorecardStatus = 'draft' | 'complete' | 'calculating' | 'error';
import { v4 as uuidv4 } from 'uuid';

export function useScorecardDb() {
  const db = useDatabase();
  const setHistory = useScorecardStore((state) => state.setHistory);

  const loadHistory = async () => {
    if (!db?.db) {
      throw new Error('Database not initialized');
    }
    const results = await db.db.select().from(scorecards).orderBy(scorecards.createdAt);

    setHistory(results.map(row => ({
      id: row.id,
      drug: row.drug,
      status: row.status,
      grade: row.grade,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    })));
  };

  const saveScorecard = async (input: ScorecardInput, result: ScorecardResult) => {
    const scorecard = {
      id: uuidv4(),
      drug: input.drug,
      status: 'complete' as ScorecardStatus,
      grade: result.overallGrade,
      createdAt: new Date(),
      updatedAt: new Date()
    } satisfies typeof scorecards.$inferInsert;

    if (!db?.db) {
      throw new Error('Database not initialized');
    }
    await db.db.insert(scorecards).values(scorecard);
    await loadHistory();
  };

  const saveDraft = async (input: ScorecardInput) => {
    const emptyDemographicData: DemographicData = {
      data: [],
      grade: 'F' as Grade,
      score: 0
    };

    const draft = {
      id: uuidv4(),
      drug: input.drug,
      status: 'draft' as ScorecardStatus,
      grade: 'F' as Grade,
      createdAt: new Date(),
      updatedAt: new Date()
    } satisfies typeof scorecards.$inferInsert;

    if (!db?.db) {
      throw new Error('Database not initialized');
    }
    await db.db.insert(scorecards).values(draft);
    await loadHistory();
  };

  return {
    saveScorecard,
    saveDraft,
    loadHistory,
  };
}
