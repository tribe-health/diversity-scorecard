import { useLiveIncrementalQuery as useBaseLiveIncrementalQuery } from '@electric-sql/pglite-react';

export interface IncrementalQueryResult<T> {
  data: Array<T>;
  isLoading: boolean;
  error: Error | null;
}

export function useLiveIncrementalQuery<T = Record<string, unknown>>(
  query: string,
  params: unknown[] | null | undefined,
  key: string
): IncrementalQueryResult<T> {
  try {
    const data = useBaseLiveIncrementalQuery<T>(query, params, key);
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
