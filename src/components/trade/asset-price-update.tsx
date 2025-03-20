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
  const prevPriceRef = useRef<number>(0)

  const fetchAndUpdatePrice = useCallback(async () => {
    const priceData = await getTokenPrice(selectedAsset)
    const token = TOKENS[selectedAsset as keyof typeof TOKENS]
    const decimals = getTokenDisplayDecimals(token.symbol)
    
    const newPrice = Number(priceData?.price.toFixed(decimals) ?? 0)
    const currentPrice = Number(prevPriceRef.current.toFixed(decimals))
    
    const direction = newPrice > currentPrice ? 'up' : newPrice < currentPrice ? 'down' : null
    onPriceUpdate(priceData?.price ?? 0, direction)
    prevPriceRef.current = priceData?.price ?? 0
  }, [selectedAsset, onPriceUpdate])

  useEffect(() => {
    fetchAndUpdatePrice()
    const interval = setInterval(fetchAndUpdatePrice, ASSET_PRICE_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [selectedAsset, fetchAndUpdatePrice])

  return null
}