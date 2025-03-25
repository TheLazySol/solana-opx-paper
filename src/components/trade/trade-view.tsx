import { FC, useState, useEffect, useRef } from 'react'
import { TradePnLChart } from './trade-pnl-chart'
import { CreateOrder } from './create-order'
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
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>(initialSelectedOptions)
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
               opt.index === prevOpt.index && 
               opt.side === prevOpt.side && 
               opt.type === prevOpt.type
      })

    // Ensure we don't exceed the maximum number of option legs
    if (optionsChanged) {
      if (initialSelectedOptions.length > MAX_OPTION_LEGS) {
        // If too many options are provided, take only the first MAX_OPTION_LEGS
        const limitedOptions = initialSelectedOptions.slice(0, MAX_OPTION_LEGS)
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
        setSelectedOptions(initialSelectedOptions)
        prevInitialOptionsRef.current = initialSelectedOptions
      }
    }
  }, [initialSelectedOptions, onOptionsUpdate])

  // Notify parent when selected options change from INTERNAL updates only
  // (like clicking the remove button)
  const handleRemoveOption = (index: number) => {
    const updatedOptions = selectedOptions.filter((_, i) => i !== index)
    setSelectedOptions(updatedOptions)
    
    if (onOptionsUpdate) {
      onOptionsUpdate(updatedOptions)
    }
  }

  return (
    <div className="space-y-4">
      {/* Create Order */}
      <CreateOrder 
        selectedOptions={selectedOptions}
        onRemoveOption={handleRemoveOption}
      />
      
      {/* PnL Chart */}
      <TradePnLChart selectedOptions={selectedOptions} />
    </div>
  )
} 