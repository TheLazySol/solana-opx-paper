'use client'

import { FC, useState } from 'react'
import { Card, Tabs, Tab } from "@heroui/react"
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
    <div className="w-full space-y-6 pt-6">
      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full flex justify-center"
      >
        <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl p-1">
          <Tabs
            selectedKey={activeOrderTab}
            onSelectionChange={(key) => setActiveOrderTab(key as string)}
            variant="light"
            classNames={{
              tabList: "gap-2 w-full relative rounded-lg p-0",
              cursor: "w-full bg-gradient-to-r from-[#4a85ff]/30 to-[#5829f2]/30 backdrop-blur-sm border border-[#4a85ff]/50",
              tab: "max-w-fit px-8 h-10 data-[selected=true]:text-white text-white/60",
              tabContent: "group-data-[selected=true]:text-white font-medium"
            }}
          >
            <Tab
              key="open"
              title={
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Open Orders</span>
                </div>
              }
            />
            <Tab
              key="history"
              title={
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  <span>History</span>
                </div>
              }
            />
          </Tabs>
        </Card>
      </motion.div>
      
      {/* Content Area - Remove the outer card to eliminate box-within-a-box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeOrderTab}
            initial={{ opacity: 0, x: activeOrderTab === 'open' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeOrderTab === 'open' ? 20 : -20 }}
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
          >
            {activeOrderTab === 'open' && <OrdersViewOpen />}
            {activeOrderTab === 'history' && <OrdersViewHistory />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
} 