import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DownloadReportButton } from './download-report-button';
import type { ScorecardResult } from '@/types/scorecard';

interface ScorecardResultCardProps {
  result: ScorecardResult;
}

export function ScorecardResultCard({ result }: ScorecardResultCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Scorecard Results for {result.drug}</CardTitle>
        <DownloadReportButton
          scorecardId={result.id}
          drugName={result.drug}
        />
      </CardHeader>
      <CardContent>
        {/* Existing result display content */}
      </CardContent>
    </Card>
  );
} 