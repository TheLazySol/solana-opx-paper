import { BirdeyePriceResponse } from '@/types/api/birdeye'
import { BIRDEYE_API_URL } from '@/constants/constants'
import { TOKENS } from '@/constants/tokens/tokens'

/**
 * Fetches the latest price of a given token from the Birdeye API.
 *
 * @param {string} tokenSymbol - The symbol of the token to fetch the price for.
 * @returns {Promise<{ price: number; priceChange24h: number; timestamp: number; humanTime: string } | null>} 
 *          A promise that resolves to an object containing price details or null if an error occurs.
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