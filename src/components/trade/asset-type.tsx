import { FC, useState, useCallback, memo, useRef, useEffect } from 'react'
import { TOKENS } from '@/constants/token-list/tokens'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAssetPriceUpdate } from './asset-price-update'

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
  const [price, setPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<'up' | 'down' | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Cleanup function for the highlight effect
  const clearPriceChangeEffect = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setPriceChange(null)
  }, [])

  // Memoize the price update callback
  const handlePriceUpdate = useCallback((newPrice: number, change: 'up' | 'down' | null) => {
    setPrice(newPrice)
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (change) {
      setPriceChange(change)
      // Faster highlight flicker (100ms instead of 750ms)
      timeoutRef.current = setTimeout(clearPriceChangeEffect, 100)
    }
  }, [clearPriceChangeEffect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Use the price update hook
  useAssetPriceUpdate({
    selectedAsset,
    onPriceUpdate: handlePriceUpdate
  })

  return (
    <div className="flex flex-col items-start space-y-2 mb-4">
      {/* Price Display */}
      <div className="flex items-center space-x-2">
        {price !== null && (
          <div className="flex items-center space-x-2">
            <span className={`text-2xl font-bold transition-all duration-75 ${
              priceChange === 'up' ? 'bg-green-500 text-white' : 
              priceChange === 'down' ? 'bg-red-500 text-white' : 
              'bg-transparent'
            } px-1`}
            >
              ${price.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[180px] justify-between">
            {selectedToken.symbol}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[180px]">
          {assets.map((asset) => (
            <DropdownMenuItem
              key={asset.id}
              onClick={() => onAssetChange(asset.id)}
              className="cursor-pointer"
            >
              {asset.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const AssetType = memo(AssetTypeComponent)
AssetType.displayName = 'AssetType'