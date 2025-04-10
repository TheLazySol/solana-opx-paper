import { FC, useState, useCallback, memo, useRef, useEffect } from 'react'
import { TOKENS, getTokenDisplayDecimals } from '@/constants/token-list/token-list'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAssetPrice, useAssetPriceInfo } from '@/context/asset-price-provider'
import Image from 'next/image'

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
    if (priceChange) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Set the highlight effect
      setHighlightEffect(priceChange)
      
      // Clear the effect after a brief moment
      timeoutRef.current = setTimeout(() => {
        setHighlightEffect(null)
      }, 100)
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
            <span className={`text-xl sm:text-2xl font-bold transition-all duration-75 ${
              highlightEffect === 'up' ? 'bg-green-500 text-white' : 
              highlightEffect === 'down' ? 'bg-red-500 text-white' : 
              'bg-transparent'
            } px-1`}
            >
              ${price.toFixed(getTokenDisplayDecimals(selectedToken.symbol))}
            </span>
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[140px] sm:w-[180px] justify-between text-sm sm:text-base">
            <div className="flex items-center">
              {selectedToken.symbol.toUpperCase() === 'SOL' && (
                <Image 
                  src="/token-logos/Solana_logo.png" 
                  alt="Solana Logo" 
                  width={20} 
                  height={20} 
                  className="mr-1.5"
                />
              )}
              {selectedToken.symbol.toUpperCase() === 'LABS' && (
                <Image 
                  src="/token-logos/Epicentral_Labs_logo.png" 
                  alt="Epicentral Labs Logo" 
                  width={20} 
                  height={20} 
                  className="mr-1.5"
                />
              )}
              {selectedToken.symbol}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[140px] sm:w-[180px]">
          {assets.map((asset) => (
            <DropdownMenuItem
              key={asset.id}
              onClick={() => handleAssetChange(asset.id)}
              className="cursor-pointer text-sm sm:text-base"
            >
              <div className="flex items-center">
                {asset.name.toUpperCase() === 'SOL' && (
                  <Image 
                    src="/token-logos/Solana_logo.png" 
                    alt="Solana Logo" 
                    width={20} 
                    height={20} 
                    className="mr-1.5"
                  />
                )}
                {asset.name.toUpperCase() === 'LABS' && (
                  <Image 
                    src="/token-logos/Epicentral_Labs_logo.png" 
                    alt="Epicentral Labs Logo" 
                    width={20} 
                    height={20} 
                    className="mr-1.5"
                  />
                )}
                {asset.name}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const AssetType = memo(AssetTypeComponent)
AssetType.displayName = 'AssetType'