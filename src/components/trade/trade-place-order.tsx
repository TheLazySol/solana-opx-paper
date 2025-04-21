import { FC, useMemo, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SelectedOption, updateOptionVolume } from './option-data'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { OPTION_CREATION_FEE_RATE, BORROW_FEE_RATE, TRANSACTION_COST_SOL } from '@/constants/constants'
import { toast } from "@/hooks/use-toast"
import { CheckCircle2 } from 'lucide-react'

interface PlaceTradeOrderProps {
  selectedOptions: SelectedOption[]
  selectedAsset: string
  onOrderDataChange?: (data: { isDebit: boolean; collateralNeeded: number }) => void
  borrowedAmount?: number
  onOrderPlaced?: (options: SelectedOption[]) => void
}

export const PlaceTradeOrder: FC<PlaceTradeOrderProps> = ({
  selectedOptions = [],
  selectedAsset,
  onOrderDataChange,
  borrowedAmount = 0,
  onOrderPlaced
}) => {
  const hasSelectedOptions = selectedOptions.length > 0
  const { price: underlyingPrice } = useAssetPriceInfo(selectedAsset)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  
  // Calculate total quantity across all legs
  const totalQuantity = selectedOptions.reduce((total, option) => {
    return total + (option.quantity || 1)
  }, 0)

  // Calculate total debit/credit (multiplied by quantity and contract size)
  const totalAmount = selectedOptions.reduce((total, option) => {
    const quantity = option.quantity || 1
    const contractSize = 100 // Each option contract represents 100 units of underlying
    const optionPrice = option.limitPrice !== undefined ? option.limitPrice : option.price
    return option.type === 'bid' 
      ? total - (optionPrice * quantity * contractSize)
      : total + (optionPrice * quantity * contractSize)
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
    if (!hasSelectedOptions) return 0;
    
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

    return Math.max(0, totalCollateral)
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

  // Reset success state when options change
  useEffect(() => {
    setOrderSuccess(false);
  }, [selectedOptions]);

  // Handle placing an order
  const handlePlaceOrder = () => {
    if (!hasSelectedOptions) return;

    setIsPlacingOrder(true);

    // Simulate API call with a short delay
    setTimeout(() => {
      try {
        // Update the volume data for each option in the order
        selectedOptions.forEach(option => {
          updateOptionVolume(option);
        });
        
        // Store the order in localStorage for demo purposes
        // In a real application, this would be sent to a backend API
        const existingOrders = JSON.parse(localStorage.getItem('openOrders') || '[]');
        
        // Group options by asset
        const optionsByAsset: Record<string, SelectedOption[]> = {};
        selectedOptions.forEach(option => {
          if (!optionsByAsset[option.asset]) {
            optionsByAsset[option.asset] = [];
          }
          optionsByAsset[option.asset].push(option);
        });
        
        // Format options for storage
        const newOrders = Object.entries(optionsByAsset).map(([asset, options]) => {
          return {
            asset,
            marketPrice: underlyingPrice || 0,
            legs: options.map(option => ({
              type: option.side === 'call' ? 'Call' : 'Put',
              strike: option.strike,
              expiry: option.expiry,
              position: option.type === 'bid' ? option.quantity : -option.quantity,
              marketPrice: option.limitPrice !== undefined ? option.limitPrice : option.price,
              entryPrice: option.limitPrice !== undefined ? option.limitPrice : option.price,
              underlyingEntryPrice: underlyingPrice || 0,
              delta: option.side === 'call' ? 0.5 : -0.5, // Placeholder values for demo
              theta: -0.01,
              gamma: 0.02,
              vega: 0.03,
              rho: 0.01,
              collateral: option.type === 'ask' ? option.strike * 100 : 0,
              value: (option.limitPrice !== undefined ? option.limitPrice : option.price) * option.quantity * 100,
              pnl: 0, // Initial P/L is 0
            })),
            // Calculate aggregated values
            netDelta: 0, // Will be calculated in orders view
            netTheta: 0,
            netGamma: 0,
            netVega: 0,
            netRho: 0,
            totalCollateral: collateralNeeded,
            totalValue: totalAmount,
            totalPnl: 0, // Initial P/L is 0
            // Add a unique ID
            id: `${asset}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          };
        });
        
        localStorage.setItem('openOrders', JSON.stringify([...existingOrders, ...newOrders]));

        // Show success toast
        toast({
          title: "Order Placed",
          description: "Your order has been placed successfully.",
          variant: "default",
        });

        // Set success state
        setOrderSuccess(true);

        // Reset success state after a delay
        setTimeout(() => {
          setOrderSuccess(false);
        }, 2000);

        // Notify parent that order was placed
        if (onOrderPlaced) {
          onOrderPlaced(selectedOptions);
        }
        
        console.log('Order placed successfully!', selectedOptions);
      } catch (error) {
        console.error('Error placing order:', error);
        
        // Show error toast
        toast({
          title: "Order Failed",
          description: "There was an error placing your order. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsPlacingOrder(false);
      }
    }, 750);
  };

  return (
    <Card className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-muted-foreground">
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Order Details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Total Quantity</span>
            <span className="font-medium text-right">{hasSelectedOptions ? totalQuantity : '--'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Order Type</span>
            <span className={`font-medium capitalize text-right ${isDebit ? 'text-red-500' : 'text-green-500'}`}>
              {hasSelectedOptions ? (isDebit ? 'Debit' : 'Credit') : '--'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Volume</span>
            <span className="font-medium text-right">
              {hasSelectedOptions ? `$${formattedVolume} USDC` : '--'}
            </span>
          </div>
          
          {/* Fees Section - Always visible */}
          <div className="space-y-2 p-2 rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Option Creation Fee:</span>
              <span className="text-right">{hasSelectedOptions ? `${fees.optionCreationFee.toFixed(3)} SOL` : '--'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Transaction Cost:</span>
              <span className="text-right">{hasSelectedOptions ? `${fees.transactionCost.toFixed(3)} SOL` : '--'}</span>
            </div>
            <Separator className="my-1 bg-white/10" />
            <div className="grid grid-cols-2 gap-2 text-sm">
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
          
          {/* Premium Amount */}
          <div className="grid grid-cols-2 gap-2">
            <span className={`text-sm ${isDebit ? 'text-red-500' : 'text-green-500'}`}>
              Premium {hasSelectedOptions ? (isDebit ? 'Debit' : 'Credit') : '--'}
            </span>
            <span className="text-lg font-semibold text-white text-right">
              {hasSelectedOptions ? `$${formattedAmount} USDC` : '--'}
            </span>
          </div>
        </div>

        <Button 
          className="w-full bg-white/10 hover:bg-white/20 text-white border-0
            transition-all duration-300 relative"
          disabled={!hasSelectedOptions || isPlacingOrder}
          onClick={handlePlaceOrder}
        >
          {isPlacingOrder ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : orderSuccess ? (
            <span className="flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Order Placed
            </span>
          ) : (
            hasSelectedOptions ? 'Place Order' : 'No Options Selected'
          )}
        </Button>
      </CardContent>
    </Card>
  )
} 