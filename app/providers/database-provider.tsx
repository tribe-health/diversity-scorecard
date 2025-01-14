'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initializeDatabase, getDB } from '@/database/.client/db';
import type { Database } from '@/database/.client/db';

type DatabaseContextType = {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  db: Database | null;
};

const DatabaseContext = createContext<DatabaseContextType>({
  isInitialized: false,
  isLoading: true,
  error: null,
  db: null,
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DatabaseContextType>({
    isInitialized: false,
    isLoading: true,
    error: null,
    db: null,
  });

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        setState({
          isInitialized: true,
          isLoading: false,
          error: null,
          db: getDB(),
        });
      } catch (error) {
        setState({
          isInitialized: false,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
          db: null,
        });
      }
    }

    init();
  }, []);

  return (
    <DatabaseContext.Provider value={state}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}
