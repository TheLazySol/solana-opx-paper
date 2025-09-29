'use client'

import { OptionChainControls } from '@/components/trade/option-chain-controls'
import { TradeViewContainer } from '@/components/trade/trade-view-container'
import { ChartTabs } from '@/components/trade/chart-tabs'
import { ChartContent } from '@/components/trade/chart-content'
import { AssetType } from '@/components/trade/asset-underlying'
import { TokenInfoPanel } from '@/components/trade/token-info-panel'
import { TOKENS } from '@/constants/token-list/token-list'
import { useState, useCallback, useRef, useEffect } from 'react'
import { SelectedOption, OptionContract } from '@/components/trade/option-data'
import { CollateralData } from '@/components/trade/collateral-modal'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardBody, Divider } from '@heroui/react'
import { useMouseGlow } from '@/hooks/useMouseGlow'

export default function TradePage() {
  const [selectedAsset, setSelectedAsset] = useState(Object.keys(TOKENS)[0])
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([])
  const [collateralData, setCollateralData] = useState<CollateralData | null>(null)
  const [volumeUpdateTrigger, setVolumeUpdateTrigger] = useState(0)
  const [activeView, setActiveView] = useState('trade')
  const [activeOrderTab, setActiveOrderTab] = useState('open')
  const [isPageVisible, setIsPageVisible] = useState(false)
  const [optionChainData, setOptionChainData] = useState<OptionContract[]>([])
  const [chartActiveTab, setChartActiveTab] = useState('asset')
  const openCollateralModalRef = useRef<(() => void) | null>(null)
  const optionChainControlsRef = useRef<HTMLDivElement>(null)
  const mainChartCardRef = useMouseGlow()
  
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
    // Clear collateral data when options change since it may no longer be valid
    setCollateralData(null)
  }, [])

  // Handle order placement to update volume data
  const handleOrderPlaced = useCallback(() => {
    // Increment trigger to force volume data refresh
    setVolumeUpdateTrigger(prev => prev + 1)
    
    // Clear selected options and collateral data since order was placed
    setSelectedOptions([])
    setCollateralData(null)
  }, [])

  // Function to switch to the trade view when an option is selected
  const handleSwitchToCreateOrder = useCallback(() => {
    // Ensure the trade view is active to show the create order form
    setActiveView('trade')
  }, [])

  // Handle option chain data updates
  const handleOptionChainDataChange = useCallback((data: OptionContract[]) => {
    setOptionChainData(data)
  }, [])

  // Handle collateral data updates
  const handleCollateralDataChange = useCallback((data: CollateralData | null) => {
    setCollateralData(data)
  }, [])

  // Handle collateral modal opening function reference
  const handleProvideCollateralRef = useCallback((openModal: () => void) => {
    openCollateralModalRef.current = openModal
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
          <Card 
            ref={mainChartCardRef}
            className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm shadow-lg"
            style={{
              background: `
                radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                  rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                  rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                  rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                  transparent 75%
                ),
                linear-gradient(to bottom right, 
                  rgb(15 23 42 / 0.4), 
                  rgb(30 41 59 / 0.3), 
                  rgb(51 65 85 / 0.2)
                )
              `,
              transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
            }}
          >
            <CardBody className="p-2 sm:p-4">
              {/* Fixed Layout Grid - Prevents horizontal shifting */}
              <div className={`grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 xl:gap-6 mb-3 sm:mb-4 
                transform transition-all duration-500 ease-out delay-100 ${
                  isPageVisible 
                    ? 'translate-y-0 opacity-100' 
                    : 'translate-y-4 opacity-0'
                }`}>
                
                {/* Left side: Asset selector and token info - Fixed width container */}
                <div className="xl:min-w-0 xl:w-full">
                  <div className="flex items-center gap-4 sm:gap-6 xl:max-w-none">
                    <div className="flex-shrink-0">
                      <AssetType 
                        selectedAsset={selectedAsset} 
                        onAssetChange={setSelectedAsset} 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <TokenInfoPanel selectedAsset={selectedAsset} />
                    </div>
                  </div>
                </div>
                
                {/* Right side: Chart Tabs - Fixed 320px width on desktop */}
                <div className="xl:w-[320px] xl:flex-shrink-0">
                  <ChartTabs 
                    selectedAsset={selectedAsset} 
                    selectedOptions={selectedOptions}
                    collateralData={collateralData}
                    onProvideCollateral={openCollateralModalRef.current || undefined}
                    showTabsOnly={true}
                    activeTab={chartActiveTab}
                    onTabChange={setChartActiveTab}
                  />
                </div>
              </div>
              
              {/* Chart Content */}
              <div className="mb-3 sm:mb-4 overflow-hidden">
                <ChartContent 
                  selectedAsset={selectedAsset} 
                  selectedOptions={selectedOptions}
                  collateralData={collateralData}
                  onProvideCollateral={openCollateralModalRef.current || undefined}
                  activeTab={chartActiveTab}
                  optionChainData={optionChainData}
                />
              </div>
            </CardBody>
          </Card>

          {/* Option Chain - Now integrated into OptionChainControls */}
          <div className={`mt-2 sm:mt-4 transform transition-all duration-600 ease-out delay-400 ${
            isPageVisible 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-8 opacity-0'
          }`}>
            <div className="overflow-hidden" ref={optionChainControlsRef}>
              <OptionChainControls 
                key={`option-chain-controls-${volumeUpdateTrigger}`}
                assetId={selectedAsset} 
                onOptionsChange={handleOptionsChange}
                selectedOptions={selectedOptions}
                onOrderPlaced={handleOrderPlaced}
                onSwitchToCreateOrder={handleSwitchToCreateOrder}
                onOptionChainDataChange={handleOptionChainDataChange}
              />
            </div>
          </div>
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
                optionChainData={optionChainData}
                collateralData={collateralData}
                onCollateralDataChange={handleCollateralDataChange}
                onProvideCollateralRef={handleProvideCollateralRef}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 