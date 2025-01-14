'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useScorecardHistory } from '@/stores/scorecard-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCallback } from 'react';

export function ScorecardList() {
  const {
    history,
    selectedId: selectedHistoryId,
    selectHistoryItem,
    historyLoading,
    historyInitialized,
  } = useScorecardHistory();

  const handleSelect = useCallback((id: string) => {
    selectHistoryItem(id);
  }, [selectHistoryItem]);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold mb-4">History</h2>
        <ScrollArea className="h-[calc(100vh-200px)]">
          {historyLoading && !historyInitialized ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((scorecard) => (
              <Button
                key={scorecard.id}
                variant={selectedHistoryId === scorecard.id ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleSelect(scorecard.id)}
              >
                <div className="truncate text-left">
                  <div className="font-medium">{scorecard.drug}</div>
                  <div className="text-sm text-muted-foreground">
                    {(scorecard.createdAt ? new Date(scorecard.createdAt) : new Date()).toLocaleDateString()}
                  </div>
                </div>
              </Button>
              ))}
              {history.length === 0 && historyInitialized && (
                <div className="text-center text-muted-foreground p-4">
                  No scorecards yet
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </Card>
  );
}
