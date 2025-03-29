import { FC } from 'react'
import { Button } from '@/components/ui/button'
import { SelectedOption } from './option-data'
import { formatSelectedOption, MAX_OPTION_LEGS } from '@/constants/constants'
import { X, Plus, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { getTokenDisplayDecimals } from '@/constants/token-list/token-list'

interface CreateOrderProps {
  selectedOptions: SelectedOption[]
  onRemoveOption?: (index: number) => void
  onUpdateQuantity?: (index: number, quantity: number) => void
  onUpdatePriceType?: (index: number, priceType: 'MKT' | 'LIMIT') => void
  onUpdateLimitPrice?: (index: number, limitPrice: number) => void
}

export const CreateOrder: FC<CreateOrderProps> = ({ 
  selectedOptions = [],
  onRemoveOption,
  onUpdateQuantity,
  onUpdatePriceType,
  onUpdateLimitPrice
}) => {
  const handleQuantityChange = (index: number, delta: number) => {
    if (!onUpdateQuantity) return
    
    const currentQuantity = selectedOptions[index].quantity || 1
    const newQuantity = Math.max(1, currentQuantity + delta) // Ensure quantity doesn't go below 1
    onUpdateQuantity(index, newQuantity)
  }

  const handlePriceTypeChange = (index: number, priceType: 'MKT' | 'LIMIT') => {
    if (!onUpdatePriceType) return
    onUpdatePriceType(index, priceType)
  }

  const handleLimitPriceChange = (index: number, value: number) => {
    if (!onUpdateLimitPrice) return
    onUpdateLimitPrice(index, value)
  }

  return (
    <div className="w-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg rounded-lg p-2 sm:p-4">
      <div className="space-y-2 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold">Create Order</h3>
          <div className="text-sm text-muted-foreground">
            {selectedOptions.length}/{MAX_OPTION_LEGS} legs
          </div>
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
              
              // Format the price with appropriate decimals (using 2 for USD)
              const formattedPrice = option.price.toFixed(2)
              
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
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Price:</span>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                            <Input
                              type="number"
                              value={(option.limitPrice || option.price).toFixed(2)}
                              onChange={(e) => {
                                const value = parseFloat(parseFloat(e.target.value).toFixed(2))
                                if (!isNaN(value)) {
                                  handleLimitPriceChange(index, value)
                                }
                              }}
                              className={`h-6 w-24 text-sm pl-5 ${priceColor}`}
                              placeholder="Enter price"
                              step="0.01"
                              min="0"
                              disabled={option.priceType === 'MKT'}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">USDC</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant={option.priceType === 'MKT' ? 'default' : 'outline'}
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => handlePriceTypeChange(index, 'MKT')}
                          >
                            MKT
                          </Button>
                          <Button
                            variant={option.priceType === 'LIMIT' ? 'default' : 'outline'}
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => handlePriceTypeChange(index, 'LIMIT')}
                          >
                            LIMIT
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">Quantity:</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleQuantityChange(index, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {option.quantity || 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleQuantityChange(index, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
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