import { FC, useState } from 'react'
import { TradePnLChart } from './trade-pnl-chart'
import { CreateOrder } from './create-order'

export const TradeView: FC = () => {
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]) // Will be properly typed later

  const handleRemoveOption = (index: number) => {
    setSelectedOptions(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* PnL Chart */}
      <TradePnLChart selectedOptions={selectedOptions} />
      
      {/* Create Order */}
      <CreateOrder 
        selectedOptions={selectedOptions}
        onRemoveOption={handleRemoveOption}
      />
    </div>
  )
} 