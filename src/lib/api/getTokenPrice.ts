import { BirdeyePriceResponse } from '@/types/birdeye'
import { TOKENS } from './tokens'

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
  const token = TOKENS[tokenSymbol as keyof typeof TOKENS]
  if (!token) return null

  try {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-chain': 'solana',
        'X-API-KEY': process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || ''
      }
    }

    if (!options.headers['X-API-KEY'] && !BIRDEYE_API_URL) {
      throw new Error('BIRDEYE_API_KEY or BIRDEYE_API_URL is not configured')
    }

    const response = await fetch(`${BIRDEYE_API_URL}/price?address=${token.address}`, options)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json() as BirdeyePriceResponse
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch price')
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