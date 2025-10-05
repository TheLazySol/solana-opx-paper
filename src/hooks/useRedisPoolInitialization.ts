import { useEffect, useState, useRef } from 'react';
import { initializeDefaultPools, getAllPools, RedisPoolData } from '@/lib/redis/omlp-pool-service';
import { initializeRedisClient, checkRedisHealth } from '@/lib/redis/redis-client';
import { useAssetPriceInfo } from '@/context/asset-price-provider';

interface UseRedisPoolInitializationReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  pools: RedisPoolData[];
  refetch: () => Promise<void>;
}

export function useRedisPoolInitialization(): UseRedisPoolInitializationReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pools, setPools] = useState<RedisPoolData[]>([]);
  const initializationRef = useRef(false);
  
  // Get SOL price from the asset price provider
  const { price: solPrice } = useAssetPriceInfo('SOL');

  const initializePools = async () => {
    // Prevent multiple initialization attempts
    if (initializationRef.current) return;
    initializationRef.current = true;
    
    try {
      setIsLoading(true);
      setError(null);

      // Initialize Redis client
      await initializeRedisClient();
      
      // Check Redis health
      const isHealthy = await checkRedisHealth();
      if (!isHealthy) {
        throw new Error('Redis connection is not healthy');
      }

      // Wait for SOL price to be available
      if (solPrice > 0) {
        // Initialize default pools with current asset prices
        await initializeDefaultPools({ SOL: solPrice });
        
        // Fetch all pools
        const allPools = await getAllPools();
        setPools(allPools);
        
        setIsInitialized(true);
      } else {
        // If price not available yet, we'll retry when it becomes available
        initializationRef.current = false;
      }
    } catch (err) {
      console.error('Failed to initialize Redis pools:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      initializationRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    try {
      setIsLoading(true);
      const allPools = await getAllPools();
      setPools(allPools);
    } catch (err) {
      console.error('Failed to fetch pools:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch pools'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialize pools when SOL price becomes available
    if (solPrice > 0 && !isInitialized && !isLoading) {
      initializePools();
    }
  }, [solPrice, isInitialized, isLoading]);

  return {
    isInitialized,
    isLoading,
    error,
    pools,
    refetch,
  };
}
