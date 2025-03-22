'use client'

import { FC, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { OrdersViewOpen } from './orders-view-open'
import { OrdersViewClosed } from './orders-view-closed'
import { OrdersViewHistory } from './orders-view-history'

export const OrdersView: FC = () => {
  const [activeOrderTab, setActiveOrderTab] = useState('open')

  return (
    <div className="space-y-4">
      <Tabs 
        defaultValue="open" 
        value={activeOrderTab} 
        onValueChange={setActiveOrderTab}
        className="w-full"
      >
        <TabsList className="w-full sm:w-[600px] h-10 items-center justify-center card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
          border-[#e5e5e5]/20 dark:border-white/5 p-1 mb-4">
          <TabsTrigger 
            value="open"
            className="w-full h-8 data-[state=active]:bg-white/10 dark:data-[state=active]:bg-white/20 
              data-[state=active]:text-white data-[state=active]:shadow-none transition-all duration-300"
          >
            Open
          </TabsTrigger>
          <TabsTrigger 
            value="closed"
            className="w-full h-8 data-[state=active]:bg-white/10 dark:data-[state=active]:bg-white/20 
              data-[state=active]:text-white data-[state=active]:shadow-none transition-all duration-300"
          >
            Closed
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="w-full h-8 data-[state=active]:bg-white/10 dark:data-[state=active]:bg-white/20 
              data-[state=active]:text-white data-[state=active]:shadow-none transition-all duration-300"
          >
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent 
          value="open"
          className="min-h-[200px] card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
            transition-all duration-300 hover:bg-transparent shadow-lg rounded-lg p-4"
        >
          <OrdersViewOpen />
        </TabsContent>

        <TabsContent 
          value="closed"
          className="min-h-[200px] card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
            transition-all duration-300 hover:bg-transparent shadow-lg rounded-lg p-4"
        >
          <OrdersViewClosed />
        </TabsContent>

        <TabsContent 
          value="history"
          className="min-h-[200px] card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
            transition-all duration-300 hover:bg-transparent shadow-lg rounded-lg p-4"
        >
          <OrdersViewHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
} 