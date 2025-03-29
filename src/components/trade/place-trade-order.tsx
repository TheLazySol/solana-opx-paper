import { FC } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SelectedOption } from './option-data'

interface PlaceTradeOrderProps {
  selectedOptions: SelectedOption[]
}

export const PlaceTradeOrder: FC<PlaceTradeOrderProps> = ({
  selectedOptions = []
}) => {
  const hasSelectedOptions = selectedOptions.length > 0
  
  // Calculate total quantity across all legs
  const totalQuantity = selectedOptions.reduce((total, option) => {
    return total + (option.quantity || 1)
  }, 0)

  // Calculate total debit/credit (multiplied by quantity for each leg)
  const totalAmount = selectedOptions.reduce((total, option) => {
    const quantity = option.quantity || 1
    return option.type === 'bid' 
      ? total - (option.price * quantity)
      : total + (option.price * quantity)
  }, 0)

  const isDebit = totalAmount < 0
  const formattedAmount = Math.abs(totalAmount).toFixed(2)

  return (
    <Card className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-muted-foreground">
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasSelectedOptions ? (
          <div className="space-y-3">
            {/* Order Details */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Quantity</span>
              <span className="font-medium">{totalQuantity}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Order Type</span>
              <span className="font-medium capitalize">{isDebit ? 'Debit' : 'Credit'}</span>
            </div>
            <Separator className="my-2 bg-white/10" />
            {/* Total Amount */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total {isDebit ? 'Debit' : 'Credit'}</span>
              <span className={`text-lg font-semibold ${isDebit ? 'text-red-500' : 'text-green-500'}`}>
                ${formattedAmount} USDC
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-sm text-muted-foreground">
            Select options to view order details
          </div>
        )}

        <Button 
          className="w-full bg-white/10 hover:bg-white/20 text-white border-0
            transition-all duration-300"
          disabled={!hasSelectedOptions}
          onClick={() => {
            // TODO: Implement order placement logic
            console.log('Placing order...')
          }}
        >
          {hasSelectedOptions ? 'Place Order' : 'No Options Selected'}
        </Button>
      </CardContent>
    </Card>
  )
} 