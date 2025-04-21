import { FC, useState, useEffect, useRef } from 'react'
import { TradePnLChart } from './trade-pnl-chart'
import { CreateOrder } from './create-order'
import { PlaceTradeOrder } from './trade-place-order'
import { TradeCollateralProvider } from './trade-collateral-provider'
import { SelectedOption } from './option-data'
import { toast } from "@/hooks/use-toast"
import { MAX_OPTION_LEGS } from '@/constants/constants'

interface TradeViewProps {
  initialSelectedOptions?: SelectedOption[]
  onOptionsUpdate?: (options: SelectedOption[]) => void
  onTabChange?: (tab: string) => void
}

export const TradeView: FC<TradeViewProps> = ({
  initialSelectedOptions = [],
  onOptionsUpdate,
  onTabChange
}) => {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>(
    initialSelectedOptions.map(opt => ({ ...opt, quantity: 1 }))
  )
  const prevInitialOptionsRef = useRef<SelectedOption[]>(initialSelectedOptions)
  const [orderData, setOrderData] = useState<{ isDebit: boolean; collateralNeeded: number }>({
    isDebit: false,
    collateralNeeded: 0
  })
  const [borrowedAmount, setBorrowedAmount] = useState<number>(0)

  // Update selected options ONLY when initialSelectedOptions actually changes
  useEffect(() => {
    // Compare current props with previous props
    const prevOptions = prevInitialOptionsRef.current
    const optionsChanged = 
      prevOptions.length !== initialSelectedOptions.length || 
      !initialSelectedOptions.every((opt, idx) => {
        const prevOpt = prevOptions[idx]
-        return prevOpt && 
-               opt.asset === prevOpt.asset && 
-               opt.strike === prevOpt.strike &&
-               opt.expiry === prevOpt.expiry &&
-               opt.side === prevOpt.side && 
-               opt.type === prevOpt.type
+        return (
+          prevOpt &&
+          opt.index === prevOpt.index &&
+          opt.asset === prevOpt.asset &&
+          opt.strike === prevOpt.strike &&
+          opt.expiry === prevOpt.expiry &&
+          opt.side === prevOpt.side &&
+          opt.type === prevOpt.type &&
+          opt.price === prevOpt.price    // optional: include price drift
+        )
      })
    // Ensure we don't exceed the maximum number of option legs
    if (optionsChanged) {
      if (initialSelectedOptions.length > MAX_OPTION_LEGS) {
        // If too many options are provided, take only the first MAX_OPTION_LEGS
        const limitedOptions = initialSelectedOptions.slice(0, MAX_OPTION_LEGS).map(opt => ({
          ...opt,
          quantity: 1
        }))
        setSelectedOptions(limitedOptions)
        prevInitialOptionsRef.current = limitedOptions
        
        // Notify the user that some options were not added
        toast({
          title: "Maximum options reached",
          description: `Only the first ${MAX_OPTION_LEGS} option legs were added.`,
          variant: "destructive",
        })
        
        // Notify parent about the limited selection if needed
        if (onOptionsUpdate) {
          onOptionsUpdate(limitedOptions)
        }
      } else {
        const newOptions = initialSelectedOptions.map(opt => ({
          ...opt,
          quantity: 1
        }))
        setSelectedOptions(newOptions)
        prevInitialOptionsRef.current = newOptions
      }
    }
  }, [initialSelectedOptions, onOptionsUpdate])

  // Notify parent when selected options change from INTERNAL updates only
  const handleRemoveOption = (index: number) => {
    const updatedOptions = selectedOptions.filter((_, i) => i !== index)
    setSelectedOptions(updatedOptions)
    
    if (onOptionsUpdate) {
      onOptionsUpdate(updatedOptions)
    }
  }

  // Handle quantity updates
  const handleQuantityUpdate = (index: number, quantity: number) => {
    const updatedOptions = selectedOptions.map((opt, i) => 
      i === index ? { ...opt, quantity } : opt
    )
    setSelectedOptions(updatedOptions)
    
    if (onOptionsUpdate) {
      onOptionsUpdate(updatedOptions)
    }
  }

  // Handle price type updates
  const handlePriceTypeUpdate = (index: number, priceType: 'MKT' | 'LIMIT') => {
    const updatedOptions = selectedOptions.map((opt, i) => 
      i === index ? { ...opt, priceType } : opt
    )
    setSelectedOptions(updatedOptions)
    
    if (onOptionsUpdate) {
      onOptionsUpdate(updatedOptions)
    }
  }

  // Handle limit price updates
  const handleLimitPriceUpdate = (index: number, limitPrice: number): void => {
    const updatedOptions = selectedOptions.map((opt, i) => 
      i === index ? { ...opt, limitPrice } : opt
    )
    setSelectedOptions(updatedOptions)
    
    if (onOptionsUpdate) {
      onOptionsUpdate(updatedOptions)
    }
  }

  // Handle borrowed amount updates from collateral provider
  const handleBorrowedAmountChange = (amount: number) => {
    setBorrowedAmount(amount);
  }

  // Handle order placement from PlaceTradeOrder
  const handleOrderPlaced = (options: SelectedOption[]) => {
    // Reset selected options
    setSelectedOptions([]);
    
    // Notify parent component that options have been updated (cleared)
    if (onOptionsUpdate) {
      onOptionsUpdate([]);
    }
    
    // Change to Orders tab
    if (onTabChange) {
      onTabChange('orders');
    }
  }

  return (
    <div className="space-y-4">
      {/* Create Order and Trade Details */}
      <div className="grid grid-cols-1 gap-4">
        {/* Create Order and Trade Details - 3 columns on 1600px+ screens */}
        <div className="grid grid-cols-1 2xl:grid-cols-[2fr,1fr,1fr] gap-4">
          {/* Create Order */}
          <CreateOrder 
            selectedOptions={selectedOptions}
            onRemoveOption={handleRemoveOption}
            onUpdateQuantity={handleQuantityUpdate}
            onUpdateLimitPrice={handleLimitPriceUpdate}
          />
          
          {/* Collateral and Order Summary - Side by Side on md-2xl, separate columns on 2xl+ */}
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-1 gap-4">
            <TradeCollateralProvider 
              selectedOptions={selectedOptions}
              selectedAsset={selectedOptions[0]?.asset || ''}
              isDebit={orderData.isDebit}
              externalCollateralNeeded={orderData.collateralNeeded}
              onBorrowedAmountChange={handleBorrowedAmountChange}
            />
            <div className="2xl:hidden">
              <PlaceTradeOrder 
                selectedOptions={selectedOptions} 
                selectedAsset={selectedOptions[0]?.asset || ''} 
                onOrderDataChange={setOrderData}
                borrowedAmount={borrowedAmount}
                onOrderPlaced={handleOrderPlaced}
              />
            </div>
          </div>

          {/* Order Summary - Only visible on 2xl screens as third column */}
          <div className="hidden 2xl:block">
            <PlaceTradeOrder 
              selectedOptions={selectedOptions} 
              selectedAsset={selectedOptions[0]?.asset || ''} 
              onOrderDataChange={setOrderData}
              borrowedAmount={borrowedAmount}
              onOrderPlaced={handleOrderPlaced}
            />
          </div>
        </div>
      </div>
      
      {/* PnL Chart - Full Width */}
      <TradePnLChart selectedOptions={selectedOptions} />
    </div>
  )
} 