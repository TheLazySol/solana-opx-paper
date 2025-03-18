import { FC } from 'react'
import { TOKENS } from '@/constants/token-list/tokens'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

  return (
    <div className="flex items-center space-x-4 mb-4">
      <h2 className="text-lg font-semibold">Asset:</h2>
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