import { TOKENS } from './tokens'

const BIRDEYE_API_URL = 'https://public-api.birdeye.so/public/price_v2';

export async function getTokenPrice(tokenSymbol: string) {
  const token = TOKENS[tokenSymbol as keyof typeof TOKENS];
  if (!token) return null;

  try {
    const url = `${BIRDEYE_API_URL}?address=${token.address}&vsToken=So11111111111111111111111111111111111111112`
    console.log('Fetching price for:', tokenSymbol, 'URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '',
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('Birdeye response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch price');
    }
    
    return data.data.price;
  } catch (error) {
    console.error(`Error fetching ${tokenSymbol} price:`, error);
    return null;
  }
}