import { BirdeyePriceResponse } from '@/types/birdeye'
import { TOKENS } from './tokens'

const BIRDEYE_API_URL = 'https://public-api.birdeye.so/defi'

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

    // Validate API key
    if (!options.headers['X-API-KEY']) {
      throw new Error('BIRDEYE_API_KEY is not configured')
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
      timestamp: data.data.updateUnixTime,
      humanTime: data.data.updateHumanTime
    }
  } catch (error) {
    console.error(`Error fetching ${tokenSymbol} price:`, error)
    return null
  }
}