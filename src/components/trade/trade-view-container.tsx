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
    <div className="w-full space-y-4">
      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full flex justify-center"
      >
        <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl p-1">
          <Tabs
            selectedKey={activeView}
            onSelectionChange={(key) => setActiveView(key as string)}
            variant="light"
            classNames={{
              tabList: "gap-2 w-full relative rounded-lg p-0",
              cursor: "w-full bg-gradient-to-r from-blue-500/30 to-purple-500/30 backdrop-blur-sm border border-blue-500/50",
              tab: "max-w-fit px-8 h-10 data-[selected=true]:text-white text-white/60",
              tabContent: "group-data-[selected=true]:text-white font-medium"
            }}
          >
            <Tab
              key="trade"
              title={
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Trade</span>
                </div>
              }
            />
            <Tab
              key="orders"
              title={
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Orders</span>
                </div>
              }
            />
          </Tabs>
        </Card>
      </motion.div>
      
      {/* Content Area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: activeView === 'trade' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeView === 'trade' ? 20 : -20 }}
              transition={{ 
                duration: 0.3,
                ease: "easeInOut"
              }}
              className="p-4 md:p-6"
            >
              {activeView === 'trade' && (
                <TradeView 
                  initialSelectedOptions={selectedOptions} 
                  onOptionsUpdate={handleOptionsUpdate}
                  onTabChange={handleTabChange}
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
        </Card>
      </motion.div>
    </div>
  )
}