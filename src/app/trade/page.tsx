'use client'

import { OptionChainControls } from '@/components/trade/option-chain-controls'
import { TradeViewContainer } from '@/components/trade/trade-view-container'
import { AssetChart } from '@/components/trade/asset-chart'
import { AssetType } from '@/components/trade/asset-type'
import { TOKENS } from '@/constants/token-list/tokens'
import { useState } from 'react'

export default function TradePage() {
  const [selectedAsset, setSelectedAsset] = useState(Object.keys(TOKENS)[0])

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-lg shadow-lg p-4">
          {/* Asset Type Selector */}
          <div className="mb-4">
            <AssetType 
              selectedAsset={selectedAsset} 
              onAssetChange={setSelectedAsset} 
            />
          </div>
          
          {/* Asset Chart */}
          <div className="mb-4">
            <AssetChart selectedAsset={selectedAsset} />
          </div>
          
          {/* Option Chain with Expiration Selector and Trade View */}
          <div className="space-y-4">
            <OptionChainControls assetId={selectedAsset} />
            <TradeViewContainer />
          </div>
        </div>
      </div>
    </div>
  )
} 