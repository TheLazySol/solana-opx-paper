'use client'

import { FC, useState, useCallback, useEffect, useMemo } from 'react'
import { Card, Tabs, Tab } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { AssetChart } from './asset-chart'
import PnLChartInteractive from './pnl-chart-interactive'
import { SelectedOption } from './option-data'
import { BarChart3, TrendingUp } from 'lucide-react'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { CollateralData } from './collateral-modal'
import { useMouseGlow } from '@/hooks/useMouseGlow'

interface ChartTabsProps {
  selectedAsset: string
  selectedOptions: SelectedOption[]
  collateralData?: CollateralData | null
  onProvideCollateral?: () => void
  className?: string
  showTabsOnly?: boolean
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export const ChartTabs: FC<ChartTabsProps> = ({
  selectedAsset,
  selectedOptions,
  collateralData,
  onProvideCollateral,
  className = '',
  showTabsOnly = false,
  activeTab: externalActiveTab,
  onTabChange: externalOnTabChange
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState('asset')
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false)
  const chartTabsCardRef = useMouseGlow()

  // Use external state if provided, otherwise use internal state
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab
  const setActiveTab = externalOnTabChange || setInternalActiveTab

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
  }, [setActiveTab])

  // Automatically switch to P&L chart when options are first selected
  useEffect(() => {
    if (selectedOptions.length > 0 && !hasAutoSwitched) {
      setActiveTab('pnl')
      setHasAutoSwitched(true)
    }
    // Reset auto-switch flag when no options are selected
    if (selectedOptions.length === 0 && hasAutoSwitched) {
      setActiveTab('asset')
      setHasAutoSwitched(false)
    } else if (selectedOptions.length === 0) {
      setHasAutoSwitched(false)
    }
  }, [selectedOptions.length, hasAutoSwitched, setActiveTab])

  // Get real-time price from asset price provider
  const { price: currentPrice } = useAssetPriceInfo(selectedAsset)

  // Pass selected options directly to PnL chart - memoized to prevent unnecessary re-renders
  const pnlChartProps = useMemo(() => {
    if (selectedOptions.length === 0) return null
    
    const props: any = {
      selectedOptions: selectedOptions,
      currentPrice: currentPrice // Now using real asset price from context
    }
    
    // Add collateral amount if available for short positions
    if (collateralData && collateralData.collateralProvided) {
      // Convert collateral to USD value for the chart
      const collateralUSD = Number(collateralData.collateralProvided) * 
        (collateralData.collateralType === 'SOL' ? currentPrice : 1) * 
        collateralData.leverage
      props.collateralProvided = collateralUSD
    }
    
    return props
  }, [selectedOptions, currentPrice, collateralData])

  // If only showing tabs, return just the tab navigation
  if (showTabsOnly) {
    return (
      <Card 
        ref={chartTabsCardRef}
        className={`w-full bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm p-1 ${className}`}
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
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => handleTabChange(key as string)}
          variant="light"
          classNames={{
            tabList: "gap-1 w-full relative rounded-lg p-0",
            cursor: "w-full bg-gradient-to-r from-[#4a85ff] to-[#1851c4] backdrop-blur-sm border border-[#4a85ff]/50 shadow-lg shadow-[#4a85ff]/25",
            tab: "flex-1 px-2 sm:px-3 h-9 data-[selected=true]:text-white text-white/60 min-w-0",
            tabContent: "group-data-[selected=true]:text-white font-medium text-sm"
          }}
        >
          <Tab
            key="asset"
            title={
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Price Chart</span>
              </div>
            }
          />
          <Tab
            key="pnl"
            title={
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>P&L Chart</span>
              </div>
            }
          />
        </Tabs>
      </Card>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Tab Navigation */}
      <Card 
        ref={chartTabsCardRef}
        className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm p-1"
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
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => handleTabChange(key as string)}
          variant="light"
          classNames={{
            tabList: "gap-1 w-full relative rounded-lg p-0",
            cursor: "w-full bg-gradient-to-r from-[#4a85ff] to-[#1851c4] backdrop-blur-sm border border-[#4a85ff]/50 shadow-lg shadow-[#4a85ff]/25",
            tab: "flex-1 px-2 sm:px-3 h-9 data-[selected=true]:text-white text-white/60 min-w-0",
            tabContent: "group-data-[selected=true]:text-white font-medium text-sm"
          }}
        >
          <Tab
            key="asset"
            title={
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Price Chart</span>
              </div>
            }
          />
          <Tab
            key="pnl"
            title={
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>P&L Chart</span>
              </div>
            }
          />
        </Tabs>
      </Card>

      {/* Chart Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: activeTab === 'asset' ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeTab === 'asset' ? 10 : -10 }}
          transition={{ 
            duration: 0.2,
            ease: "easeInOut"
          }}
        >
          {activeTab === 'asset' && (
            <AssetChart selectedAsset={selectedAsset} />
          )}
          {activeTab === 'pnl' && (
            <div className="min-h-[400px]">
              {pnlChartProps ? (
                <PnLChartInteractive
                  {...pnlChartProps}
                  showHeader={true}
                  title="Option Payoff Diagram"
                  onProvideCollateral={onProvideCollateral}
                />
              ) : (
                <div className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm rounded-xl">
                  <div className="p-2">
                    {/* Match exact chart container dimensions */}
                    <div className="h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] w-full flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-600/20">
                        <TrendingUp className="w-8 h-8 text-white/40" />
                      </div>
                      
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-medium text-white/90">No Option Selected</h3>
                        <p className="text-sm text-white/60 max-w-md">
                          Select an option from the chain below to view the payoff diagram
                        </p>
                      </div>
                    </div>
                    
                    {/* Add matching metrics below - empty state */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="bg-black/40 rounded-lg p-2">
                        <span className="text-[10px] sm:text-xs text-white block">Max Loss</span>
                        <span className="text-xs sm:text-sm font-semibold text-white/40">-</span>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2">
                        <span className="text-[10px] sm:text-xs text-white block">Max Profit</span>
                        <span className="text-xs sm:text-sm font-semibold text-white/40">-</span>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2">
                        <span className="text-[10px] sm:text-xs text-white block">Strike Price</span>
                        <span className="text-xs sm:text-sm font-semibold text-white/40">-</span>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2">
                        <span className="text-[10px] sm:text-xs text-white block">Breakeven</span>
                        <span className="text-xs sm:text-sm font-semibold text-white/40">-</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
