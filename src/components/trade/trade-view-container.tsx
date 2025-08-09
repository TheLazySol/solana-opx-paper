import { FC, useState, useCallback } from 'react'
import { Tabs, Tab } from "@heroui/react"
import { motion } from 'framer-motion'
import { TradeView } from './trade-view'
import { OrdersView } from './orders-view'
import { SelectedOption } from './option-data'

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
    <div className="space-y-2 sm:space-y-4">
      <div className="w-full">
        <div className="w-full sm:w-[300px] md:w-[400px] mx-auto mb-4">
          <motion.div 
            className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border border-[#e5e5e5]/20 dark:border-white/5 rounded-lg shadow-lg p-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex h-10 sm:h-12 items-center justify-center gap-1 relative">
              {/* Animated background indicator */}
              <motion.div
                className="absolute h-8 sm:h-10 bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-500/60 shadow-lg rounded-md"
                initial={false}
                animate={{
                  x: activeView === 'trade' ? 0 : '100%',
                  width: '50%'
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  duration: 0.6
                }}
              />
              
              <motion.button
                whileHover={{ 
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 400, damping: 15 }
                }}
                whileTap={{ 
                  scale: 0.98,
                  transition: { type: "spring", stiffness: 600, damping: 20 }
                }}
                onClick={() => setActiveView('trade')}
                className="flex-1 h-8 sm:h-10 text-xs sm:text-sm font-medium transition-all duration-500 rounded-md relative overflow-hidden z-10"
              >
                <motion.span 
                  className="relative z-20"
                  animate={{
                    color: activeView === 'trade' ? '#ffffff' : '#d1d5db',
                    textShadow: activeView === 'trade' ? '0 0 8px rgba(74, 133, 255, 0.5)' : 'none'
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  Trade
                </motion.span>
                
                {/* Hover shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  initial={{ x: "-100%", opacity: 0 }}
                  whileHover={{ 
                    x: "100%", 
                    opacity: activeView !== 'trade' ? 1 : 0,
                    transition: { duration: 0.8, ease: "easeInOut" }
                  }}
                />
                
                {/* Tap ripple effect */}
                <motion.div
                  className="absolute inset-0 bg-blue-400/20 rounded-md"
                  initial={{ scale: 0, opacity: 0 }}
                  whileTap={{ 
                    scale: 1, 
                    opacity: [0, 0.6, 0],
                    transition: { duration: 0.4, ease: "easeOut" }
                  }}
                />
              </motion.button>
              
              <motion.button
                whileHover={{ 
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 400, damping: 15 }
                }}
                whileTap={{ 
                  scale: 0.98,
                  transition: { type: "spring", stiffness: 600, damping: 20 }
                }}
                onClick={() => setActiveView('orders')}
                className="flex-1 h-8 sm:h-10 text-xs sm:text-sm font-medium transition-all duration-500 rounded-md relative overflow-hidden z-10"
              >
                <motion.span 
                  className="relative z-20"
                  animate={{
                    color: activeView === 'orders' ? '#ffffff' : '#d1d5db',
                    textShadow: activeView === 'orders' ? '0 0 8px rgba(74, 133, 255, 0.5)' : 'none'
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  Orders
                </motion.span>
                
                {/* Hover shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  initial={{ x: "-100%", opacity: 0 }}
                  whileHover={{ 
                    x: "100%", 
                    opacity: activeView !== 'orders' ? 1 : 0,
                    transition: { duration: 0.8, ease: "easeInOut" }
                  }}
                />
                
                {/* Tap ripple effect */}
                <motion.div
                  className="absolute inset-0 bg-blue-400/20 rounded-md"
                  initial={{ scale: 0, opacity: 0 }}
                  whileTap={{ 
                    scale: 1, 
                    opacity: [0, 0.6, 0],
                    transition: { duration: 0.4, ease: "easeOut" }
                  }}
                />
              </motion.button>
            </div>
          </motion.div>
        </div>
        
        <motion.div 
          className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 hover:bg-transparent shadow-lg rounded-lg p-2 sm:p-4 overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ 
              duration: 0.4, 
              ease: "easeInOut",
              opacity: { duration: 0.3 },
              x: { duration: 0.4 }
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
              <OrdersView 
                activeTab={activeOrderTab}
                setActiveTab={setActiveOrderTab}
              />
            )}
          </motion.div>
        </motion.div>
      </div>

    </div>
  )
}