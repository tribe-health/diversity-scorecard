'use client';

import { useEffect } from 'react';
import { useDemographicStore } from '@/lib/stores/demographic-store';

export function useAgeDemographics() {
  const { ageOptions: options, ageLoading, addAgeOption, fetchAgeOptions } = useDemographicStore();
  
  useEffect(() => {
    // Initial fetch to set up live query
    fetchAgeOptions();

    // No need for polling anymore since we're using live queries
  }, [fetchAgeOptions]);

  return {
    options,
    isLoading: ageLoading,
    addOption: addAgeOption
  };
}
