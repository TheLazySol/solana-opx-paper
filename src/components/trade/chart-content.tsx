'use client'

import { FC, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AssetChart } from './asset-chart'
import PnLChartInteractive from './pnl-chart-interactive'
import { SelectedOption, OptionContract } from './option-data'
import { TrendingUp } from 'lucide-react'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { CollateralData } from './collateral-modal'

interface ChartContentProps {
  selectedAsset: string
  selectedOptions: SelectedOption[]
  collateralData?: CollateralData | null
  onProvideCollateral?: () => void
  activeTab: string
  className?: string
  optionChainData?: OptionContract[]
}

export const ChartContent: FC<ChartContentProps> = ({
  selectedAsset,
  selectedOptions,
  collateralData,
  onProvideCollateral,
  activeTab,
  className = '',
  optionChainData = []
}) => {
  // Get real-time price from asset price provider
  const { price: currentPrice } = useAssetPriceInfo(selectedAsset)

  // Pass selected options directly to PnL chart - memoized to prevent unnecessary re-renders
  const pnlChartProps = useMemo(() => {
    if (selectedOptions.length === 0) return null
    
    const props: any = {
      selectedOptions: selectedOptions,
      currentPrice: currentPrice, // Now using real asset price from context
      optionChainData: optionChainData // Pass option chain data for live pricing
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
  }, [selectedOptions, currentPrice, collateralData, optionChainData])

  return (
    <div className={className}>
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
