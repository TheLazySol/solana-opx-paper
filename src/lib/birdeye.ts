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
        'X-API-KEY': process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || 'cc9494cebc5741378eacdf8aa528feb1'
      }
    }

    const response = await fetch(`${BIRDEYE_API_URL}/price?address=${token.address}`, options)
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch price')
    }
    
    // Add some logging to debug the response
    console.log(`Price data for ${tokenSymbol}:`, data)
    
    return {
      price: data.data.value,
      priceChange24h: data.data.priceChange24H || 0,
      timestamp: data.data.timestamp
    }
  } catch (error) {
    console.error(`Error fetching ${tokenSymbol} price:`, error)
    return null
  }
}