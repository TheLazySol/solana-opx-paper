'use client'

import { OptionChainControls } from '@/components/trade/option-chain-controls'
import { TradeViewContainer } from '@/components/trade/trade-view-container'
import { AssetChart } from '@/components/trade/asset-chart'
import { AssetType } from '@/components/trade/asset-underlying'
import { TOKENS } from '@/constants/token-list/token-list'
import { useState } from 'react'

export default function TradePage() {
  const [selectedAsset, setSelectedAsset] = useState(Object.keys(TOKENS)[0])

  return (
    <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 max-w-[1920px]">
      <div className="grid grid-cols-1 gap-2 sm:gap-4">
        <div className="rounded-lg shadow-lg p-2 sm:p-4">
          {/* Asset Type Selector */}
          <div className="mb-2 sm:mb-4">
            <AssetType 
              selectedAsset={selectedAsset} 
              onAssetChange={setSelectedAsset} 
            />
          </div>
          
          {/* Asset Chart */}
          <div className="mb-2 sm:mb-4 overflow-x-auto">
            <AssetChart selectedAsset={selectedAsset} />
          </div>
          
          {/* Option Chain with Expiration Selector and Trade View */}
          <div className="space-y-2 sm:space-y-4">
            <div className="overflow-x-auto -mx-2 px-2">
              <OptionChainControls assetId={selectedAsset} />
            </div>
            <div className="overflow-x-auto -mx-2 px-2">
              <TradeViewContainer />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 