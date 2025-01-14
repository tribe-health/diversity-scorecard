import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Scorecard } from '@/database/schema';

// Extend Scorecard type to allow nullable dates
type ScorecardWithNullableDates = Omit<Scorecard, 'createdAt' | 'updatedAt'> & {
  createdAt: Date | null;
  updatedAt: Date | null;
};
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { CircleSlash, CheckCircle2, Calculator, AlertCircle } from 'lucide-react';

interface ScorecardHistoryItemProps {
  item: ScorecardWithNullableDates;
  isSelected: boolean;
  onSelect: () => void;
}

export function ScorecardHistoryItem({ 
  item, 
  isSelected, 
  onSelect 
}: ScorecardHistoryItemProps) {
  const updatedAt = item.updatedAt ? new Date(item.updatedAt) : new Date();

  const getStatusBadge = () => {
    switch (item.status) {
      case 'complete':
        return (
          <Badge variant="outline" className="bg-green-50">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Complete
          </Badge>
        );
      case 'calculating':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            <Calculator className="mr-1 h-3 w-3" />
            Calculating
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700">
            <AlertCircle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      case 'draft':
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50">
            <CircleSlash className="mr-1 h-3 w-3" />
            Draft
          </Badge>
        );
    }
  };

  return (
    <Button
      variant={isSelected ? 'secondary' : 'ghost'}
      className={cn(
        'w-full justify-start text-left font-normal',
        isSelected && 'bg-accent',
        'p-4'
      )}
      onClick={onSelect}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {item.drug}
            </span>
            {getStatusBadge()}
          </div>
          <span className="text-xs text-muted-foreground">
            Last modified: {format(updatedAt, 'MMM d, yyyy')}
          </span>
        </div>
        {item.status === 'complete' && item.grade && (
          <Badge 
            variant="secondary"
            className={cn(
              'text-lg font-bold',
              item.grade === 'A' && 'bg-green-100 text-green-700',
              item.grade === 'B' && 'bg-blue-100 text-blue-700',
              item.grade === 'C' && 'bg-yellow-100 text-yellow-700',
              item.grade === 'D' && 'bg-orange-100 text-orange-700',
              item.grade === 'F' && 'bg-red-100 text-red-700'
            )}
          >
            {item.grade}
          </Badge>
        )}
      </div>
    </Button>
  );
}
