import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDB, getPGlite } from '@/database/.client/db';
import { PGlite } from '@electric-sql/pglite';
import { type AgeOption, type NewAgeOption, type SexOption, type NewSexOption, type RaceOption, type NewRaceOption, type EthnicityOption, type NewEthnicityOption, ageOptions, sexOptions, raceOptions, ethnicityOptions } from '@/database/schema';

interface LiveQueryResult<T> {
  rows: T[];
  fields: Array<{
    name: string;
    dataTypeID: number;
  }>;
}

// Type for PGlite with live extension
type PGliteWithLive = PGlite & {
  live: {
    query: <T>(query: string, callback: (results: T) => void) => Promise<() => Promise<void>>;
  };
};

interface DemographicState {
  // Age options
  ageOptions: AgeOption[];
  ageLoading: boolean;
  ageError: Error | null;
  ageInitialized: boolean;
  fetchAgeOptions: () => Promise<void>;
  addAgeOption: (option: NewAgeOption) => Promise<void>;

  // Sex options  
  sexOptions: SexOption[];
  sexLoading: boolean;
  sexError: Error | null;
  sexInitialized: boolean;
  fetchSexOptions: () => Promise<void>;
  addSexOption: (option: NewSexOption) => Promise<void>;

  // Race options
  raceOptions: RaceOption[];
  raceLoading: boolean;
  raceError: Error | null;
  raceInitialized: boolean;
  fetchRaceOptions: () => Promise<void>;
  addRaceOption: (option: NewRaceOption) => Promise<void>;

  // Ethnicity options
  ethnicityOptions: EthnicityOption[];
  ethnicityLoading: boolean;
  ethnicityError: Error | null;
  ethnicityInitialized: boolean;
  fetchEthnicityOptions: () => Promise<void>;
  addEthnicityOption: (option: NewEthnicityOption) => Promise<void>;

  // Store initialization
  initializeStore: () => Promise<void>;
}

export const useDemographicStore = create<DemographicState>()(
  persist(
    (set, get) => ({
      // Age options
      ageOptions: [],
      ageLoading: false,
      ageError: null,
      ageInitialized: false,
      fetchAgeOptions: async () => {
        try {
          set({ ageLoading: true, ageError: null });
          const pglite = getPGlite();
          
          // Set up live query
          const unsubscribe = await pglite.live.query<LiveQueryResult<AgeOption>>(
            'SELECT * FROM age_options ORDER BY index',
            (results: LiveQueryResult<AgeOption>) => {
              set({ ageOptions: results.rows, ageInitialized: true });
            }
          );
          
          // Store unsubscribe function for cleanup
          (get() as DemographicState & {
    _ageUnsubscribe?: () => Promise<void>;
  })._ageUnsubscribe = unsubscribe;
        } catch (error) {
          set({ ageError: error as Error });
        } finally {
          set({ ageLoading: false });
        }
      },
      addAgeOption: async (option) => {
        try {
          set({ ageLoading: true, ageError: null });
          const db = getDB();
          await db.insert(ageOptions).values(option); // db is used here
          // Live query will automatically update the state
        } catch (error) {
          set({ ageError: error as Error });
        } finally {
          set({ ageLoading: false });
        }
      },

      // Sex options with similar live query pattern
      sexOptions: [],
      sexLoading: false,
      sexError: null,
      sexInitialized: false,
      fetchSexOptions: async () => {
        try {
          set({ sexLoading: true, sexError: null });
          const db = getDB();
          const pglite = getPGlite();
          
          const unsubscribe = await pglite.live.query<LiveQueryResult<SexOption>>(
            'SELECT * FROM sex_options ORDER BY index',
            (results: LiveQueryResult<SexOption>) => {
              set({ sexOptions: results.rows, sexInitialized: true });
            }
          );
          
          (get() as DemographicState & {
            _sexUnsubscribe?: () => Promise<void>;
          })._sexUnsubscribe = unsubscribe;
        } catch (error) {
          set({ sexError: error as Error });
        } finally {
          set({ sexLoading: false });
        }
      },
      addSexOption: async (option) => {
        try {
          set({ sexLoading: true, sexError: null });
          const db = getDB();
          await db.insert(sexOptions).values(option); // db is used here
        } catch (error) {
          set({ sexError: error as Error });
        } finally {
          set({ sexLoading: false });
        }
      },

      // Race options with live queries
      raceOptions: [],
      raceLoading: false,
      raceError: null,
      raceInitialized: false,
      fetchRaceOptions: async () => {
        try {
          set({ raceLoading: true, raceError: null });
          const pglite = getPGlite();
          
          const unsubscribe = await pglite.live.query<LiveQueryResult<RaceOption>>(
            'SELECT * FROM race_options ORDER BY index',
            (results: LiveQueryResult<RaceOption>) => {
              set({ raceOptions: results.rows, raceInitialized: true });
            }
          );
          
          (get() as DemographicState & {
            _raceUnsubscribe?: () => Promise<void>;
          })._raceUnsubscribe = unsubscribe;
        } catch (error) {
          set({ raceError: error as Error });
        } finally {
          set({ raceLoading: false });
        }
      },
      addRaceOption: async (option) => {
        try {
          set({ raceLoading: true, raceError: null });
          const db = getDB();
          await db.insert(raceOptions).values(option); // db is used here
        } catch (error) {
          set({ raceError: error as Error });
        } finally {
          set({ raceLoading: false });
        }
      },

      // Ethnicity options with live queries
      ethnicityOptions: [],
      ethnicityLoading: false,
      ethnicityError: null,
      ethnicityInitialized: false,
      fetchEthnicityOptions: async () => {
        try {
          set({ ethnicityLoading: true, ethnicityError: null });
          const pglite = getPGlite();
          
          const unsubscribe = await pglite.live.query<LiveQueryResult<EthnicityOption>>(
            'SELECT * FROM ethnicity_options ORDER BY index',
            (results: LiveQueryResult<EthnicityOption>) => {
              set({ ethnicityOptions: results.rows, ethnicityInitialized: true });
            }
          );
          
          (get() as DemographicState & {
            _ethnicityUnsubscribe?: () => Promise<void>;
          })._ethnicityUnsubscribe = unsubscribe;
        } catch (error) {
          set({ ethnicityError: error as Error });
        } finally {
          set({ ethnicityLoading: false });
        }
      },
      addEthnicityOption: async (option) => {
        try {
          set({ ethnicityLoading: true, ethnicityError: null });
          const db = getDB();
          await db.insert(ethnicityOptions).values(option); // db is used here
        } catch (error) {
          set({ ethnicityError: error as Error });
        } finally {
          set({ ethnicityLoading: false });
        }
      },

      // Store initialization - now sets up all live queries
      initializeStore: async () => {
        await Promise.all([
          get().fetchAgeOptions(),
          get().fetchSexOptions(), 
          get().fetchRaceOptions(),
          get().fetchEthnicityOptions()
        ]);
      }
    }),
    {
      name: 'demographic-store',
      partialize: (state) => ({
        ageOptions: state.ageOptions,
        sexOptions: state.sexOptions,
        raceOptions: state.raceOptions,
        ethnicityOptions: state.ethnicityOptions,
      })
    }
  )
);
