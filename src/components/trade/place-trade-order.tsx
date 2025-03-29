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
  // Calculate total debit/credit (multiplied by 100 for contract size)
  const totalAmount = selectedOptions.reduce((total, option) => {
    // For bids (long positions), we subtract the price (debit)
    // For asks (short positions), we add the price (credit)
    return option.type === 'bid' 
      ? total - (option.price * 100)
      : total + (option.price * 100)
  }, 0)

  const isDebit = totalAmount < 0
  const formattedAmount = Math.abs(totalAmount).toFixed(2)
  const hasSelectedOptions = selectedOptions.length > 0

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
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">{selectedOptions.length * 100}</span>
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