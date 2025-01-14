import { useLiveQuery as useBaseLiveQuery } from '@electric-sql/pglite-react';

export interface QueryResult<T> {
  data: Array<T>;
  isLoading: boolean;
  error: Error | null;
}

export function useLiveQuery<T = Record<string, unknown>>(
  query: string,
  params?: unknown[] | null,
): QueryResult<T> {
  try {
    const data = useBaseLiveQuery<T>(query, params);
    return {
      data: Array.isArray(data) ? data : [],
      isLoading: false,
      error: null
    };
  } catch (error) {
    return {
      data: [],
      isLoading: false,
      error: error instanceof Error ? error : new Error('Unknown error occurred')
    };
  }
}

// Template literal version
useLiveQuery.sql = useBaseLiveQuery.sql;
