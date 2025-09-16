'use client'

import { FC, useState } from 'react'
import { Card, Tabs, Tab } from "@heroui/react"
import { motion, AnimatePresence } from 'framer-motion'
import { OrdersViewOpen } from './orders-view-open'
import { OrdersViewHistory } from './orders-view-history'
import { Activity, History } from 'lucide-react'
import { useMouseGlow } from '@/hooks/useMouseGlow'

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
  
  // Mouse glow effect hook for the tab navigation
  const tabsCardRef = useMouseGlow()
  
  // Use either external or internal state
  const activeOrderTab = externalActiveTab || internalActiveTab
  const setActiveOrderTab = externalSetActiveTab || setInternalActiveTab

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
          ref={tabsCardRef}
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
            selectedKey={activeOrderTab}
            onSelectionChange={(key) => setActiveOrderTab(key as string)}
            variant="light"
            classNames={{
              tabList: "gap-1 w-full relative rounded-lg p-0",
              cursor: "w-full bg-gradient-to-r from-[#4a85ff]/30 to-[#5829f2]/30 backdrop-blur-sm border border-[#4a85ff]/50",
              tab: "flex-1 px-4 sm:px-8 h-10 data-[selected=true]:text-white text-white/60 min-w-0",
              tabContent: "group-data-[selected=true]:text-white font-medium text-sm"
            }}
          >
            <Tab
              key="open"
              title={
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Open Orders</span>
                  <span className="sm:hidden">Open</span>
                </div>
              }
            />
            <Tab
              key="history"
              title={
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">History</span>
                  <span className="sm:hidden">History</span>
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
            key={activeOrderTab}
            initial={{ opacity: 0, x: activeOrderTab === 'open' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeOrderTab === 'open' ? 10 : -10 }}
            transition={{ 
              duration: 0.2,
              ease: "easeInOut"
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