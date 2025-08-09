import { FC, useMemo, useEffect, useState } from 'react'
import { Button, Card, CardBody, CardHeader, Divider, Tooltip } from '@heroui/react'
import { SelectedOption, updateOptionVolume, updateOptionOpenInterest, optionsAvailabilityTracker, matchBuyOrderWithMintedOptions } from './option-data'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { OPTION_CREATION_FEE_RATE, BORROW_FEE_RATE, TRANSACTION_COST_SOL } from '@/constants/constants'
import { toast } from "@/hooks/useToast"
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

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
  const [insufficientOptions, setInsufficientOptions] = useState(false)
  
  // Check if any selected option has insufficient availability
  useEffect(() => {
    if (selectedOptions.length === 0) {
      setInsufficientOptions(false);
      return;
    }
    
    // Check each option's availability
    const hasInsufficientOptions = selectedOptions.some(option => {
      // Only check bid (buy) options
      if (option.type === 'bid') {
        const availableQty = optionsAvailabilityTracker.getOptionsAvailable(
          option.strike,
          option.expiry,
          option.side
        );
        
        return option.quantity > availableQty;
      }
      return false;
    });
    
    setInsufficientOptions(hasInsufficientOptions);
  }, [selectedOptions]);

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
      const quantity      = shortCall.quantity || 1
      const coveredQtySum = longCalls.reduce((q, lc) => q + (lc.quantity || 1), 0)
      const numUncovered  = Math.max(0, quantity - coveredQtySum)
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
        // Format options for storage - this needs to be done first to get position IDs
        const optionsByAsset: Record<string, SelectedOption[]> = {};
        selectedOptions.forEach(option => {
          if (!optionsByAsset[option.asset]) {
            optionsByAsset[option.asset] = [];
          }
          optionsByAsset[option.asset].push(option);
        });
        
        // Create and store the new orders
        const existingOrders = JSON.parse(localStorage.getItem('openOrders') || '[]');
        
        // Create formatted orders to store
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
              // If buying, set status to filled
              // If selling, we need to check if it's matched with a buyer
              status: option.type === 'bid' ? 'filled' : 'pending',
              // For buyer positions, both quantities are already set
              // For seller positions, initialize quantities
              filledQuantity: option.type === 'bid' ? option.quantity : 0,
              pendingQuantity: option.type === 'bid' ? 0 : option.quantity
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

        // Save the orders first so we have the IDs
        localStorage.setItem('openOrders', JSON.stringify([...existingOrders, ...newOrders]));

        // Process each option
        selectedOptions.forEach((option, optionIndex) => {
          // Update the volume data for each option
          updateOptionVolume(option);
          
          // Update open interest for each option
          updateOptionOpenInterest(option);
          
          // Decrease available options when purchased
          decreaseAvailableOptions(option);
          
          // For buy orders, match with minted options
          if (option.type === 'bid') {
            // Find which asset position contains this option
            const assetIndex = Object.keys(optionsByAsset).findIndex(asset => 
              optionsByAsset[asset].includes(option)
            );
            
            if (assetIndex !== -1) {
              const assetName = Object.keys(optionsByAsset)[assetIndex];
              const positionId = newOrders[assetIndex].id;
              
              // Find the leg index within this position
              const legIndex = optionsByAsset[assetName].findIndex(o => 
                o.strike === option.strike && 
                o.expiry === option.expiry &&
                o.side === option.side
              );
              
              // Try to match this buy order with available minted options
              if (legIndex !== -1) {
                matchBuyOrderWithMintedOptions(option, positionId, legIndex);
              }
            }
          }
        });
        
        setOrderSuccess(true);
        onOrderPlaced && onOrderPlaced(selectedOptions);
        
        // Clear selection after a short delay
        setTimeout(() => {
          // Update order data with current values
          onOrderDataChange && onOrderDataChange({ isDebit, collateralNeeded });
          
          // Dispatch a custom event to reset selected options externally
          window.dispatchEvent(new CustomEvent('resetSelectedOptions'));
          
          setOrderSuccess(false);
          setIsPlacingOrder(false);
        }, 1500);
        
      } catch (error) {
        console.error('Error placing order:', error);
        setIsPlacingOrder(false);
      }
    }, 500);
  };

  // Function to decrease available options when purchased
  const decreaseAvailableOptions = (option: SelectedOption) => {
    if (!option || !option.quantity) return;
    
    console.log('Decreasing available options for:', {
      type: option.type,  // 'bid' means buying, which should decrease available
      side: option.side,  // 'call' or 'put'
      strike: option.strike,
      expiry: option.expiry,
      quantity: option.quantity
    });
    
    // Only decrease availability for bid orders (buying from available options)
    if (option.type === 'bid') {
      // Get the current minted options from localStorage
      const mintedOptionsStr = localStorage.getItem('mintedOptions');
      if (!mintedOptionsStr) return;
      
      try {
        const mintedOptions = JSON.parse(mintedOptionsStr);
        
        // Find matching options by strike, expiry, and side
        const matchingOptions = mintedOptions.filter((opt: any) => 
          opt.strike === option.strike && 
          opt.expiry === option.expiry && 
          opt.side === option.side && 
          opt.status === 'pending'
        );
        
        console.log(`Found ${matchingOptions.length} matching pending options:`, 
          matchingOptions.map((opt: any) => ({
            strike: opt.strike,
            side: opt.side, 
            expiry: opt.expiry,
            quantity: opt.quantity,
            status: opt.status
          }))
        );
        
        if (matchingOptions.length > 0) {
          // Get the total quantity available
          const totalAvailable = matchingOptions.reduce(
            (sum: number, opt: any) => sum + opt.quantity, 0
          );
          
          // If trying to purchase more than available, limit the purchase
          const purchaseQuantity = Math.min(option.quantity, totalAvailable);
          
          if (purchaseQuantity > 0) {
            // Decrease the available options in the tracker
            optionsAvailabilityTracker.decreaseOptionsAvailable(
              option.strike, 
              option.expiry, 
              option.side, 
              purchaseQuantity
            );
            
            // The rest of the logic for matching buyer/seller is now handled by matchBuyOrderWithMintedOptions
            // No need to manually update mintedOptions or seller positions here
          }
        }
      } catch (error) {
        console.error('Error updating option availability:', error);
      }
    }
  };

  return (
    <Card className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg h-full">
      <CardHeader className="pb-3">
        <h3 className="text-base font-medium text-muted-foreground">
          Order Summary
        </h3>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="space-y-3">
          {/* Order Details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Total Quantity</span>
            <span className="font-medium text-right">{hasSelectedOptions ? totalQuantity.toFixed(2) : '--'}</span>
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
              <span className="text-right">{hasSelectedOptions ? `-- SOL` : '--'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Transaction Cost:</span>
              <span className="text-right">{hasSelectedOptions ? `-- SOL` : '--'}</span>
            </div>
            <Divider className="my-1 bg-white/10" />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium">Total Fees:</span>
              <div className="text-right">
                <div>{hasSelectedOptions ? `-- SOL` : '--'}</div>
                {borrowedAmount > 0 && (
                  <div>${fees.borrowFee.toFixed(2)} USDC</div>
                )}
              </div>
            </div>
          </div>

          <Divider className="my-2 bg-white/10" />
          
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

        <Tooltip 
          content={insufficientOptions ? "There are not enough options available to trade for the quantity selected." : undefined}
          isDisabled={!insufficientOptions}
        >
          <div className="w-full">
            <motion.div
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="w-full"
            >
              <Button 
                className="w-full bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939]
                  hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20
                  hover:border-blue-500/70 hover:shadow-lg hover:shadow-blue-500/25
                  active:bg-gradient-to-r active:from-blue-600/30 active:to-purple-600/30
                  active:border-blue-600/80 active:shadow-inner
                  transition-all duration-200 ease-out relative overflow-hidden group"
                isDisabled={!hasSelectedOptions || isPlacingOrder || insufficientOptions}
                onPress={handlePlaceOrder}
              >
                <motion.span
                  className="relative z-10"
                  initial={{ y: 0 }}
                  whileTap={{ y: 1 }}
                  transition={{ duration: 0.1 }}
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
                  ) : insufficientOptions ? (
                    <span className="flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Insufficient Options
                    </span>
                  ) : (
                    hasSelectedOptions ? 'Place Order' : 'No Options Selected'
                  )}
                </motion.span>
                
                {/* Animated background shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
                
                {/* Click ripple effect */}
                <motion.div
                  className="absolute inset-0 bg-blue-400/20 rounded-sm"
                  initial={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
              </Button>
            </motion.div>
          </div>
        </Tooltip>
      </CardBody>
    </Card>
  )
} 