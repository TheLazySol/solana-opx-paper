import { FC } from 'react'
import { Button } from '@/components/ui/button'
import { SelectedOption } from './option-data'
import { formatSelectedOption } from '@/constants/constants'
import { X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTokenDisplayDecimals } from '@/constants/token-list/token-list'

interface CreateOrderProps {
  selectedOptions: SelectedOption[]
  onRemoveOption?: (index: number) => void
}

export const CreateOrder: FC<CreateOrderProps> = ({ 
  selectedOptions = [],
  onRemoveOption
}) => {
  return (
    <div className="w-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg rounded-lg p-2 sm:p-4">
      <div className="space-y-2 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-0">Create Order</h3>
          {selectedOptions.length > 0 && (
            <Button 
              variant="outline"
              className="text-xs sm:text-sm w-full sm:w-auto"
            >
              Place Order
            </Button>
          )}
        </div>

        {selectedOptions.length === 0 ? (
          <div className="min-h-[80px] sm:min-h-[100px] flex items-center justify-center text-muted-foreground text-sm sm:text-base">
            <p>Select options from the chain above to build your order</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedOptions.map((option, index) => {
              // Format the option display string
              const formattedOption = formatSelectedOption({
                asset: option.asset,
                side: option.side,
                strike: option.strike,
                expiry: option.expiry
              })
              
              // Format the price with appropriate decimals
              const displayDecimals = getTokenDisplayDecimals(option.asset)
              const formattedPrice = option.price.toFixed(displayDecimals)
              
              // Determine price color based on option type
              const priceColor = option.type === 'bid' 
                ? 'text-green-500' 
                : 'text-red-500'
              
              return (
                <Card key={index} className="bg-black/10 border border-white/10">
                  <CardContent className="p-3 flex justify-between items-center">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={option.type === 'bid' ? 'default' : 'destructive'} className="capitalize">
                          {option.type === 'bid' ? 'Long' : 'Short'}
                        </Badge>
                        <span className="font-medium text-sm">{formattedOption}</span>
                      </div>
                      <span className={`text-sm font-semibold ${priceColor}`}>
                        Price: {formattedPrice} {option.asset}
                      </span>
                    </div>
                    
                    {onRemoveOption && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 ml-2 text-muted-foreground hover:text-white"
                        onClick={() => onRemoveOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
} 