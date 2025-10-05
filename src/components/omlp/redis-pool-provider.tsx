'use client'

import React, { createContext, useContext, useEffect } from 'react';
import { useRedisPoolInitialization } from '@/hooks/useRedisPoolInitialization';
import { RedisPoolData } from '@/lib/redis/omlp-pool-service';
import { createPriceSyncInterval } from '@/lib/redis/pool-price-sync';
import { useAssetPrice } from '@/context/asset-price-provider';

interface RedisPoolContextType {
  pools: RedisPoolData[];
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
  refetchPools: () => Promise<void>;
}

const RedisPoolContext = createContext<RedisPoolContextType | null>(null);

export function useRedisPools() {
  const context = useContext(RedisPoolContext);
  if (!context) {
    throw new Error('useRedisPools must be used within RedisPoolProvider');
  }
  return context;
}

interface RedisPoolProviderProps {
  children: React.ReactNode;
}

export function RedisPoolProvider({ children }: RedisPoolProviderProps) {
  const { pools, isLoading, isInitialized, error, refetch } = useRedisPoolInitialization();
  const { prices } = useAssetPrice();
  
  // Set up price sync interval
  useEffect(() => {
    if (!isInitialized) return;
    
    // Transform prices object to simple Record<string, number>
    const getSimplePrices = () => {
      return Object.entries(prices).reduce((acc, [asset, data]) => {
        acc[asset] = data.price;
        return acc;
      }, {} as Record<string, number>);
    };
    
    const cleanup = createPriceSyncInterval(
      getSimplePrices,
      10000 // Sync every 10 seconds
    );
    
    return cleanup;
  }, [isInitialized, prices]);
  
  const contextValue: RedisPoolContextType = {
    pools,
    isLoading,
    isInitialized,
    error,
    refetchPools: refetch,
  };
  
  return (
    <RedisPoolContext.Provider value={contextValue}>
      {children}
    </RedisPoolContext.Provider>
  );
}
