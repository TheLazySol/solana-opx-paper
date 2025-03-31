import { FC, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SelectedOption } from './option-data'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { OPTION_CREATION_FEE_RATE, BORROW_FEE_RATE, TRANSACTION_COST_SOL } from '@/constants/option-lab/constants'

interface PlaceTradeOrderProps {
  selectedOptions: SelectedOption[]
  selectedAsset: string
  onOrderDataChange?: (data: { isDebit: boolean; collateralNeeded: number }) => void
  borrowedAmount?: number
}

export const PlaceTradeOrder: FC<PlaceTradeOrderProps> = ({
  selectedOptions = [],
  selectedAsset,
  onOrderDataChange,
  borrowedAmount = 0
}) => {
  const hasSelectedOptions = selectedOptions.length > 0
  const { price: underlyingPrice } = useAssetPriceInfo(selectedAsset)
  
  // Calculate total quantity across all legs
  const totalQuantity = selectedOptions.reduce((total, option) => {
    return total + (option.quantity || 1)
  }, 0)

  // Calculate total debit/credit (multiplied by quantity and contract size)
  const totalAmount = selectedOptions.reduce((total, option) => {
    const quantity = option.quantity || 1
    const contractSize = 100 // Each option contract represents 100 units of underlying
    return option.type === 'bid' 
      ? total - (option.price * quantity * contractSize)
      : total + (option.price * quantity * contractSize)
  }, 0)

  // Calculate volume (USD value of the order)
  const volume = selectedOptions.reduce((total, option) => {
    const quantity = option.quantity || 1
    const contractSize = 100 // Each option contract represents 100 units
    const optionPrice = option.limitPrice !== undefined ? option.limitPrice : option.price
    return total + (optionPrice * quantity * contractSize)
  }, 0)

  // Calculate collateral needed based on option positions
  const collateralNeeded = (() => {
    const contractSize = 100 // Each option contract represents 100 units
    let totalCollateral = 0

    // Separate options by type
    const shortCalls = selectedOptions.filter(opt => opt.type === 'ask' && opt.side === 'call')
    const shortPuts = selectedOptions.filter(opt => opt.type === 'ask' && opt.side === 'put')
    const longCalls = selectedOptions.filter(opt => opt.type === 'bid' && opt.side === 'call')
    const longPuts = selectedOptions.filter(opt => opt.type === 'bid' && opt.side === 'put')

    // Handle short calls
    shortCalls.forEach(shortCall => {
      const quantity = shortCall.quantity || 1
      // Short calls require full underlying price as collateral if not covered
      const numUncovered = Math.max(0, quantity - longCalls.length)
      if (numUncovered > 0) {
        totalCollateral += underlyingPrice * contractSize * numUncovered
      }
    })

    // Handle short puts
    shortPuts.forEach(shortPut => {
      const quantity = shortPut.quantity || 1
      // Find the highest strike long put that could cover this short put
      const coveringPut = longPuts.find(lp => lp.strike >= shortPut.strike)
      
      if (!coveringPut) {
        // If no covering put, full collateral needed
        totalCollateral += shortPut.strike * contractSize * quantity
      }
    })

    return totalCollateral
  })()

  const isDebit = totalAmount < 0
  const formattedAmount = Math.abs(totalAmount).toFixed(2)
  const formattedVolume = volume.toFixed(2)
  const formattedCollateral = collateralNeeded.toFixed(2)

  // Calculate fees
  const fees = useMemo(() => {
    const optionCreationFee = hasSelectedOptions ? OPTION_CREATION_FEE_RATE * selectedOptions.length : 0;
    const borrowFee = borrowedAmount * BORROW_FEE_RATE;
    const transactionCost = hasSelectedOptions ? TRANSACTION_COST_SOL : 0;

    return {
      optionCreationFee,
      borrowFee,
      transactionCost,
      totalFees: optionCreationFee + borrowFee + transactionCost
    };
  }, [hasSelectedOptions, selectedOptions.length, borrowedAmount]);

  // Notify parent component of order data changes
  useEffect(() => {
    onOrderDataChange?.({ isDebit, collateralNeeded })
  }, [isDebit, collateralNeeded, onOrderDataChange])

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
        <div className="space-y-3">
          {/* Order Details */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Quantity</span>
            <span className="font-medium">{hasSelectedOptions ? totalQuantity : '--'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Order Type</span>
            <span className={`font-medium capitalize ${isDebit ? 'text-red-500' : 'text-green-500'}`}>
              {hasSelectedOptions ? (isDebit ? 'Debit' : 'Credit') : '--'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Volume</span>
            <span className="font-medium">
              {hasSelectedOptions ? `$${formattedVolume} USDC` : '--'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Collateral Needed</span>
            <span className="font-medium">
              {hasSelectedOptions ? `$${formattedCollateral} USDC` : '--'}
            </span>
          </div>

          {/* Fees Section - Always visible */}
          <div className="space-y-2 p-2 rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Option Creation Fee:</span>
              <span>{hasSelectedOptions ? `${fees.optionCreationFee.toFixed(3)} SOL` : '--'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Borrow Fee:</span>
              <span>{borrowedAmount > 0 ? `$${fees.borrowFee.toFixed(2)} USDC` : '--'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Transaction Cost:</span>
              <span>{hasSelectedOptions ? `${fees.transactionCost.toFixed(3)} SOL` : '--'}</span>
            </div>
            <Separator className="my-1 bg-white/10" />
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">Total Fees:</span>
              <div className="text-right">
                <div>{hasSelectedOptions ? `${(fees.optionCreationFee + fees.transactionCost).toFixed(3)} SOL` : '--'}</div>
                {borrowedAmount > 0 && (
                  <div>${fees.borrowFee.toFixed(2)} USDC</div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-2 bg-white/10" />
          
          {/* Total Amount */}
          <div className="flex items-center justify-between">
            <span className={`text-sm ${isDebit ? 'text-red-500' : 'text-green-500'}`}>
              Total {hasSelectedOptions ? (isDebit ? 'Debit' : 'Credit') : '--'}
            </span>
            <span className="text-lg font-semibold text-white">
              {hasSelectedOptions ? `$${formattedAmount} USDC` : '--'}
            </span>
          </div>
        </div>

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