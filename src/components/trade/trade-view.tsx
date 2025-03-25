import { FC, useState, useEffect, useRef } from 'react'
import { TradePnLChart } from './trade-pnl-chart'
import { CreateOrder } from './create-order'
import { SelectedOption } from './option-data'

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

    if (optionsChanged) {
      setSelectedOptions(initialSelectedOptions)
      prevInitialOptionsRef.current = initialSelectedOptions
    }
  }, [initialSelectedOptions])

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