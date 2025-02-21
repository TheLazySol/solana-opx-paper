import { StoredPrice } from '@/types/misc'
import { PRICE_STORAGE_KEY } from '@constants/constants'

/**
 * Retrieves the stored price data for a given asset from local storage.
 *
 * This function attempts to read a JSON object from local storage using a predefined key,
 * parses it, and returns the price data for the specified asset. If the data doesn't exist
 * or an error occurs during retrieval/parsing, it returns null.
 *
 * @param {string} asset - The asset identifier for which to retrieve the price data.
 * @returns {StoredPrice | null} The stored price data if available, otherwise null.
 */
export const getPriceFromStorage = (asset: string): StoredPrice | null => {
  // Ensure the code is executed in a browser environment.
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
 * Stores the provided price data for a given asset in local storage.
 *
 * This function reads the existing stored price data (if any), updates the data for the specified asset
 * by setting the current timestamp, and then writes the updated object back to local storage.
 * Any errors during this process are logged to the console.
 *
 * @param {string} asset - The asset identifier for which to store the price data.
 * @param {StoredPrice} data - The price data to be stored.
 */
export const storePriceData = (asset: string, data: StoredPrice) => {
  // Ensure the code is executed in a browser environment.
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
