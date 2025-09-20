'use client'

import { FC, useState, useCallback, useEffect } from 'react'
import { Card, Tabs, Tab } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { AssetChart } from './asset-chart'
import PnLChartInteractive from './pnl-chart-interactive'
import { SelectedOption } from './option-data'
import { BarChart3, TrendingUp } from 'lucide-react'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { TOKENS } from '@/constants/token-list/token-list'
import { useAssetPriceInfo } from '@/context/asset-price-provider'

interface ChartTabsProps {
  selectedAsset: string
  selectedOptions: SelectedOption[]
  className?: string
}

export const ChartTabs: FC<ChartTabsProps> = ({
  selectedAsset,
  selectedOptions,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('asset')
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false)
  const chartTabsCardRef = useMouseGlow()

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
  }, [])

  // Automatically switch to P&L chart when options are first selected
  useEffect(() => {
    if (selectedOptions.length > 0 && !hasAutoSwitched) {
      setActiveTab('pnl')
      setHasAutoSwitched(true)
    }
    // Reset auto-switch flag when no options are selected
    if (selectedOptions.length === 0) {
      setHasAutoSwitched(false)
    }
  }, [selectedOptions.length, hasAutoSwitched])

  // Get real-time price from asset price provider
  const { price: currentPrice } = useAssetPriceInfo(selectedAsset)

  // Pass selected options directly to PnL chart
  const pnlChartProps = selectedOptions.length > 0 ? {
    selectedOptions: selectedOptions,
    currentPrice: currentPrice // Now using real asset price from context
  } : null

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Tab Navigation */}
      <Card 
        ref={chartTabsCardRef}
        className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out p-1"
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
            tab: "flex-1 px-3 sm:px-4 h-10 data-[selected=true]:text-white text-white/60 min-w-0",
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
                />
              ) : (
                <div className="w-full h-[400px] flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/50 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white/40" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm font-medium">No Option Selected</p>
                      <p className="text-white/40 text-xs mt-1">
                        Select an option from the chain below to view the payoff diagram
                      </p>
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
