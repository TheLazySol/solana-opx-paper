'use client'

import { OptionChainTable } from '@/components/trade/option-chain-table'
import { AssetType } from '@/components/trade/asset-type'
import { AssetChart } from '@/components/trade/asset-chart'
import { TOKENS } from '@/constants/token-list/tokens'
import { useState } from 'react'

export default function TradePage() {
  const [selectedAsset, setSelectedAsset] = useState(Object.keys(TOKENS)[0])

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-lg shadow-lg p-4">
          <AssetType 
            selectedAsset={selectedAsset} 
            onAssetChange={setSelectedAsset} 
          />
          <div className="mb-4">
            <AssetChart selectedAsset={selectedAsset} />
          </div>
          <OptionChainTable />
        </div>
      </div>
    </div>
  )
} 