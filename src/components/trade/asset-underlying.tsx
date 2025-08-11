import { FC, useState, useCallback, memo, useRef, useEffect } from 'react'
import { TOKENS, getTokenDisplayDecimals } from '@/constants/token-list/token-list'
import { ChevronDown } from 'lucide-react'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import { useAssetPrice, useAssetPriceInfo } from '@/context/asset-price-provider'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

interface AssetTypeProps {
  selectedAsset: string
  onAssetChange: (asset: string) => void
}

const AssetTypeComponent: FC<AssetTypeProps> = ({ selectedAsset, onAssetChange }) => {
  const assets = Object.entries(TOKENS).map(([id, token]) => ({
    id,
    name: token.symbol,
    address: token.address
  }))

  const selectedToken = TOKENS[selectedAsset as keyof typeof TOKENS]
  
  // Use the price context instead of local state
  const { setSelectedAsset } = useAssetPrice()
  const { price, priceChange } = useAssetPriceInfo(selectedAsset)
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

  // Handle asset selection change
  const handleAssetChange = useCallback((asset: string) => {
    onAssetChange(asset)
    setSelectedAsset(asset)
  }, [onAssetChange, setSelectedAsset])

  return (
    <div className="flex flex-col items-start space-y-2 mb-4">
      {/* Price Display */}
      <div className="flex items-center space-x-2">
        {price !== null && (
          <div className="flex items-center space-x-2">
            <motion.span
              className="text-xl sm:text-2xl font-bold px-1 rounded"
              animate={{
                backgroundColor: highlightEffect === 'up' ? '#10b981' : 
                                highlightEffect === 'down' ? '#ef4444' : 
                                'transparent',
                color: highlightEffect ? '#ffffff' : 'inherit',
                boxShadow: highlightEffect === 'up' ? '0 0 15px rgba(16, 185, 129, 0.6)' : 
                          highlightEffect === 'down' ? '0 0 15px rgba(239, 68, 68, 0.6)' : 
                          '0 0 0px transparent'
              }}
              transition={{
                duration: 0.1,
                ease: "easeOut"
              }}
            >
              ${price.toFixed(getTokenDisplayDecimals(selectedToken.symbol))}
            </motion.span>
          </div>
        )}
      </div>

      <Dropdown>
        <DropdownTrigger>
          <Button 
            variant="bordered" 
            className="w-[140px] sm:w-[180px] justify-between text-sm sm:text-base"
            endContent={<ChevronDown className="h-4 w-4 shrink-0 opacity-50" />}
          >
            <div className="flex items-center">
              {selectedToken.symbol.toUpperCase() === 'SOL' && (
                <Image 
                  src="/token-logos/solana_logo.png" 
                  alt="Solana Logo" 
                  width={20} 
                  height={20} 
                  className="mr-1.5"
                />
              )}
              {selectedToken.symbol.toUpperCase() === 'LABS' && (
                <Image 
                  src="/token-logos/epicentral_labs_logo.png" 
                  alt="Epicentral Labs Logo" 
                  width={20} 
                  height={20} 
                  className="mr-1.5"
                />
              )}
              {selectedToken.symbol}
            </div>
          </Button>
        </DropdownTrigger>
        <DropdownMenu 
          aria-label="Asset selection"
          onAction={(key) => handleAssetChange(key as string)}
          className="w-[140px] sm:w-[180px]"
        >
          {assets.map((asset) => (
            <DropdownItem
              key={asset.id}
              className="text-sm sm:text-base"
            >
              <div className="flex items-center">
                {asset.name.toUpperCase() === 'SOL' && (
                  <Image 
                    src="/token-logos/solana_logo.png" 
                    alt="Solana Logo" 
                    width={20} 
                    height={20} 
                    className="mr-1.5"
                  />
                )}
                {asset.name.toUpperCase() === 'LABS' && (
                  <Image 
                    src="/token-logos/epicentral_labs_logo.png" 
                    alt="Epicentral Labs Logo" 
                    width={20} 
                    height={20} 
                    className="mr-1.5"
                  />
                )}
                {asset.name}
              </div>
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

export const AssetType = memo(AssetTypeComponent)
AssetType.displayName = 'AssetType'