import { FC, useState, useEffect, useRef } from 'react'
import { TradePnLChart } from './trade-pnl-chart'
import { CreateOrder } from './trade-create-order'
import { PlaceTradeOrder } from './trade-place-order'
import { TradeCollateralProvider } from './trade-collateral-provider'
import { SelectedOption } from './option-data'
import { toast } from "@/hooks/useToast"
import { MAX_OPTION_LEGS } from '@/constants/constants'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/utils'
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
        return (
          prevOpt &&
          opt.asset === prevOpt.asset &&
          opt.strike === prevOpt.strike &&
          opt.expiry === prevOpt.expiry &&
          opt.side === prevOpt.side &&
          opt.type === prevOpt.type
        )
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

  // Add an effect to listen for resetSelectedOptions events
  useEffect(() => {
    const handleResetOptions = () => {
      // Reset the selected options
      setSelectedOptions([]);
      
      // Also notify parent
      if (onOptionsUpdate) {
        onOptionsUpdate([]);
      }
    };
    
    // Listen for the resetSelectedOptions event
    window.addEventListener('resetSelectedOptions', handleResetOptions);
    
    // Cleanup
    return () => {
      window.removeEventListener('resetSelectedOptions', handleResetOptions);
    };
  }, [onOptionsUpdate]);

  // Determine if collateral is required
  const isCollateralRequired = selectedOptions.length > 0 && (!orderData.isDebit || orderData.collateralNeeded > 0)

  return (
    <div className="w-full space-y-4">
      {/* All components stacked vertically */}
      
      {/* Create Order */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <CreateOrder 
          selectedOptions={selectedOptions}
          onRemoveOption={handleRemoveOption}
          onUpdateQuantity={handleQuantityUpdate}
          onUpdateLimitPrice={handleLimitPriceUpdate}
        />
      </motion.div>
      
      {/* Place Order Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <PlaceTradeOrder 
          selectedOptions={selectedOptions} 
          selectedAsset={selectedOptions[0]?.asset || ''} 
          onOrderDataChange={setOrderData}
          borrowedAmount={borrowedAmount}
          onOrderPlaced={handleOrderPlaced}
        />
      </motion.div>
      
      {/* Collateral Provider - Only show when required */}
      <AnimatePresence>
        {isCollateralRequired && (
          <motion.div
            key="collateral"
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <TradeCollateralProvider 
              selectedOptions={selectedOptions}
              selectedAsset={selectedOptions[0]?.asset || ''}
              isDebit={orderData.isDebit}
              externalCollateralNeeded={orderData.collateralNeeded}
              onBorrowedAmountChange={handleBorrowedAmountChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* PnL Chart - Only show when options are selected */}
      <AnimatePresence>
        {selectedOptions.length > 0 && (
          <motion.div
            key="pnl-chart"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <TradePnLChart selectedOptions={selectedOptions} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}