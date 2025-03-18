import { useCallback, useEffect, useRef } from 'react'
import { getTokenPrice } from '@/lib/api/getTokenPrice'
import { ASSET_PRICE_REFRESH_INTERVAL } from '@/constants/constants'

interface AssetPriceUpdateProps {
  selectedAsset: string
  onPriceUpdate: (price: number, priceChange: 'up' | 'down' | null) => void
}

export const useAssetPriceUpdate = ({ selectedAsset, onPriceUpdate }: AssetPriceUpdateProps) => {
  const prevPriceRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout>()
  const isUpdatingRef = useRef(false)

  const fetchAndUpdatePrice = useCallback(async () => {
    // Prevent concurrent updates
    if (isUpdatingRef.current) return;
    
    try {
      isUpdatingRef.current = true;
      const priceData = await getTokenPrice(selectedAsset)
      
      if (priceData) {
        const newPrice = priceData.price
        const currentPrice = prevPriceRef.current

        if (currentPrice !== null && newPrice !== currentPrice) {
          onPriceUpdate(newPrice, newPrice > currentPrice ? 'up' : 'down')
        } else if (currentPrice === null) {
          onPriceUpdate(newPrice, null)
        }
        
        prevPriceRef.current = newPrice
      }
    } catch (error) {
      console.error('Error in price update:', error)
    } finally {
      isUpdatingRef.current = false
    }
  }, [selectedAsset, onPriceUpdate])

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

    // Set up new interval
    intervalRef.current = setInterval(fetchAndUpdatePrice, ASSET_PRICE_REFRESH_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      isUpdatingRef.current = false
    }
  }, [selectedAsset, fetchAndUpdatePrice])

  return null
}