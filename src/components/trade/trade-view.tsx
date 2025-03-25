import { FC, useState, useEffect } from 'react'
import { TradePnLChart } from './trade-pnl-chart'
import { CreateOrder } from './create-order'
import { SelectedOption } from './option-data'

interface TradeViewProps {
  initialSelectedOptions?: SelectedOption[]
}

export const TradeView: FC<TradeViewProps> = ({
  initialSelectedOptions = []
}) => {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([])

  // Update selected options when initialSelectedOptions changes
  useEffect(() => {
    if (initialSelectedOptions.length > 0) {
      setSelectedOptions(initialSelectedOptions);
    }
  }, [initialSelectedOptions]);

  const handleRemoveOption = (index: number) => {
    setSelectedOptions(prev => prev.filter((_, i) => i !== index))
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