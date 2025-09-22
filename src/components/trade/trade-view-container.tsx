import { FC, useState, useCallback } from 'react'
import { Card, Tabs, Tab, cn } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { TradeView } from './trade-view'
import { OrdersView } from './orders-view'
import { SelectedOption, OptionContract } from './option-data'
import { CollateralData } from './collateral-modal'
import { TrendingUp, FileText } from 'lucide-react'
import { useMouseGlow } from '@/hooks/useMouseGlow'

interface TradeViewContainerProps {
  selectedOptions: SelectedOption[]
  onOptionsChange?: (options: SelectedOption[]) => void
  onOrderPlaced?: () => void
  activeView?: string
  setActiveView?: (view: string) => void
  activeOrderTab?: string
  setActiveOrderTab?: (tab: string) => void
  optionChainData?: OptionContract[]
  collateralData?: CollateralData | null
  onCollateralDataChange?: (data: CollateralData | null) => void
}

export const TradeViewContainer: FC<TradeViewContainerProps> = ({
  selectedOptions,
  onOptionsChange,
  onOrderPlaced,
  activeView: externalActiveView,
  setActiveView: externalSetActiveView,
  activeOrderTab,
  setActiveOrderTab,
  optionChainData = [],
  collateralData,
  onCollateralDataChange
}) => {
  // Use internal state if no external state is provided
  const [internalActiveView, setInternalActiveView] = useState('trade')
  
  // Mouse glow effect hook for the main tab navigation
  const mainTabsCardRef = useMouseGlow()
  
  // Use either external or internal state
  const activeView = externalActiveView || internalActiveView
  const setActiveView = externalSetActiveView || setInternalActiveView

  const handleOptionsUpdate = useCallback((updatedOptions: SelectedOption[]) => {
    if (onOptionsChange) {
      onOptionsChange(updatedOptions)
    }
  }, [onOptionsChange])

  const handleTabChange = useCallback((tab: string) => {
    setActiveView(tab)
  }, [setActiveView])

  // Handle order placed event to trigger volume update
  const handleOrderPlaced = useCallback(() => {
    if (onOrderPlaced) {
      onOrderPlaced()
    }
  }, [onOrderPlaced])

  // Animation variants  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-4"
    >
      {/* Tab Navigation */}
      <motion.div variants={itemVariants}>
        <Card 
          ref={mainTabsCardRef}
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
            selectedKey={activeView}
            onSelectionChange={(key) => setActiveView(key as string)}
            variant="light"
            classNames={{
              tabList: "gap-1 w-full relative rounded-lg p-0",
              cursor: "w-full bg-gradient-to-r from-[#4a85ff] to-[#1851c4] backdrop-blur-sm border border-[#4a85ff]/50 shadow-lg shadow-[#4a85ff]/25",
              tab: "flex-1 px-3 sm:px-4 h-10 data-[selected=true]:text-white text-white/60 min-w-0",
              tabContent: "group-data-[selected=true]:text-white font-medium text-sm"
            }}
          >
            <Tab
              key="trade"
              title={
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Trade</span>
                </div>
              }
            />
            <Tab
              key="orders"
              title={
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Orders</span>
                </div>
              }
            />
          </Tabs>
        </Card>
      </motion.div>
      
      {/* Content Area */}
      <motion.div variants={itemVariants}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: activeView === 'trade' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeView === 'trade' ? 10 : -10 }}
            transition={{ 
              duration: 0.2,
              ease: "easeInOut"
            }}
          >
            {activeView === 'trade' && (
              <TradeView 
                initialSelectedOptions={selectedOptions} 
                onOptionsUpdate={handleOptionsUpdate}
                onTabChange={handleTabChange}
                optionChainData={optionChainData}
                collateralData={collateralData}
                onCollateralDataChange={onCollateralDataChange}
              />
            )}
            {activeView === 'orders' && (
              <OrdersView 
                activeTab={activeOrderTab}
                setActiveTab={setActiveOrderTab}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}