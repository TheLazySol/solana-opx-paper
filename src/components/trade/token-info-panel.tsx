import { FC, memo, useState, useRef, useEffect } from 'react'
import { TOKENS, getTokenDisplayDecimals } from '@/constants/token-list/token-list'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface TokenInfoPanelProps {
  selectedAsset: string
}

const TokenInfoPanelComponent: FC<TokenInfoPanelProps> = ({ selectedAsset }) => {
  const selectedToken = TOKENS[selectedAsset as keyof typeof TOKENS] || TOKENS.SOL
  const priceDecimals = selectedToken ? getTokenDisplayDecimals(selectedToken.symbol) : 2
  const { 
    price, 
    priceChange, 
    priceChange24h, 
    volumeUsd24h, 
    liquidity, 
    marketCap,
    lastUpdate 
  } = useAssetPriceInfo(selectedAsset)
  
  const [highlightEffect, setHighlightEffect] = useState<'up' | 'down' | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Update highlight effect when price changes
  useEffect(() => {
    // Only proceed if there's an actual price change
    if (priceChange !== undefined && priceChange !== null) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Set the highlight effect
      setHighlightEffect(priceChange)
      
      // Clear the effect after the flash animation completes
      timeoutRef.current = setTimeout(() => {
        setHighlightEffect(null)
      }, 200)
    }
    
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [priceChange])

  // Format large numbers with appropriate suffixes
  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num === 0) return '0'
    
    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(decimals)}B`
    } else if (num >= 1e6) {
      return `${(num / 1e6).toFixed(decimals)}M`
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(decimals)}K`
    }
    return num.toFixed(decimals)
  }

  // Format currency values
  const formatCurrency = (num: number): string => {
    if (num === 0) return '$0'
    return `$${formatNumber(num)}`
  }



  return (
    <div className="flex items-center space-x-4 sm:space-x-6 lg:space-x-8 text-sm">
      {/* Price */}
      <div className="text-center">
        <div className="text-neutral-400 text-xs mb-1">{selectedToken.symbol} Price</div>
        <motion.div 
          className="font-bold text-white px-1 rounded"
          animate={{
            backgroundColor: highlightEffect === 'up' ? '#10b981' :
                            highlightEffect === 'down' ? '#ef4444' :
                            'transparent',
            color: highlightEffect ? '#ffffff' : 'hsl(0 0% 98%)',
            boxShadow: highlightEffect === 'up'
              ? '0 0 15px rgba(16, 185, 129, 0.6)'
              : highlightEffect === 'down'
                ? '0 0 15px rgba(239, 68, 68, 0.6)'
                : '0 0 0px transparent'
          }}
          transition={{
            duration: 0.1,
            ease: "easeOut"
          }}
        >
          ${Number(price).toFixed(priceDecimals)}
        </motion.div>
      </div>

      {/* 24h Change */}
      <div className="text-center">
        <div className="text-neutral-400 text-xs mb-1">24h Change</div>
        <div className={`font-bold ${priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
        </div>
      </div>

      {/* 24h Volume */}
      <div className="text-center">
        <div className="text-neutral-400 text-xs mb-1">24h Volume</div>
        <div className="font-bold text-white">
          {formatCurrency(volumeUsd24h)}
        </div>
      </div>

      {/* Market Cap */}
      <div className="text-center hidden sm:block">
        <div className="text-neutral-400 text-xs mb-1">Market Cap</div>
        <div className="font-bold text-white">
          {formatCurrency(marketCap)}
        </div>
      </div>

      {/* Liquidity */}
      <div className="text-center hidden md:block">
        <div className="text-neutral-400 text-xs mb-1">Liquidity</div>
        <div className="font-bold text-white">
          {formatCurrency(liquidity)}
        </div>
      </div>
    </div>
  )
}

export const TokenInfoPanel = memo(TokenInfoPanelComponent)
TokenInfoPanel.displayName = 'TokenInfoPanel'
