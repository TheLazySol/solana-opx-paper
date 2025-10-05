'use client'

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useRedisPoolsAPI } from '@/hooks/useRedisPoolsAPI';
import { RedisPoolData } from '@/lib/redis/omlp-pool-service';
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
  const { pools, isLoading, isInitialized, error, refetch } = useRedisPoolsAPI();
  const { prices } = useAssetPrice();
  
  // Enhanced refetch that forces a fresh fetch
  const forceRefetch = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Force refetch failed:', error);
    }
  }, [refetch]);
  
  // Auto-refresh on mount when initialized
  useEffect(() => {
    if (isInitialized) {
      // Force a refresh when the provider is first initialized
      forceRefetch();
    }
  }, [isInitialized, forceRefetch]);
  
  // Price sync function that updates pools via API
  const syncPrices = useCallback(async () => {
    if (!isInitialized || pools.length === 0) return;
    
    // Update each pool's price via API
    for (const pool of pools) {
      const currentPrice = prices[pool.asset]?.price;
      
      if (currentPrice && currentPrice !== pool.assetPrice) {
        try {
          await fetch('/api/pools/update-price', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              poolId: pool.poolId,
              price: currentPrice,
            }),
          });
          console.log(`Updated ${pool.asset} pool price: ${pool.assetPrice} -> ${currentPrice}`);
        } catch (error) {
          console.error(`Failed to update price for ${pool.asset}:`, error);
        }
      }
    }
    
    // Refetch pools to get updated data
    await refetch();
  }, [isInitialized, pools, prices, refetch]);
  
  // Set up price sync interval
  useEffect(() => {
    if (!isInitialized) return;
    
    const interval = setInterval(syncPrices, 10000); // Sync every 10 seconds
    
    return () => clearInterval(interval);
  }, [isInitialized, syncPrices]);
  
  const contextValue: RedisPoolContextType = {
    pools,
    isLoading,
    isInitialized,
    error,
    refetchPools: forceRefetch, // Use the enhanced refetch function
  };
  
  return (
    <RedisPoolContext.Provider value={contextValue}>
      {children}
    </RedisPoolContext.Provider>
  );
}
