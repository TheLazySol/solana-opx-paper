import { FC } from 'react'

interface TradePnLChartProps {
  // We'll expand these props as needed when implementing the actual chart
  selectedOptions?: any[] // This will be properly typed later
}

export const TradePnLChart: FC<TradePnLChartProps> = ({ selectedOptions = [] }) => {
  return (
    <div className="w-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg rounded-lg p-4">
      <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">
        {selectedOptions.length === 0 ? (
          <div className="text-center">
            <p>Select options from the chain above to visualize potential P&L</p>
            <p className="text-sm text-muted-foreground mt-2">
              The chart will update automatically as you build your position
            </p>
          </div>
        ) : (
          // Chart will be implemented here
          <div>Chart coming soon</div>
        )}
      </div>
    </div>
  )
} 