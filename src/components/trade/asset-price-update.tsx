import { useCallback, useEffect, useRef } from 'react'
import { getTokenPrice } from '@/lib/api/getTokenPrice'
import { ASSET_PRICE_REFRESH_INTERVAL } from '@/constants/constants'
import { TOKENS, getTokenDisplayDecimals } from '@/constants/token-list/tokens'
import { useAssetPrice, useAssetPriceInfo } from '@/context/asset-price-provider'

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
 * DEPRECATED: Please use useAssetPriceInfo from context/asset-price-provider instead.
 * This hook is kept for backward compatibility.
 * 
 * Custom hook to handle real-time price updates for a selected asset
 * Fetches prices at regular intervals and tracks price movement direction
 * 
 * @param {AssetPriceUpdateProps} props - The hook props
 * @returns {null} - This hook doesn't return any value, it only handles side effects
 */
export const useAssetPriceUpdate = ({ selectedAsset, onPriceUpdate }: AssetPriceUpdateProps) => {
  // Get the centralized asset price context
  const { setSelectedAsset } = useAssetPrice()
  const { price, priceChange, lastUpdate } = useAssetPriceInfo(selectedAsset)
  
  // Update the selected asset in the context when it changes
  useEffect(() => {
    setSelectedAsset(selectedAsset)
  }, [selectedAsset, setSelectedAsset])
  
  // Call the onPriceUpdate callback when the price changes
  useEffect(() => {
    if (price > 0) {
      onPriceUpdate(price, priceChange)
    }
  }, [price, priceChange, onPriceUpdate])
  
  return null
}