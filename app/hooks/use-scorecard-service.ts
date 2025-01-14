'use client';

import { useContext } from 'react';
import { ScorecardServiceProviderContext } from '@/providers/service-provider';

export function useScorecardService() {
  const context = useContext(ScorecardServiceProviderContext);
  if (!context) {
    throw new Error('useScorecardService must be used within a ScorecardServiceProvider');
  }
  return context;
} 