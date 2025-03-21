'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getTokenPrice } from '@/lib/api/getTokenPrice'
import { ASSET_PRICE_REFRESH_INTERVAL } from '@/constants/constants'
import { TOKENS, getTokenDisplayDecimals } from '@/constants/token-list/tokens'

// Define the shape of our context
interface AssetPriceContextType {
  prices: Record<string, {
    price: number;
    priceChange: 'up' | 'down' | null;
    lastUpdate: number;
  }>;
  selectedAsset: string;
  setSelectedAsset: (asset: string) => void;
  refreshPrice: (asset: string) => Promise<void>;
}

// Create the context with a default value
const AssetPriceContext = createContext<AssetPriceContextType | null>(null)

// Custom hook to use the asset price context
export function useAssetPrice() {
  const context = useContext(AssetPriceContext)
  if (!context) {
    throw new Error('useAssetPrice must be used within an AssetPriceProvider')
  }
  return context
}

interface AssetPriceProviderProps {
  children: React.ReactNode;
  initialSelectedAsset?: string;
}

export function AssetPriceProvider({ 
  children, 
  initialSelectedAsset = 'SOL'
}: AssetPriceProviderProps) {
  const [prices, setPrices] = useState<Record<string, {
    price: number;
    priceChange: 'up' | 'down' | null;
    lastUpdate: number;
  }>>({})
  const [selectedAsset, setSelectedAsset] = useState(initialSelectedAsset)
  
  // Previous price references for tracking price movements
  const prevPrices = React.useRef<Record<string, number>>({})

  // Function to refresh price for a specific asset
  const refreshPrice = useCallback(async (asset: string) => {
    try {
      const priceData = await getTokenPrice(asset)
      const token = TOKENS[asset as keyof typeof TOKENS]
      const decimals = getTokenDisplayDecimals(token.symbol)
      
      const newPrice = Number(priceData.price)
      const prevPrice = prevPrices.current[asset] || 0
      
      // Determine price change direction
      const priceChange = newPrice > prevPrice ? 'up' : newPrice < prevPrice ? 'down' : null
      
      // Update the stored price
      setPrices(prev => ({
        ...prev,
        [asset]: {
          price: newPrice,
          priceChange,
          lastUpdate: Date.now()
        }
      }))
      
      // Update previous price reference
      prevPrices.current[asset] = newPrice
    } catch (error) {
      console.error(`Error refreshing price for ${asset}:`, error)
    }
  }, [])

  // Effect to refresh prices on an interval
  useEffect(() => {
    // Fetch price for the selected asset immediately
    refreshPrice(selectedAsset)
    
    // Set up interval for refreshing
    const interval = setInterval(() => {
      refreshPrice(selectedAsset)
    }, ASSET_PRICE_REFRESH_INTERVAL)
    
    return () => clearInterval(interval)
  }, [selectedAsset, refreshPrice])

  // Create the value object
  const value: AssetPriceContextType = {
    prices,
    selectedAsset,
    setSelectedAsset,
    refreshPrice
  }

  return (
    <AssetPriceContext.Provider value={value}>
      {children}
    </AssetPriceContext.Provider>
  )
}

// Custom hook to get only the price information for a specific asset
export function useAssetPriceInfo(asset: string) {
  const { prices, refreshPrice } = useAssetPrice()
  const assetPrice = prices[asset]
  
  return {
    price: assetPrice?.price || 0,
    priceChange: assetPrice?.priceChange || null,
    lastUpdate: assetPrice?.lastUpdate || 0,
    refreshPrice: () => refreshPrice(asset)
  }
} 