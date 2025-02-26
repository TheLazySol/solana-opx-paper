type StoredPrice = {
  price: number;
  priceChange24h: number;
  timestamp: number;
}

const PRICE_STORAGE_KEY = 'stored-prices'

/**
 * Retrieves the stored price data for a given asset from localStorage.
 * 
 * This function fetches the price, price change over the last 24 hours, and timestamp
 * for a specific asset from the browser's localStorage. If the data is not available 
 * or if an error occurs, it returns `null`.
 * 
 * @param asset - The asset identifier for which the price data is being fetched.
 * @returns {StoredPrice | null} - The stored price data for the asset or `null` if not found or an error occurs.
 * 
 * @example
 * const priceData = getPriceFromStorage('BTC');
 * console.log(priceData); // Logs the stored price data or null if not found.
 */
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
/**
 * Stores the price data for a given asset in localStorage.
 * 
 * This function saves the price, price change over the last 24 hours, and the current timestamp
 * for an asset in the browser's localStorage. If the data already exists for the asset, it overwrites it.
 * 
 * @param asset - The asset identifier for which the price data is being stored.
 * @param data - The price data to store, including price, price change over the last 24 hours, and timestamp.
 * 
 * @example
 * storePriceData('BTC', { price: 45000, priceChange24h: -0.05, timestamp: Date.now() });
 */
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