import { BirdeyePriceResponse } from '@/types/birdeye'
import { TOKENS } from '@/constants/token-list/token-list'

// Base URL for the Birdeye API endpoints
const BIRDEYE_API_URL = 'https://public-api.birdeye.so/defi'

// Timestamp of the last API call for rate limiting
let lastFetchTime = 0;
// Minimum time between API calls in milliseconds (to respect rate limits)
const MIN_API_CALL_INTERVAL = 1000; // 1 second

// Cache for token prices to avoid redundant API calls
interface PriceCache {
  [tokenSymbol: string]: {
    price: number;
    priceChange24h: number;
    timestamp: number;
    humanTime: string;
    fetchedAt: number;
  }
}

const priceCache: PriceCache = {};
// Cache expiration time in milliseconds
const CACHE_EXPIRATION = 5000; // 5 seconds

/**
 * Clears the price cache for all tokens or a specific token
 * @param tokenSymbol - Optional. If provided, only clears cache for that token
 */
export function clearPriceCache(tokenSymbol?: string) {
  if (tokenSymbol) {
    delete priceCache[tokenSymbol];
  } else {
    Object.keys(priceCache).forEach(key => delete priceCache[key]);
  }
}

/**
 * Fetches the price of a token from the Birdeye API.
 * 
 * This function makes a request to the Birdeye API to get the price of a token
 * on the Solana blockchain. It also retrieves the 24-hour price change and
 * the timestamp of the last update.
 * 
 * Rate limiting is implemented to prevent hitting API limits, with a minimum delay
 * between requests defined by MIN_API_CALL_INTERVAL.
 * 
 * @param tokenSymbol - The symbol of the token (e.g., 'SOL', 'USDC').
 * @returns {Promise<{ price: number, priceChange24h: number, timestamp: number, humanTime: string } | null>} 
 * - The price data if the request is successful, otherwise `null`.
 * 
 * @throws {Error} - Throws an error if the API request fails or if the API key is not configured.
 * 
 * @example
 * const tokenPrice = await getTokenPrice('SOL');
 * console.log(tokenPrice); // { price, priceChange24h, timestamp, humanTime }
 */
export async function getTokenPrice(tokenSymbol: string) {
  // Check if we have a recent cached price
  const now = Date.now();
  const cachedData = priceCache[tokenSymbol];
  
  if (cachedData && (now - cachedData.fetchedAt) < CACHE_EXPIRATION) {
    // Return cached data if it's still fresh
    return {
      price: cachedData.price,
      priceChange24h: cachedData.priceChange24h,
      timestamp: cachedData.timestamp,
      humanTime: cachedData.humanTime
    };
  }

  // Rate limiting - ensure minimum time between API calls
  const timeSinceLastFetch = now - lastFetchTime;
  if (timeSinceLastFetch < MIN_API_CALL_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_API_CALL_INTERVAL - timeSinceLastFetch));
  }
  
  const token = TOKENS[tokenSymbol as keyof typeof TOKENS]
  const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY

  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-chain': 'solana',
      'X-API-KEY': apiKey ?? ''
    }
  }

  lastFetchTime = Date.now();
  
  try {
    const response = await fetch(`${BIRDEYE_API_URL}/price?address=${token?.address}`, options)
    const data = await response.json() as BirdeyePriceResponse
    
    const priceData = {
      price: data.data?.value ?? 0,
      priceChange24h: data.data?.priceChange24H ?? 0,
      timestamp: data.data?.updateUnixTime ?? Date.now(),
      humanTime: data.data?.updateHumanTime ?? new Date().toISOString()
    };
    
    // Update cache
    priceCache[tokenSymbol] = {
      ...priceData,
      fetchedAt: Date.now()
    };
    
    return priceData;
  } catch (error) {
    console.error(`Error fetching price for ${tokenSymbol}:`, error);
    // Return cached data if available, even if expired
    if (cachedData) {
      return {
        price: cachedData.price,
        priceChange24h: cachedData.priceChange24h,
        timestamp: cachedData.timestamp,
        humanTime: cachedData.humanTime
      };
    }
    // Otherwise return zeros
    return {
      price: 0,
      priceChange24h: 0,
      timestamp: Date.now(),
      humanTime: new Date().toISOString()
    };
  }
}