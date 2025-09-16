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
import { calculateMaxProfitPotential, calculateTotalPremium } from '@/constants/option-lab/calculations'
import { formatNumberWithCommas } from '@/utils/utils'
import { toast } from "@/hooks/useToast"
import { TradeCostBreakdown } from './trade-cost-breakdown'
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
  Target,
  Info
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
  const metricsCardRef = useMouseGlow()
  
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

  // Calculate max profit and max loss potential
  const { maxProfit, maxLoss } = useMemo(() => {
    if (!hasSelectedOptions) {
      return { maxProfit: 0, maxLoss: 0 };
    }

    // For option trading (not selling), max profit and loss calculations are different
    let calculatedMaxProfit = 0;
    let calculatedMaxLoss = 0;

    // Calculate based on whether this is a net debit or credit position
    if (isDebit) {
      // Net debit position (buyer): Max loss is the premium paid, max profit is theoretically unlimited for calls or limited for puts
      calculatedMaxLoss = Math.abs(totalAmount);
      
      // For max profit, we need to consider the position type
      // This is a simplified calculation - in reality it depends on the specific strategy
      const hasLongCalls = selectedOptions.some(opt => opt.type === 'bid' && opt.side === 'call');
      const hasLongPuts = selectedOptions.some(opt => opt.type === 'bid' && opt.side === 'put');
      
      if (hasLongCalls && !hasLongPuts) {
        // Long calls only - theoretically unlimited profit
        calculatedMaxProfit = Number.POSITIVE_INFINITY;
      } else if (hasLongPuts && !hasLongCalls) {
        // Long puts only - max profit is strikes minus premium paid
        const maxStrike = Math.max(...selectedOptions.filter(opt => opt.type === 'bid' && opt.side === 'put').map(opt => opt.strike));
        calculatedMaxProfit = (maxStrike * 100) - Math.abs(totalAmount);
      } else {
        // Complex strategy - use a conservative estimate
        calculatedMaxProfit = Math.abs(totalAmount) * 2; // Conservative 2:1 risk/reward estimate
      }
    } else {
      // Net credit position (seller): Max profit is the premium received, max loss is potentially unlimited
      calculatedMaxProfit = totalAmount;
      
      // Max loss for sellers is typically the collateral at risk
      calculatedMaxLoss = collateralNeeded > 0 ? collateralNeeded : totalAmount * 10; // Conservative estimate if no collateral calculated
    }

    return {
      maxProfit: calculatedMaxProfit === Number.POSITIVE_INFINITY ? 0 : calculatedMaxProfit,
      maxLoss: calculatedMaxLoss
    };
  }, [hasSelectedOptions, isDebit, totalAmount, collateralNeeded, selectedOptions]);

  // Currency formatting helper
  const formatUSD = (n: number, d = 2) => `$${formatNumberWithCommas(n, d)}`;

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
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                <Target className="w-3 h-3 text-[#4a85ff]" />
              </div>
              <h4 className="text-sm font-medium text-white">Order Metrics</h4>
            </div>
            
            <div className="space-y-4">
              {/* First Row - Basic Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-white/40">Total Quantity</p>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {hasSelectedOptions ? totalQuantity.toFixed(2) : '--'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-white/40">Volume</p>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {hasSelectedOptions ? `$${formattedVolume}` : '--'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-white/40">Premium</p>
                  </div>
                  <p className="text-sm font-medium text-[#4a85ff] transition-all duration-300 drop-shadow-[0_0_8px_rgba(74,133,255,0.8)] hover:drop-shadow-[0_0_12px_rgba(74,133,255,1)]">
                    {hasSelectedOptions ? `$${formattedAmount}` : '--'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-white/40">Type</p>
                  </div>
                  <p className={cn(
                    "text-sm font-medium",
                    isDebit ? "text-red-400" : "text-green-400"
                  )}>
                    {hasSelectedOptions ? (isDebit ? 'Debit' : 'Credit') : '--'}
                  </p>
                </div>
              </div>

              {/* Second Row - Risk Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-white/40">Est. Max Profit</p>
                    <Tooltip 
                      content={
                        <div className="text-xs font-light text-white/70 max-w-xs">
                          Maximum potential profit for this options strategy. For long positions, this may be unlimited for calls. For short positions, this is typically the premium received.
                        </div>
                      }
                      placement="top"
                    >
                      <Info className="w-3 h-3 text-white/30 cursor-help" />
                    </Tooltip>
                  </div>
                  <p className="text-sm font-medium text-green-400 transition-all duration-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] hover:drop-shadow-[0_0_12px_rgba(34,197,94,1)]">
                    {hasSelectedOptions ? (maxProfit === 0 ? 'Unlimited' : formatUSD(maxProfit)) : '--'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-white/40">Est. Max Loss</p>
                    <Tooltip 
                      content={
                        <div className="text-xs font-light text-white/70 max-w-xs">
                          Maximum potential loss for this options strategy. For long positions, this is typically the premium paid. For short positions, this could be substantial.
                        </div>
                      }
                      placement="top"
                    >
                      <Info className="w-3 h-3 text-white/30 cursor-help" />
                    </Tooltip>
                  </div>
                  <p className="text-sm font-medium text-red-400 transition-all duration-300 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)] hover:drop-shadow-[0_0_12px_rgba(248,113,113,1)]">
                    {hasSelectedOptions ? formatUSD(maxLoss) : '--'}
                  </p>
                </div>
              </div>
            </div>

          </CardBody>
        </Card>
      </motion.div>
          
      {/* Fees Section */}
      <motion.div variants={itemVariants}>
        <TradeCostBreakdown
          fees={fees}
          hasSelectedOptions={hasSelectedOptions}
          borrowedAmount={borrowedAmount}
        />
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