import { FC, useMemo, useEffect, useState } from 'react'
import { 
  Button, 
  Card, 
  CardBody, 
  CardHeader, 
  Divider, 
  Tooltip,
  Chip,
  Progress,
  cn
} from '@heroui/react'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { SelectedOption, updateOptionVolume, updateOptionOpenInterest, optionsAvailabilityTracker, matchBuyOrderWithMintedOptions } from './option-data'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { OPTION_CREATION_FEE_RATE, BORROW_FEE_RATE, TRANSACTION_COST_SOL } from '@/constants/constants'
import { toast } from "@/hooks/useToast"
import { 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Zap,
  Loader2,
  AlertTriangle,
  Target
} from 'lucide-react'
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
  
  // Mouse glow effect hooks for cards
  const summaryCardRef = useMouseGlow()
  const metricsCardRef = useMouseGlow()
  const feesCardRef = useMouseGlow()
  
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Order Summary Header */}
      <motion.div variants={itemVariants}>
        <Card 
          ref={summaryCardRef}
          className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
          style={{
            background: `
              radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                transparent 75%
              ),
              linear-gradient(to bottom right, 
                rgb(15 23 42 / 0.4), 
                rgb(30 41 59 / 0.3), 
                rgb(51 65 85 / 0.2)
              )
            `,
            transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
          }}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                  <Receipt className="w-3 h-3 text-[#4a85ff]" />
                </div>
                <h3 className="text-lg font-semibold text-white">Order Summary</h3>
              </div>
              {hasSelectedOptions && (
                <Chip 
                  size="sm" 
                  variant="flat"
                  className={cn(
                    "font-medium",
                    isDebit 
                      ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                      : "bg-green-500/20 text-green-400 border border-green-500/30"
                  )}
                  startContent={
                    isDebit ? 
                      <TrendingDown className="w-3 h-3" /> : 
                      <TrendingUp className="w-3 h-3" />
                  }
                >
                  {isDebit ? 'Debit' : 'Credit'}
                </Chip>
              )}
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Order Metrics */}
      <motion.div variants={itemVariants}>
        <Card 
          ref={metricsCardRef}
          className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
          style={{
            background: `
              radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                transparent 75%
              ),
              linear-gradient(to bottom right, 
                rgb(15 23 42 / 0.4), 
                rgb(30 41 59 / 0.3), 
                rgb(51 65 85 / 0.2)
              )
            `,
            transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
          }}
        >
          <CardBody className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                <Target className="w-3 h-3 text-[#4a85ff]" />
              </div>
              <h4 className="text-sm font-medium text-white">Order Metrics</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-4 rounded-lg bg-black/20 border border-white/10">
                <Target className="w-5 h-5 text-white/60 mb-2" />
                <span className="text-xs text-white/60 mb-1">Total Quantity</span>
                <span className="text-lg font-semibold text-white">
                  {hasSelectedOptions ? totalQuantity.toFixed(2) : '--'}
                </span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-black/20 border border-white/10">
                <DollarSign className="w-5 h-5 text-white/60 mb-2" />
                <span className="text-xs text-white/60 mb-1">Volume</span>
                <span className="text-lg font-semibold text-white">
                  {hasSelectedOptions ? `$${formattedVolume}` : '--'}
                </span>
              </div>
            </div>

            {/* Premium Amount */}
            <div className="mt-6 p-4 rounded-lg bg-black/20 border border-white/10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className={cn(
                    "w-5 h-5",
                    isDebit ? "text-red-400" : "text-green-400"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    isDebit ? "text-red-400" : "text-green-400"
                  )}>
                    Premium {hasSelectedOptions ? (isDebit ? 'Debit' : 'Credit') : ''}
                  </span>
                </div>
                <span className={cn(
                  "text-2xl font-bold",
                  isDebit ? "text-red-400" : "text-green-400"
                )}>
                  {hasSelectedOptions ? `$${formattedAmount}` : '--'}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>
          
      {/* Fees Section */}
      <motion.div variants={itemVariants}>
        <Card 
          ref={feesCardRef}
          className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
          style={{
            background: `
              radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                transparent 75%
              ),
              linear-gradient(to bottom right, 
                rgb(15 23 42 / 0.4), 
                rgb(30 41 59 / 0.3), 
                rgb(51 65 85 / 0.2)
              )
            `,
            transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
          }}
        >
          <CardBody className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                <Receipt className="w-3 h-3 text-[#4a85ff]" />
              </div>
              <h4 className="text-sm font-medium text-white">Fees & Costs</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-white/10">
                <span className="text-sm text-white/70">Option Creation</span>
                <span className="text-sm font-medium text-white">
                  {hasSelectedOptions ? `-- SOL` : '--'}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-white/10">
                <span className="text-sm text-white/70">Transaction Cost</span>
                <span className="text-sm font-medium text-white">
                  {hasSelectedOptions ? `-- SOL` : '--'}
                </span>
              </div>
              
              {borrowedAmount > 0 && (
                <div className="flex justify-between items-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-sm text-amber-300">Borrow Fee</span>
                  <span className="text-sm font-medium text-amber-400">
                    ${fees.borrowFee.toFixed(2)}
                  </span>
                </div>
              )}
              
              <Divider className="bg-white/10" />
              
              <div className="flex justify-between items-center p-4 rounded-lg bg-black/30 border border-white/20">
                <span className="text-lg font-semibold text-white">Total Fees</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {hasSelectedOptions ? `-- SOL` : '--'}
                  </div>
                  {borrowedAmount > 0 && (
                    <div className="text-sm text-amber-400">
                      +${fees.borrowFee.toFixed(2)} USDC
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Place Order Button */}
      <motion.div variants={itemVariants}>
        <Tooltip 
          content={insufficientOptions ? "There are not enough options available to trade for the quantity selected." : undefined}
          isDisabled={!insufficientOptions}
        >
          <Button 
            className={cn(
              "w-full h-14 font-semibold text-lg transition-all duration-300",
              !hasSelectedOptions || isPlacingOrder || insufficientOptions
                ? "bg-white/10 text-white/40 border border-white/20"
                : orderSuccess
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25"
                  : "bg-gradient-to-r from-[#4a85ff] to-[#5829f2] text-white shadow-lg shadow-[#4a85ff]/25 hover:shadow-[#4a85ff]/40 hover:scale-[1.02] active:scale-[0.98]"
            )}
            isDisabled={!hasSelectedOptions || isPlacingOrder || insufficientOptions}
            onPress={handlePlaceOrder}
          >
            <motion.div
              className="flex items-center justify-center gap-3"
              initial={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : orderSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Order Placed Successfully!</span>
                </>
              ) : insufficientOptions ? (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  <span>Insufficient Options</span>
                </>
              ) : hasSelectedOptions ? (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Place Order</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5" />
                  <span>No Options Selected</span>
                </>
              )}
            </motion.div>
          </Button>
        </Tooltip>
      </motion.div>
    </motion.div>
  )
}