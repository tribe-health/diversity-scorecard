'use client';

import { createContext, useContext } from 'react';
import type { Database } from '@/database/.client/db';

export interface ScorecardService {
  db: Database | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  getMarkdownReport: (scorecardId: string) => Promise<string>;
  generatePDF: (markdown: string) => Promise<Buffer>;
}

export const ScorecardServiceProviderContext = createContext<ScorecardService | null>(null);

export interface ScorecardServiceProviderProps {
  children: React.ReactNode;
  value: ScorecardService;
}

export function useScorecardService() {
  const context = useContext(ScorecardServiceProviderContext);
  if (!context) {
    throw new Error('useScorecardService must be used within a ScorecardServiceProvider');
  }
  return context;
}

export function ScorecardServiceProvider({ children, value }: ScorecardServiceProviderProps) {
  return (
    <ScorecardServiceProviderContext.Provider value={value}>
      {children}
    </ScorecardServiceProviderContext.Provider>
  );
}
