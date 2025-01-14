'use client';

import { useState } from 'react';
import { getEmbeddings, getMultipleEmbeddings } from '@/lib/embeddings';

export function useEmbeddings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const embed = async (text: string) => {
    try {
      setLoading(true);
      setError(null);
      return await getEmbeddings(text);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get embeddings'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const embedMultiple = async (texts: string[]) => {
    try {
      setLoading(true);
      setError(null);
      return await getMultipleEmbeddings(texts);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get embeddings'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    embed,
    embedMultiple,
    loading,
    error
  };
} 