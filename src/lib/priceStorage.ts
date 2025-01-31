type StoredPrice = {
  price: number;
  priceChange24h: number;
  timestamp: number;
}

const PRICE_STORAGE_KEY = 'stored-prices'

export const getPriceFromStorage = (asset: string): StoredPrice | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(PRICE_STORAGE_KEY)
    if (!stored) return null
    
    const prices = JSON.parse(stored)
    return prices[asset] || null
  } catch {
    return null
  }
}

export const storePriceData = (asset: string, data: StoredPrice) => {
  if (typeof window === 'undefined') return
  
  try {
    const stored = localStorage.getItem(PRICE_STORAGE_KEY)
    const prices = stored ? JSON.parse(stored) : {}
    
    prices[asset] = {
      ...data,
      timestamp: Date.now()
    }
    
    localStorage.setItem(PRICE_STORAGE_KEY, JSON.stringify(prices))
  } catch (error) {
    console.error('Failed to store price data:', error)
  }
} 