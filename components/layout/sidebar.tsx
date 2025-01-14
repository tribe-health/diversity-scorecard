'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { useScorecardHistory } from '@/stores/scorecard-store';
import { ScorecardHistoryItem } from '@/components/scorecard/history-item';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { history, selectedItem, selectHistoryItem, initializeLiveQueries, cleanup } = useScorecardHistory();

  useEffect(() => {
    // Initialize live queries when component mounts
    initializeLiveQueries();

    // Clean up live queries when component unmounts
    return () => {
      cleanup().catch(console.error);
    };
  }, [initializeLiveQueries, cleanup]);

  return (
    <aside className={cn('pb-12', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            History
          </h2>
          <ScrollArea className="h-[calc(100vh-10rem)] px-2">
            <div className="space-y-1">
              {history.map((item) => (
                <ScorecardHistoryItem
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  onSelect={() => selectHistoryItem(item.id)}
                />
              ))}
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-2">
                  No scorecard history yet
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </aside>
  );
}
