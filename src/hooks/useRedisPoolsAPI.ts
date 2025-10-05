import { useEffect, useState, useRef, useCallback } from 'react';
import { RedisPoolData } from '@/lib/redis/omlp-pool-service';
import { useAssetPriceInfo } from '@/context/asset-price-provider';

interface UseRedisPoolsAPIReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  pools: RedisPoolData[];
  refetch: () => Promise<void>;
}

export function useRedisPoolsAPI(): UseRedisPoolsAPIReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pools, setPools] = useState<RedisPoolData[]>([]);
  const initializationRef = useRef(false);
  
  // Get SOL price from the asset price provider
  const { price: solPrice } = useAssetPriceInfo('SOL');

  const fetchPools = async () => {
    try {
      const response = await fetch('/api/pools');
      if (!response.ok) {
        throw new Error('Failed to fetch pools');
      }
      const data = await response.json();
      setPools(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch pools:', err);
      throw err;
    }
  };

  const initializePools = async () => {
    // Prevent multiple initialization attempts
    if (initializationRef.current) return;
    initializationRef.current = true;
    
    try {
      setIsLoading(true);
      setError(null);

      // Wait for SOL price to be available
      if (solPrice > 0) {
        // Try to fetch existing pools first
        try {
          const existingPools = await fetchPools();
          if (existingPools.length > 0) {
            setIsInitialized(true);
            return;
          }
        } catch (fetchError) {
          console.log('No existing pools, initializing defaults...');
        }

        // Initialize default pools if none exist
        const response = await fetch('/api/pools', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assetPrices: { SOL: solPrice }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to initialize pools');
        }

        const initializedPools = await response.json();
        setPools(initializedPools);
        setIsInitialized(true);
      } else {
        // If price not available yet, we'll retry when it becomes available
        initializationRef.current = false;
      }
    } catch (err) {
      console.error('Failed to initialize pools:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      initializationRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      await fetchPools();
    } catch (err) {
      console.error('Failed to fetch pools:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch pools'));
    } finally {
      setIsLoading(false);
    }
  }, []);

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
