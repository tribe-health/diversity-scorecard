// src/stores/scorecard-store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { ScorecardInput, ScorecardResult } from '@/types/scorecard';
import type { Scorecard } from '@/database/.client/schema';
import { getDB, getPGlite } from '@/database/.client/db';
import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';

type ScorecardStatus = 'new' | 'calculating' | 'calculated' | 'error' | 'viewing';

interface LiveQueryResult<T> {
  rows: Array<{
    id: string;
    drug: string;
    status: string;
    grade: string;
    created_at: string;
    updated_at: string;
  }>;
  fields: Array<{
    name: string;
    dataTypeID: number;
  }>;
}

// Type for PGlite with live extension
type PGliteWithLive = PGlite & {
  live: {
    query: <T>(query: string, callback: (results: LiveQueryResult<T>) => void) => Promise<() => Promise<void>>;
  };
};

interface ScorecardState {
  // History state
  history: Scorecard[];
  historyLoading: boolean;
  historyError: Error | null;
  historyInitialized: boolean;

  // Current scorecard state
  currentInput: ScorecardInput | null;
  currentResult: ScorecardResult | null;
  status: ScorecardStatus;
  selectedHistoryId: string | null;
  isSaving: boolean;
  isPdfGenerating: boolean;
  pdfUrl: string | null;
  _unsubscribeHistory?: () => Promise<void>;
}

interface ScorecardActions {
  setCurrentInput: (input: ScorecardInput | null) => void;
  setCurrentResult: (result: ScorecardResult | null) => void;
  setStatus: (status: ScorecardStatus) => void;
  setHistory: (history: Scorecard[]) => void;
  selectHistoryItem: (id: string | null) => void;
  setSaving: (isSaving: boolean) => void;
  setError: (error: Error | null) => void;
  setPdfGenerating: (isGenerating: boolean) => void;
  setPdfUrl: (url: string | null) => void;
  reset: () => void;
  initializeStore: () => Promise<void>;
  cleanup: () => Promise<void>;
}

type ScorecardStore = ScorecardState & ScorecardActions;

const initialState: ScorecardState = {
  // History state
  history: [],
  historyLoading: false,
  historyError: null,
  historyInitialized: false,

  // Current scorecard state
  currentInput: null,
  currentResult: null,
  status: 'new',
  selectedHistoryId: null,
  isSaving: false,
  isPdfGenerating: false,
  pdfUrl: null,
};

export const useScorecardStore = create<ScorecardStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      setCurrentInput: (input: ScorecardInput | null) =>
        set((state) => {
          state.currentInput = input;
          if (input) {
            state.status = 'new';
          }
        }),

      setCurrentResult: (result: ScorecardResult | null) =>
        set((state) => {
          state.currentResult = result;
          if (result) {
            state.status = 'calculated';
          }
        }),

      setStatus: (status: ScorecardStatus) =>
        set((state) => {
          state.status = status;
        }),

      setHistory: (history: Scorecard[]) =>
        set((state) => {
          state.history = history;
        }),

      selectHistoryItem: (id: string | null) =>
        set((state) => {
          state.selectedHistoryId = id;
          state.currentResult = null;
          state.pdfUrl = null;
          state.isPdfGenerating = false;
          if (id) {
            state.status = 'viewing';
          } else {
            state.status = 'new';
          }
        }),

      setSaving: (isSaving: boolean) =>
        set((state) => {
          state.isSaving = isSaving;
        }),

      setError: (error: Error | null) =>
        set((state) => {
          state.historyError = error;
        }),

      setPdfGenerating: (isGenerating: boolean) =>
        set((state) => {
          state.isPdfGenerating = isGenerating;
        }),

      setPdfUrl: (url: string | null) =>
        set((state) => {
          state.pdfUrl = url;
        }),

      reset: () =>
        set((state) => {
          Object.assign(state, initialState);
        }),

      initializeStore: async () => {
        try {
          set((state) => {
            state.historyLoading = true;
            state.historyError = null;
          });

          const pg = getPGlite();
          
          // Set up live query for scorecards
          const unsubscribe = await pg.live.query<LiveQueryResult<Scorecard>>(
            'SELECT * FROM scorecards ORDER BY created_at DESC',
            (results: LiveQueryResult<Scorecard>) => {
              const scorecards = results.rows.map(row => ({
                id: row.id,
                drug: row.drug,
                status: row.status,
                grade: row.grade,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
              }));
              
              set((state) => {
                state.history = scorecards;
                state.historyInitialized = true;
              });
            }
          );

          // Store unsubscribe function for cleanup
          set((state) => {
            state._unsubscribeHistory = unsubscribe;
          });
        } catch (error) {
          set((state) => {
            state.historyError = error as Error;
          });
        } finally {
          set((state) => {
            state.historyLoading = false;
          });
        }
      },

      cleanup: async () => {
        const state = get();
        if (state._unsubscribeHistory) {
          await state._unsubscribeHistory();
        }
      }
    })),
    {
      name: 'scorecard-store',
      partialize: (state) => ({
        history: state.history,
        historyInitialized: state.historyInitialized
      })
    }
  )
);

export function useScorecardHistory() {
  const history = useScorecardStore((state) => state.history);
  const selectedId = useScorecardStore((state) => state.selectedHistoryId);
  const setHistory = useScorecardStore((state) => state.setHistory);
  const selectHistoryItem = useScorecardStore((state) => state.selectHistoryItem);
  const status = useScorecardStore((state) => state.status);
  const historyLoading = useScorecardStore((state) => state.historyLoading);
  const historyError = useScorecardStore((state) => state.historyError);
  const historyInitialized = useScorecardStore((state) => state.historyInitialized);
  const initializeStore = useScorecardStore((state) => state.initializeStore);
  const cleanup = useScorecardStore((state) => state.cleanup);

  const selectedItem = history.find((item) => item.id === selectedId);
  const isViewing = status === 'viewing';
  const setError = useScorecardStore((state) => state.setError);

  return {
    history,
    selectedItem,
    selectedId,
    isViewing,
    historyLoading,
    historyError,
    historyInitialized,
    setHistory,
    selectHistoryItem,
    initializeStore,
    cleanup,
    setError,
  };
}

export function useCurrentScorecard() {
  const currentInput = useScorecardStore((state) => state.currentInput);
  const currentResult = useScorecardStore((state) => state.currentResult);
  const status = useScorecardStore((state) => state.status);
  const isSaving = useScorecardStore((state) => state.isSaving);
  const setCurrentInput = useScorecardStore((state) => state.setCurrentInput);
  const setCurrentResult = useScorecardStore((state) => state.setCurrentResult);
  const setStatus = useScorecardStore((state) => state.setStatus);
  const setSaving = useScorecardStore((state) => state.setSaving);
  const reset = useScorecardStore((state) => state.reset);

  const isNew = status === 'new';
  const isCalculating = status === 'calculating';
  const isCalculated = status === 'calculated';
  const hasError = status === 'error';

  return {
    currentInput,
    currentResult,
    status,
    isNew,
    isCalculating,
    isCalculated,
    hasError,
    isSaving,
    setCurrentInput,
    setCurrentResult,
    setStatus,
    setSaving,
    reset,
  };
}

export function useScorecardPdf() {
  const isPdfGenerating = useScorecardStore((state) => state.isPdfGenerating);
  const pdfUrl = useScorecardStore((state) => state.pdfUrl);
  const setPdfGenerating = useScorecardStore((state) => state.setPdfGenerating);
  const setPdfUrl = useScorecardStore((state) => state.setPdfUrl);
  const status = useScorecardStore((state) => state.status);

  const canGeneratePdf = status === 'calculated' || status === 'viewing';

  return {
    isPdfGenerating,
    pdfUrl,
    canGeneratePdf,
    setPdfGenerating,
    setPdfUrl,
  };
}

export function useScorecardStatus() {
  const status = useScorecardStore((state) => state.status);
  const setStatus = useScorecardStore((state) => state.setStatus);
  const historyError = useScorecardStore((state) => state.historyError);
  const historyLoading = useScorecardStore((state) => state.historyLoading);

  return {
    status,
    setStatus,
    error: historyError,
    isLoading: historyLoading,
    isNew: status === 'new',
    isCalculating: status === 'calculating',
    isCalculated: status === 'calculated',
    isViewing: status === 'viewing',
    hasError: status === 'error',
    canEdit: status === 'new' || status === 'error',
    canCalculate: status === 'new' && !historyLoading,
    canGeneratePdf: (status === 'calculated' || status === 'viewing') && !historyLoading,
  };
}
