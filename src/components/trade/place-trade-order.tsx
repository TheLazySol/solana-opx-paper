import { FC } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SelectedOption } from './option-data'

interface PlaceTradeOrderProps {
  selectedOptions: SelectedOption[]
}

export const PlaceTradeOrder: FC<PlaceTradeOrderProps> = ({
  selectedOptions = []
}) => {
  // Calculate total debit/credit
  const totalAmount = selectedOptions.reduce((total, option) => {
    // For bids (long positions), we subtract the price (debit)
    // For asks (short positions), we add the price (credit)
    return option.type === 'bid' 
      ? total - option.price 
      : total + option.price
  }, 0)

  const isDebit = totalAmount < 0
  const formattedAmount = Math.abs(totalAmount).toFixed(2)

  if (selectedOptions.length === 0) {
    return null
  }

  return (
    <Card className="bg-black/10 border border-white/10">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Order Summary</h3>
          <div className="flex justify-between items-center">
            <span className="text-sm">Total {isDebit ? 'Debit' : 'Credit'}</span>
            <span className={`text-lg font-semibold ${isDebit ? 'text-red-500' : 'text-green-500'}`}>
              ${formattedAmount} USDC
            </span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            // TODO: Implement order placement logic
            console.log('Placing order...')
          }}
        >
          Place Order
        </Button>
      </CardContent>
    </Card>
  )
} 