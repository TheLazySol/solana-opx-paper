import { FC, useCallback, memo } from 'react'
import { TOKENS } from '@/constants/token-list/token-list'
import { ChevronDown } from 'lucide-react'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import { useAssetPrice } from '@/context/asset-price-provider'
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

  const selectedToken = TOKENS[selectedAsset as keyof typeof TOKENS] || TOKENS.SOL
  
  // Use the price context instead of local state
  const { setSelectedAsset } = useAssetPrice()

  // Handle asset selection change
  const handleAssetChange = useCallback((asset: string) => {
    onAssetChange(asset)
    setSelectedAsset(asset)
  }, [onAssetChange, setSelectedAsset])

  return (
    <div>
      {/* Asset Selection Dropdown */}
      <Dropdown>
        <DropdownTrigger>
          <Button 
            variant="bordered" 
            className="w-[140px] sm:w-[180px] justify-between text-sm sm:text-base dropdown-thin-border"
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