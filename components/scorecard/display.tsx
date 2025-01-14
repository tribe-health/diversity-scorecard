import type { ScorecardResult, DemographicData, Recommendation, Grade } from '@/types/scorecard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ScorecardDisplayProps {
  result: ScorecardResult;
}

export function ScorecardDisplay({ result }: ScorecardDisplayProps) {
  const handleDownloadPDF = async () => {
    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scorecardId: result.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const { url } = await response.json();
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `scorecard-${result.drug}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: 'PDF downloaded successfully',
      });
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Scorecard Results for {result.drug}</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Overall Grade</h2>
          <Badge variant={getGradeVariant(result.overallGrade)} className="text-lg px-4 py-1">
            {result.overallGrade}
          </Badge>
        </div>

        <div className="grid gap-6">
          <DemographicSection
            title="Sex Demographics"
            data={result.demographics.sex}
          />
          <DemographicSection
            title="Age Demographics"
            data={result.demographics.age}
          />
          <DemographicSection
            title="Race Demographics"
            data={result.demographics.race}
          />
          <DemographicSection
            title="Ethnicity Demographics"
            data={result.demographics.ethnicity}
          />
        </div>

        {result.recommendations && result.recommendations.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium mb-2">Recommendations</h3>
            <div className="prose prose-sm max-w-none">
              {result.recommendations.map((rec: Recommendation, index) => (
                <div key={index} className="mb-4 p-4 bg-muted rounded-lg">
                  <p className="font-medium">{rec.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getPriorityVariant(rec.priority)}>
                      {rec.priority}
                    </Badge>
                    <Badge variant={getCategoryVariant(rec.category)}>
                      {rec.category}
                    </Badge>
                  </div>
                  {rec.actionItems && rec.actionItems.length > 0 && (
                    <ul className="mt-2 list-disc list-inside">
                      {rec.actionItems.map((item, idx) => (
                        <li key={idx} className="text-sm">{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DemographicSectionProps {
  title: string;
  data: DemographicData;
}

function DemographicSection({ title, data }: DemographicSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <div className="flex items-center gap-2">
          <Badge variant={getGradeVariant(data.grade)}>
            Grade: {data.grade}
          </Badge>
          <Badge variant="secondary">
            Score: {data.score.toFixed(1)}
          </Badge>
        </div>
      </div>
      <div className="grid gap-4">
        {data.data.map((item, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">{item.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Expected: {item.expectedPercentage.toFixed(1)}%
                </Badge>
                <Badge variant="secondary">
                  Actual: {item.percentage.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getGradeVariant(grade: Grade): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (grade.toUpperCase()) {
    case 'A':
      return 'default';
    case 'B':
      return 'secondary';
    case 'C':
      return 'outline';
    case 'D':
    case 'F':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getPriorityVariant(priority: 'high' | 'medium' | 'low'): 'default' | 'secondary' | 'outline' {
  switch (priority) {
    case 'high':
      return 'secondary';
    case 'medium':
      return 'outline';
    case 'low':
      return 'default';
    default:
      return 'outline';
  }
}

function getCategoryVariant(category: 'sex' | 'age' | 'race' | 'ethnicity'): 'default' | 'secondary' | 'outline' {
  switch (category) {
    case 'sex':
      return 'default';
    case 'age':
      return 'secondary';
    case 'race':
      return 'outline';
    case 'ethnicity':
      return 'default';
    default:
      return 'outline';
  }
}
