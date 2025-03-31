import { FC, useState, useEffect, useRef } from 'react'
import { TradePnLChart } from './trade-pnl-chart'
import { CreateOrder } from './create-order'
import { PlaceTradeOrder } from './place-trade-order'
import { TradeCollateralProvider } from './trade-collateral-provider'
import { SelectedOption } from './option-data'
import { toast } from "@/hooks/use-toast"
import { MAX_OPTION_LEGS } from '@/constants/constants'

interface TradeViewProps {
  initialSelectedOptions?: SelectedOption[]
  onOptionsUpdate?: (options: SelectedOption[]) => void
}

export const TradeView: FC<TradeViewProps> = ({
  initialSelectedOptions = [],
  onOptionsUpdate
}) => {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>(
    initialSelectedOptions.map(opt => ({ ...opt, quantity: 1 }))
  )
  const prevInitialOptionsRef = useRef<SelectedOption[]>(initialSelectedOptions)

  // Update selected options ONLY when initialSelectedOptions actually changes
  useEffect(() => {
    // Compare current props with previous props
    const prevOptions = prevInitialOptionsRef.current
    const optionsChanged = 
      prevOptions.length !== initialSelectedOptions.length || 
      !initialSelectedOptions.every((opt, idx) => {
        const prevOpt = prevOptions[idx]
        return prevOpt && 
               opt.asset === prevOpt.asset && 
               opt.strike === prevOpt.strike &&
               opt.expiry === prevOpt.expiry &&
               opt.side === prevOpt.side && 
               opt.type === prevOpt.type
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

  return (
    <div className="space-y-4">
      {/* Create Order and Trade Details */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-4">
        <CreateOrder 
          selectedOptions={selectedOptions}
          onRemoveOption={handleRemoveOption}
          onUpdateQuantity={handleQuantityUpdate}
          onUpdateLimitPrice={handleLimitPriceUpdate}
        />
        <PlaceTradeOrder 
          selectedOptions={selectedOptions} 
          selectedAsset={selectedOptions[0]?.asset || ''} 
        />
        <TradeCollateralProvider 
          selectedOptions={selectedOptions}
          selectedAsset={selectedOptions[0]?.asset || ''}
        />
      </div>
      
      {/* PnL Chart */}
      <TradePnLChart selectedOptions={selectedOptions} />
    </div>
  )
} 