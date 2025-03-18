import { useCallback, useEffect, useRef } from 'react'
import { getTokenPrice } from '@/lib/api/getTokenPrice'
import { ASSET_PRICE_REFRESH_INTERVAL } from '@/constants/constants'

interface AssetPriceUpdateProps {
  selectedAsset: string
  onPriceUpdate: (price: number, priceChange: 'up' | 'down' | null) => void
}

export const useAssetPriceUpdate = ({ selectedAsset, onPriceUpdate }: AssetPriceUpdateProps) => {
  const prevPriceRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout>()

  const fetchAndUpdatePrice = useCallback(async () => {
    try {
      const priceData = await getTokenPrice(selectedAsset)
      
      if (priceData) {
        const newPrice = priceData.price
        const currentPrice = prevPriceRef.current
        const now = Date.now()

        // Only update if we have a new price and enough time has passed
        if (now - lastUpdateTimeRef.current >= ASSET_PRICE_REFRESH_INTERVAL) {
          if (currentPrice !== null && newPrice !== currentPrice) {
            onPriceUpdate(newPrice, newPrice > currentPrice ? 'up' : 'down')
          } else if (currentPrice === null) {
            onPriceUpdate(newPrice, null)
          }
          
          prevPriceRef.current = newPrice
          lastUpdateTimeRef.current = now
        }
      }
    } catch (error) {
      console.error('Error in price update:', error)
    }
  }, [selectedAsset, onPriceUpdate])

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Reset state when asset changes
    prevPriceRef.current = null
    lastUpdateTimeRef.current = 0
    
    // Initial fetch
    fetchAndUpdatePrice()

    // Set up new interval
    intervalRef.current = setInterval(fetchAndUpdatePrice, ASSET_PRICE_REFRESH_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [selectedAsset, fetchAndUpdatePrice])

  return null
}