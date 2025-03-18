import { BirdeyePriceResponse } from '@/types/birdeye'
import { TOKENS } from '@/constants/token-list/tokens'

const BIRDEYE_API_URL = 'https://public-api.birdeye.so/defi'
/**
 * Fetches the price of a token from the Birdeye API.
 * 
 * This function makes a request to the Birdeye API to get the price of a token
 * on the Solana blockchain. It also retrieves the 24-hour price change and
 * the timestamp of the last update.
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
  // Validate token symbol
  if (!tokenSymbol) {
    console.error('Token symbol is required')
    return null
  }

  const token = TOKENS[tokenSymbol as keyof typeof TOKENS]
  if (!token) {
    console.error(`Token ${tokenSymbol} not found in TOKENS list`)
    return null
  }

  // Validate token address
  if (!token.address) {
    console.error(`Token ${tokenSymbol} has no address configured`)
    return null
  }

  const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY
  if (!apiKey) {
    console.error('NEXT_PUBLIC_BIRDEYE_API_KEY is not configured')
    return null
  }

  try {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-chain': 'solana',
        'X-API-KEY': apiKey
      }
    }

    const response = await fetch(`${BIRDEYE_API_URL}/price?address=${token.address}`, options)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      return null
    }
    
    const data = await response.json() as BirdeyePriceResponse
    
    if (!data.success) {
      console.error(`API error: ${data.message || 'Failed to fetch price'}`)
      return null
    }

    if (!data.data?.value) {
      console.error('No price data returned from API')
      return null
    }
    
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