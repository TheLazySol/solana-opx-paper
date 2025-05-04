import { FC, useState, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
      <Tabs 
        defaultValue="trade" 
        value={activeView} 
        onValueChange={setActiveView}
        className="w-full"
      >
        <TabsList className="w-full sm:w-[300px] md:w-[400px] h-8 sm:h-10 items-center justify-center card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
          border-[#e5e5e5]/20 dark:border-white/5 p-1 mb-2 sm:mb-4">
          <TabsTrigger 
            value="trade"
            className="w-full h-6 sm:h-8 text-xs sm:text-sm data-[state=active]:bg-white/10 dark:data-[state=active]:bg-white/20 
              data-[state=active]:text-white data-[state=active]:shadow-none transition-all duration-300"
          >
            Trade
          </TabsTrigger>
          <TabsTrigger 
            value="orders"
            className="w-full h-6 sm:h-8 text-xs sm:text-sm data-[state=active]:bg-white/10 dark:data-[state=active]:bg-white/20 
              data-[state=active]:text-white data-[state=active]:shadow-none transition-all duration-300"
          >
            Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent 
          value="trade" 
          className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
            transition-all duration-300 hover:bg-transparent shadow-lg rounded-lg p-2 sm:p-4"
        >
          <TradeView 
            initialSelectedOptions={selectedOptions} 
            onOptionsUpdate={handleOptionsUpdate}
            onTabChange={handleTabChange}
          />
        </TabsContent>

        <TabsContent 
          value="orders"
          className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
            transition-all duration-300 hover:bg-transparent shadow-lg rounded-lg p-2 sm:p-4"
        >
          <OrdersView 
            activeTab={activeOrderTab}
            setActiveTab={setActiveOrderTab}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}