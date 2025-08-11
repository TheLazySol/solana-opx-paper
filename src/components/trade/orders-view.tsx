'use client'

import { FC, useState } from 'react'
import { Tabs, Tab } from "@heroui/react"
import { motion, AnimatePresence } from 'framer-motion'
import { OrdersViewOpen } from './orders-view-open'
import { OrdersViewHistory } from './orders-view-history'
import { Activity, History } from 'lucide-react'

interface OrdersViewProps {
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

export const OrdersView: FC<OrdersViewProps> = ({ 
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab
}) => {
  // Use internal state if no external state is provided
  const [internalActiveTab, setInternalActiveTab] = useState('open')
  
  // Use either external or internal state
  const activeOrderTab = externalActiveTab || internalActiveTab
  const setActiveOrderTab = externalSetActiveTab || setInternalActiveTab

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Enhanced Tab Selector */}
      <div className="relative max-w-md mx-auto">
        {/* Subtle background glow */}
        <motion.div
          className="absolute -inset-0.5 bg-gradient-to-r from-[#4a85ff]/20 via-[#4a85ff]/15 to-[#4a85ff]/20 rounded-2xl blur-sm"
          animate={{
            opacity: [0.5, 0.6, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/5 dark:from-black/40 dark:via-black/25 dark:to-black/10 
            backdrop-blur-xl border border-white/30 dark:border-white/20 rounded-2xl shadow-2xl p-1.5"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          <div className="flex h-12 items-center justify-center relative">
            {/* Enhanced animated background indicator */}
            <motion.div
              className="absolute h-10 bg-gradient-to-r from-[#4a85ff]/80 via-[#4a85ff]/60 to-[#4a85ff]/80 
                border border-[#4a85ff]/40 shadow-2xl shadow-[#4a85ff]/40 rounded-xl backdrop-blur-sm"
              style={{ width: 'calc(50% - 1px)' }}
              initial={false}
              animate={{
                x: activeOrderTab === 'open' ? '1px' : 'calc(100% + 1px)'
              }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 35,
                duration: 0.7
              }}
            />
            
            {/* Open Tab */}
            <motion.button
              whileTap={{ 
                scale: 0.98,
                transition: { type: "spring", stiffness: 600, damping: 20 }
              }}
              onClick={() => setActiveOrderTab('open')}
              className="flex-1 h-10 text-sm font-semibold transition-all duration-500 rounded-xl relative overflow-hidden z-10 
                flex items-center justify-center gap-2"
            >
              <motion.div
                className="flex items-center gap-2"
                animate={{
                  color: activeOrderTab === 'open' ? '#ffffff' : '#ffffff80',
                  textShadow: activeOrderTab === 'open' ? '0 0 12px rgba(74, 133, 255, 0.8)' : 'none'
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <Activity className="h-4 w-4" />
                <span>Open</span>
              </motion.div>
              
              {/* Enhanced hover shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%", opacity: 0 }}
                whileHover={{ 
                  x: "100%", 
                  opacity: activeOrderTab !== 'open' ? 1 : 0,
                  transition: { duration: 1, ease: "easeInOut" }
                }}
              />
              
              {/* Enhanced tap ripple effect */}
              <motion.div
                className="absolute inset-0 bg-[#4a85ff]/30 rounded-xl"
                initial={{ scale: 0, opacity: 0 }}
                whileTap={{ 
                  scale: 1, 
                  opacity: [0, 0.8, 0],
                  transition: { duration: 0.5, ease: "easeOut" }
                }}
              />
            </motion.button>
            
            {/* History Tab */}
            <motion.button
              whileTap={{ 
                scale: 0.98,
                transition: { type: "spring", stiffness: 600, damping: 20 }
              }}
              onClick={() => setActiveOrderTab('history')}
              className="flex-1 h-10 text-sm font-semibold transition-all duration-500 rounded-xl relative overflow-hidden z-10 
                flex items-center justify-center gap-2"
            >
              <motion.div
                className="flex items-center gap-2"
                animate={{
                  color: activeOrderTab === 'history' ? '#ffffff' : '#ffffff80',
                  textShadow: activeOrderTab === 'history' ? '0 0 12px rgba(74, 133, 255, 0.8)' : 'none'
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <History className="h-4 w-4" />
                <span>History</span>
              </motion.div>
              
              {/* Enhanced hover shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%", opacity: 0 }}
                whileHover={{ 
                  x: "100%", 
                  opacity: activeOrderTab !== 'history' ? 1 : 0,
                  transition: { duration: 1, ease: "easeInOut" }
                }}
              />
              
              {/* Enhanced tap ripple effect */}
              <motion.div
                className="absolute inset-0 bg-[#4a85ff]/30 rounded-xl"
                initial={{ scale: 0, opacity: 0 }}
                whileTap={{ 
                  scale: 1, 
                  opacity: [0, 0.8, 0],
                  transition: { duration: 0.5, ease: "easeOut" }
                }}
              />
            </motion.button>
          </div>
        </motion.div>
      </div>
      
      {/* Enhanced Content Container */}
      <motion.div 
        className="relative"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeOrderTab}
            initial={{ opacity: 0, x: 20, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.98 }}
            transition={{ 
              duration: 0.5, 
              ease: "easeInOut",
              opacity: { duration: 0.3 },
              x: { duration: 0.5 },
              scale: { duration: 0.4 }
            }}
          >
            {activeOrderTab === 'open' && <OrdersViewOpen />}
            {activeOrderTab === 'history' && <OrdersViewHistory />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
} 