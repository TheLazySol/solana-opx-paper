import { FC, useEffect, useState, useRef } from 'react'
import { TOKENS } from '@/constants/token-list/tokens'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getTokenPrice } from '@/lib/api/getTokenPrice'

interface AssetTypeProps {
  selectedAsset: string
  onAssetChange: (asset: string) => void
}

export const AssetType: FC<AssetTypeProps> = ({ selectedAsset, onAssetChange }) => {
  const assets = Object.entries(TOKENS).map(([id, token]) => ({
    id,
    name: token.symbol,
    address: token.address
  }))

  const selectedToken = TOKENS[selectedAsset as keyof typeof TOKENS]
  const [price, setPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<'up' | 'down' | null>(null)
  const prevPriceRef = useRef<number | null>(null)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const priceData = await getTokenPrice(selectedAsset)
        if (priceData) {
          // Determine price change direction
          if (prevPriceRef.current !== null) {
            if (priceData.price > prevPriceRef.current) {
              setPriceChange('up')
              setTimeout(() => setPriceChange(null), 500) // Reset after 500ms
            } else if (priceData.price < prevPriceRef.current) {
              setPriceChange('down')
              setTimeout(() => setPriceChange(null), 500) // Reset after 500ms
            }
          }
          prevPriceRef.current = priceData.price
          setPrice(priceData.price)
        }
      } catch (error) {
        console.error('Error fetching price:', error)
      }
    }

    // Initial fetch
    fetchPrice()

    // Set up interval to fetch price every second
    const interval = setInterval(fetchPrice, 1000)

    return () => clearInterval(interval)
  }, [selectedAsset])

  return (
    <div className="flex flex-col items-start space-y-2 mb-4">
      {/* Price Display */}
      <div className="flex items-center space-x-2">
        {price !== null && (
          <div className="flex items-center space-x-2">
            <span className={`text-2xl font-bold transition-colors duration-200 ${
              priceChange === 'up' ? 'text-green-500' : 
              priceChange === 'down' ? 'text-red-500' : 
              'text-foreground'
            }`}>
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