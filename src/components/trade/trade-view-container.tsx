import { FC, useState, useCallback } from 'react'
import { Card, Tabs, Tab, cn } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { TradeView } from './trade-view'
import { OrdersView } from './orders-view'
import { SelectedOption } from './option-data'
import { TrendingUp, FileText } from 'lucide-react'

interface TradeViewContainerProps {
  selectedOptions: SelectedOption[]
  onOptionsChange?: (options: SelectedOption[]) => void
  onOrderPlaced?: () => void
  activeView?: string
  setActiveView?: (view: string) => void
  activeOrderTab?: string
  setActiveOrderTab?: (tab: string) => void
}

export const TradeViewContainer: FC<TradeViewContainerProps> = ({
  selectedOptions,
  onOptionsChange,
  onOrderPlaced,
  activeView: externalActiveView,
  setActiveView: externalSetActiveView,
  activeOrderTab,
  setActiveOrderTab
}) => {
  // Use internal state if no external state is provided
  const [internalActiveView, setInternalActiveView] = useState('trade')
  
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

  return (
    <div className="w-full space-y-3">
      {/* Tab Navigation - Compact for sidebar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full"
      >
        <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl p-1">
          <Tabs
            selectedKey={activeView}
            onSelectionChange={(key) => setActiveView(key as string)}
            variant="light"
            classNames={{
              tabList: "gap-1 w-full relative rounded-lg p-0",
              cursor: "w-full bg-gradient-to-r from-[#4a85ff]/30 to-[#5829f2]/30 backdrop-blur-sm border border-[#4a85ff]/50",
              tab: "flex-1 px-4 h-9 data-[selected=true]:text-white text-white/60",
              tabContent: "group-data-[selected=true]:text-white font-medium text-sm"
            }}
          >
            <Tab
              key="trade"
              title={
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Trade</span>
                </div>
              }
            />
            <Tab
              key="orders"
              title={
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Orders</span>
                </div>
              }
            />
          </Tabs>
        </Card>
      </motion.div>
      
      {/* Content Area - Transparent background for vertical layout */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
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
            />
          )}
          {activeView === 'orders' && (
            <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
              <OrdersView 
                activeTab={activeOrderTab}
                setActiveTab={setActiveOrderTab}
              />
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}