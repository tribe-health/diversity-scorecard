import type { ScorecardResult } from '@/types/scorecard';

export async function generateScorecardReport(result: ScorecardResult): Promise<string> {
  const response = await fetch('/api/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(result),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate report');
  }

  const { markdown } = await response.json();
  return markdown;
}
