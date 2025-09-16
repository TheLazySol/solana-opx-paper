'use client'

import { OptionChainControls } from '@/components/trade/option-chain-controls'
import { TradeViewContainer } from '@/components/trade/trade-view-container'
import { AssetChart } from '@/components/trade/asset-chart'
import { AssetType } from '@/components/trade/asset-underlying'
import { TokenInfoPanel } from '@/components/trade/token-info-panel'
import { TOKENS } from '@/constants/token-list/token-list'
import { useState, useCallback, useRef, useEffect } from 'react'
import { SelectedOption } from '@/components/trade/option-data'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardBody, Divider } from '@heroui/react'

export default function TradePage() {
  const [selectedAsset, setSelectedAsset] = useState(Object.keys(TOKENS)[0])
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([])
  const [volumeUpdateTrigger, setVolumeUpdateTrigger] = useState(0)
  const [activeView, setActiveView] = useState('trade')
  const [activeOrderTab, setActiveOrderTab] = useState('open')
  const [isPageVisible, setIsPageVisible] = useState(false)
  const optionChainControlsRef = useRef<HTMLDivElement>(null)
  
  // Get search parameters to determine which tabs to show
  const searchParams = useSearchParams()
  const router = useRouter()

  // Trigger page animations on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageVisible(true)
    }, 50) // Small initial delay for smoother entry
    
    return () => clearTimeout(timer)
  }, [])


  // On component mount, check for view and tab params
  useEffect(() => {
    const view = searchParams.get('view')
    const tab = searchParams.get('tab')
    
    if (view === 'orders') {
      setActiveView('orders')
    }
    
    if (tab === 'open') {
      setActiveOrderTab('open')
    }
  }, [searchParams])

  // Push state changes back into URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (activeView === 'orders') {
      params.set('view', activeView)
    } else {
      params.delete('view')
    }
    
    if (activeOrderTab === 'open') {
      params.set('tab', activeOrderTab)
    } else {
      params.delete('tab')
    }
    
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [activeView, activeOrderTab, router, searchParams])

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

  // Function to switch to the trade view when an option is selected
  const handleSwitchToCreateOrder = useCallback(() => {
    // Ensure the trade view is active to show the create order form
    setActiveView('trade')
  }, [])

  return (
    <div className={`py-2 sm:py-4 transform transition-all duration-500 ease-out overflow-hidden ${
      isPageVisible 
        ? 'translate-y-0 opacity-100' 
        : 'translate-y-4 opacity-0'
    }`}>
      {/* Desktop: Two-column layout | Mobile: Stacked single column */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-2 sm:gap-4">
        {/* Left Column: Main content (Chart + Option Chain) - 70% width */}
        <div className={`lg:col-span-7 transform transition-all duration-600 ease-out ${
          isPageVisible 
            ? 'translate-x-0 opacity-100' 
            : '-translate-x-8 opacity-0'
        }`}>
          <Card className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 hover:bg-transparent shadow-lg h-full">
            <CardBody className="p-2 sm:p-4">
              {/* Asset Type Selector and Token Info Panel */}
              <div className={`flex items-center gap-4 sm:gap-6 mb-3 sm:mb-4 
                transform transition-all duration-500 ease-out delay-100 ${
                  isPageVisible 
                    ? 'translate-y-0 opacity-100' 
                    : 'translate-y-4 opacity-0'
                }`}>
                <AssetType 
                  selectedAsset={selectedAsset} 
                  onAssetChange={setSelectedAsset} 
                />
                <TokenInfoPanel selectedAsset={selectedAsset} />
              </div>
              
              {/* Asset Chart */}
              <div className="mb-3 sm:mb-4 overflow-hidden">
                <AssetChart selectedAsset={selectedAsset} />
              </div>
              
              {/* Option Chain with Expiration Selector */}
              <div className="-mx-2 px-2 overflow-hidden" ref={optionChainControlsRef}>
                <OptionChainControls 
                  key={`option-chain-controls-${volumeUpdateTrigger}`}
                  assetId={selectedAsset} 
                  onOptionsChange={handleOptionsChange}
                  selectedOptions={selectedOptions}
                  onOrderPlaced={handleOrderPlaced}
                  onSwitchToCreateOrder={handleSwitchToCreateOrder}
                />
              </div>
            </CardBody>
          </Card>
        </div>
        
        {/* Right Column: Trading Controls Panel - 30% width */}
        <div className={`lg:col-span-3 transform transition-all duration-600 ease-out delay-200 ${
          isPageVisible 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-8 opacity-0'
        }`}>
          <div className="lg:sticky lg:top-20 h-full lg:max-h-[calc(100vh-6rem)] overflow-hidden">
            <div className="h-full overflow-hidden">
              <TradeViewContainer 
                selectedOptions={selectedOptions}
                onOptionsChange={handleOptionsChange}
                onOrderPlaced={handleOrderPlaced}
                activeView={activeView}
                setActiveView={setActiveView}
                activeOrderTab={activeOrderTab}
                setActiveOrderTab={setActiveOrderTab}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 