'use client'

import { OptionChainControls } from '@/components/trade/option-chain-controls'
import { TradeViewContainer } from '@/components/trade/trade-view-container'
import { AssetChart } from '@/components/trade/asset-chart'
import { AssetType } from '@/components/trade/asset-underlying'
import { TOKENS } from '@/constants/token-list/token-list'
import { useState, useCallback, useRef } from 'react'
import { SelectedOption } from '@/components/trade/option-data'

export default function TradePage() {
  const [selectedAsset, setSelectedAsset] = useState(Object.keys(TOKENS)[0])
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([])
  const [volumeUpdateTrigger, setVolumeUpdateTrigger] = useState(0)
  const optionChainControlsRef = useRef<HTMLDivElement>(null)

  // Handle option changes from both sources (chain table and create order)
  const handleOptionsChange = useCallback((options: SelectedOption[]) => {
    setSelectedOptions(options)
  }, [])

  // Handle order placement to update volume data
  const handleOrderPlaced = useCallback(() => {
    // Increment trigger to force volume data refresh
    setVolumeUpdateTrigger(prev => prev + 1)
    
    // Clear selected options since order was placed
    setSelectedOptions([])
  }, [])

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
            <div className="overflow-x-auto -mx-2 px-2" ref={optionChainControlsRef}>
              <OptionChainControls 
                key={`option-chain-controls-${volumeUpdateTrigger}`}
                assetId={selectedAsset} 
                onOptionsChange={handleOptionsChange}
                selectedOptions={selectedOptions}
                onOrderPlaced={handleOrderPlaced}
              />
            </div>
            <div className="overflow-x-auto -mx-2 px-2">
              <TradeViewContainer 
                selectedOptions={selectedOptions}
                onOptionsChange={handleOptionsChange}
                onOrderPlaced={handleOrderPlaced}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 