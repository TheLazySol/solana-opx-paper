import { CACHE_VALIDITY_MS } from "@/constants/constants";

interface CachedPrice {
  price: number;
  timestamp: number;
  priceChange24h: number;
}

const priceCache = new Map<string, CachedPrice>();

export const getCachedPrice = (symbol: string): CachedPrice | null => {
  const cached = priceCache.get(symbol);
  if (!cached) return null;

  // Check if cache is still valid
  if (Date.now() - cached.timestamp > CACHE_VALIDITY_MS) {
    priceCache.delete(symbol);
    return null;
  }

  return cached;
};

export const setCachedPrice = (
  symbol: string,
  price: number,
  priceChange24h: number
): void => {
  // Always update the cache with the latest price
  priceCache.set(symbol, {
    price,
    priceChange24h,
    timestamp: Date.now(),
  });
}; 