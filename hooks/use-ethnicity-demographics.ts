'use client';

import { useEffect } from 'react';
import { useDemographicStore } from '@/lib/stores/demographic-store';

export function useEthnicityDemographics() {
  const { ethnicityOptions, ethnicityLoading, addEthnicityOption, initializeStore } = useDemographicStore();
  
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return {
    options: ethnicityOptions,
    isLoading: ethnicityLoading,
    addOption: addEthnicityOption
  };
}
