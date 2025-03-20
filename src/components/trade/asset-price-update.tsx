import { useCallback, useEffect, useRef } from 'react'
import { getTokenPrice } from '@/lib/api/getTokenPrice'
import { ASSET_PRICE_REFRESH_INTERVAL } from '@/constants/constants'
import { TOKENS, getTokenDisplayDecimals } from '@/constants/token-list/tokens'

/**
 * Props for the useAssetPriceUpdate hook
 * @interface AssetPriceUpdateProps
 * @property {string} selectedAsset - The currently selected asset symbol (e.g. 'SOL', 'USDC')
 * @property {function} onPriceUpdate - Callback function triggered when price updates, with new price and direction
 */
interface AssetPriceUpdateProps {
  selectedAsset: string
  onPriceUpdate: (price: number, priceChange: 'up' | 'down' | null) => void
}

/**
 * Custom hook to handle real-time price updates for a selected asset
 * Fetches prices at regular intervals and tracks price movement direction
 * 
 * @param {AssetPriceUpdateProps} props - The hook props
 * @returns {null} - This hook doesn't return any value, it only handles side effects
 */
export const useAssetPriceUpdate = ({ selectedAsset, onPriceUpdate }: AssetPriceUpdateProps) => {
  // Ref to store the previous price for comparison
  const prevPriceRef = useRef<number | null>(null)
  // Ref to store the interval timer
  const intervalRef = useRef<NodeJS.Timeout>()
  // Ref to prevent concurrent price updates
  const isUpdatingRef = useRef(false)

  /**
   * Fetches the latest price for the selected asset and triggers updates
   * Handles price comparison and determines price movement direction
   */
  const fetchAndUpdatePrice = useCallback(async () => {
    // Prevent concurrent updates
    if (isUpdatingRef.current) return;
    
    try {
      isUpdatingRef.current = true;
      const priceData = await getTokenPrice(selectedAsset)
      
      if (priceData) {
        const token = TOKENS[selectedAsset as keyof typeof TOKENS]
        const decimals = getTokenDisplayDecimals(token.symbol)
        
        // Round to appropriate decimal places for comparison
        const newPrice = Number(priceData.price.toFixed(decimals))
        const currentPrice = prevPriceRef.current !== null 
          ? Number(prevPriceRef.current.toFixed(decimals))
          : null

        // If we have a previous price and the new price is different, trigger update with direction
        if (currentPrice !== null && newPrice !== currentPrice) {
          onPriceUpdate(priceData.price, newPrice > currentPrice ? 'up' : 'down')
        } 
        // If this is the first price update (no previous price), trigger update with no direction
        else if (currentPrice === null) {
          onPriceUpdate(priceData.price, null)
        }
        
        prevPriceRef.current = priceData.price
      }
    } catch (error) {
      console.error('Error in price update:', error)
    } finally {
      isUpdatingRef.current = false
    }
  }, [selectedAsset, onPriceUpdate])

  /**
   * Effect to manage the price update interval
   * Cleans up previous interval and sets up new one when asset changes
   */
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Reset state when asset changes
    prevPriceRef.current = null
    isUpdatingRef.current = false
    
    // Initial fetch
    fetchAndUpdatePrice()

    // Set up new interval for regular price updates
    intervalRef.current = setInterval(fetchAndUpdatePrice, ASSET_PRICE_REFRESH_INTERVAL)

    // Cleanup function to clear interval and reset update flag
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      isUpdatingRef.current = false
    }
  }, [selectedAsset, fetchAndUpdatePrice])

  return null
}