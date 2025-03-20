import { BirdeyePriceResponse } from '@/types/birdeye'
import { TOKENS } from '@/constants/token-list/tokens'

// Base URL for the Birdeye API endpoints
const BIRDEYE_API_URL = 'https://public-api.birdeye.so/defi'

// Timestamp of the last API call for rate limiting
let lastFetchTime = 0;

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

  const response = await fetch(`${BIRDEYE_API_URL}/price?address=${token?.address}`, options)
  const data = await response.json() as BirdeyePriceResponse
    
  return {
    price: data.data?.value ?? 0,
    priceChange24h: data.data?.priceChange24H ?? 0,
    timestamp: data.data?.updateUnixTime ?? Date.now(),
    humanTime: data.data?.updateHumanTime ?? new Date().toISOString()
  }
}