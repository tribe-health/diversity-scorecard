'use client';

import { useEffect } from 'react';
import { useDemographicStore } from '@/lib/stores/demographic-store';

export function useSexDemographics() {
  const { sexOptions, sexLoading, addSexOption, initializeStore } = useDemographicStore();
  
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return {
    options: sexOptions,
    isLoading: sexLoading,
    addOption: addSexOption
  };
}
