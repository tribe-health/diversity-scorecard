'use client';

import { useEffect } from 'react';
import { useDemographicStore } from '@/lib/stores/demographic-store';

export function useRaceDemographics() {
  const { raceOptions, raceLoading, addRaceOption, initializeStore } = useDemographicStore();
  
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return {
    options: raceOptions,
    isLoading: raceLoading,
    addOption: addRaceOption
  };
}
