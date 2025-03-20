import { BirdeyePriceResponse } from '@/types/birdeye'
import { TOKENS } from '@/constants/token-list/tokens'
import { MIN_API_CALL_INTERVAL } from '@/constants/constants'

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
  // Implement rate limiting with backoff to prevent API overuse
  const now = Date.now();
  const timeSinceLastFetch = now - lastFetchTime;
  
  // If we've made a request too recently (less than MIN_API_CALL_INTERVAL ms ago)
  // then wait for the remaining time before making another request
  if (timeSinceLastFetch < MIN_API_CALL_INTERVAL) {
    // Calculate how long we need to wait to respect the rate limit
    const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastFetch;
    // Pause execution for waitTime milliseconds using a Promise
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Update the timestamp of our last API call to the current time
  lastFetchTime = Date.now();

  // Input validation - ensure token symbol is provided
  if (!tokenSymbol) {
    console.error('Token symbol is required')
    return null
  }

  // Verify token exists in our token list
  const token = TOKENS[tokenSymbol as keyof typeof TOKENS]
  if (!token) {
    console.error(`Token ${tokenSymbol} not found in TOKENS list`)
    return null
  }

  // Ensure token has a valid address configured
  if (!token.address) {
    console.error(`Token ${tokenSymbol} has no address configured`)
    return null
  }

  // Check for API key in environment variables
  const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY
  if (!apiKey) {
    console.error('NEXT_PUBLIC_BIRDEYE_API_KEY is not configured')
    return null
  }

  try {
    // Configure API request headers
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-chain': 'solana',
        'X-API-KEY': apiKey
      }
    }

    // Make API request to fetch token price
    const response = await fetch(`${BIRDEYE_API_URL}/price?address=${token.address}`, options)
    
    // Handle unsuccessful HTTP responses
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      return null
    }
    
    // Parse response and validate data structure
    const data = await response.json() as BirdeyePriceResponse
    
    if (!data.success || !data.data?.value) {
      return null
    }
    
    // Return formatted price data
    return {
      price: data.data.value,
      priceChange24h: data.data.priceChange24H || 0,
      timestamp: data.data.updateUnixTime,
      humanTime: data.data.updateHumanTime
    }
  } catch (error) {
    console.error(`Error fetching ${tokenSymbol} price:`, error)
    return null
  }
}