'use client'

import { FC, useMemo, useEffect, useState, useCallback } from 'react'
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
import { SelectedOption, updateOptionVolume, updateOptionOpenInterest, optionsAvailabilityTracker, matchBuyOrderWithMintedOptions, OptionContract, generateMockOptionData } from './option-data'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { OPTION_CREATION_FEE_RATE, BORROW_FEE_RATE, TRANSACTION_COST_SOL } from '@/constants/constants'
import { 
  calculateMaxProfitPotential, 
  calculateTotalPremium,
  calculateIntrinsicValue,
  calculateExtrinsicValue
} from '@/constants/option-lab/calculations'
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
import { CollateralModal, CollateralData } from './collateral-modal'

interface PlaceTradeOrderProps {
  selectedOptions: SelectedOption[]
  selectedAsset: string
  onOrderDataChange?: (data: { isDebit: boolean; collateralNeeded: number }) => void
  onOrderPlaced?: (options: SelectedOption[]) => void
  optionChainData?: OptionContract[]
  collateralData?: CollateralData | null
  onCollateralDataChange?: (data: CollateralData | null) => void
  onProvideCollateralRef?: (openModal: () => void) => void
}

export const PlaceTradeOrder: FC<PlaceTradeOrderProps> = ({
  selectedOptions = [],
  selectedAsset,
  onOrderDataChange,
  onOrderPlaced,
  optionChainData = [],
  collateralData: externalCollateralData,
  onCollateralDataChange,
  onProvideCollateralRef
}) => {
  const hasSelectedOptions = selectedOptions.length > 0
  const { price: underlyingPrice } = useAssetPriceInfo(selectedAsset)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [insufficientOptions, setInsufficientOptions] = useState(false)
  const [isCollateralModalOpen, setIsCollateralModalOpen] = useState(false)
  // Use external collateral data instead of local state
  const collateralData = externalCollateralData
  
  // Mouse glow effect hooks for cards
  const metricsCardRef = useMouseGlow()
  const placeOrderButtonRef = useMouseGlow()
  
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

  // Calculate collateral needed based on option positions
  const collateralNeeded = (() => {
    if (!hasSelectedOptions) return 0;
    
    const contractSize = 100 // Each option contract represents 100 units
    let totalCollateral = 0

    // Separate options by type with quantity defaulting to 1
    const shortCalls = selectedOptions.filter(opt => opt.type === 'ask' && opt.side === 'call')
    const shortPuts = selectedOptions.filter(opt => opt.type === 'ask' && opt.side === 'put')
    const longCalls = selectedOptions.filter(opt => opt.type === 'bid' && opt.side === 'call')
    const longPuts = selectedOptions.filter(opt => opt.type === 'bid' && opt.side === 'put')

    // Handle short calls with quantity-aware matching
    if (shortCalls.length > 0) {
      // Create available coverage pool from all long calls
      let availableCoveragePool = longCalls.reduce((total, longCall) => {
        return total + (longCall.quantity || 1)
      }, 0)

      // Process each short call, consuming from the coverage pool
      shortCalls.forEach(shortCall => {
        const shortQuantity = shortCall.quantity || 1
        const coveredQuantity = Math.min(shortQuantity, availableCoveragePool)
        const uncoveredQuantity = shortQuantity - coveredQuantity
        
        // Consume coverage from the pool
        availableCoveragePool = Math.max(0, availableCoveragePool - coveredQuantity)
        
        // Add collateral for uncovered quantity
        if (uncoveredQuantity > 0) {
          totalCollateral += underlyingPrice * contractSize * uncoveredQuantity
        }
      })
    }

    // Handle short puts with per-short matching and quantity tracking
    if (shortPuts.length > 0) {
      // Create array of long puts with remaining quantities for tracking
      const availableLongPuts = longPuts.map(longPut => ({
        ...longPut,
        remainingQuantity: longPut.quantity || 1
      })).sort((a, b) => b.strike - a.strike) // Sort by strike descending for better matching

      shortPuts.forEach(shortPut => {
        const shortQuantity = shortPut.quantity || 1
        let remainingShortQuantity = shortQuantity
        
        // Try to match with available long puts (strike >= short put strike for coverage)
        for (const availableLongPut of availableLongPuts) {
          if (remainingShortQuantity <= 0) break
          if (availableLongPut.remainingQuantity <= 0) continue
          if (availableLongPut.strike < shortPut.strike) continue // Can't cover
          
          // Calculate how much can be covered by this long put
          const coveredByThisLong = Math.min(remainingShortQuantity, availableLongPut.remainingQuantity)
          
          // Update remaining quantities
          remainingShortQuantity -= coveredByThisLong
          availableLongPut.remainingQuantity -= coveredByThisLong
        }
        
        // Add collateral for any remaining uncovered short quantity
        if (remainingShortQuantity > 0) {
          totalCollateral += shortPut.strike * contractSize * remainingShortQuantity
        }
      })
    }

    return Math.max(0, totalCollateral)
  })()

  // Get option chain data - use provided data or generate as fallback
  const currentOptionChainData = useMemo(() => {
    if (optionChainData.length > 0) {
      return optionChainData;
    }
    // Fallback: generate data if not provided (for backward compatibility)
    return generateMockOptionData(null, underlyingPrice || 0, 0);
  }, [optionChainData, underlyingPrice]);

  // Helper function to get live option price from chain data
  const getLiveOptionPrice = useCallback((option: SelectedOption): number => {
    // Find the matching option contract from the live chain data
    const optionContract = currentOptionChainData.find(contract => 
      contract.strike === option.strike && 
      contract.expiry === option.expiry
    );

    if (!optionContract) {
      // Fallback to stored price if not found in chain
      return option.limitPrice !== undefined ? option.limitPrice : option.price;
    }

    // Get live bid/ask price based on option side and type
    if (option.side === 'call') {
      return option.type === 'bid' ? optionContract.callBid : optionContract.callAsk;
    } else {
      return option.type === 'bid' ? optionContract.putBid : optionContract.putAsk;
    }
  }, [currentOptionChainData]);

  // Calculate total debit/credit using live option prices (multiplied by quantity and contract size)
  const totalAmount = useMemo(() => {
    return selectedOptions.reduce((total, option) => {
      const quantity = option.quantity || 1
      const contractSize = 100 // Each option contract represents 100 units of underlying
      const liveOptionPrice = getLiveOptionPrice(option)
      return option.type === 'bid' 
        ? total - (liveOptionPrice * quantity * contractSize)
        : total + (liveOptionPrice * quantity * contractSize)
    }, 0)
  }, [selectedOptions, getLiveOptionPrice])

  // Calculate volume (USD value of the order) using live prices
  const volume = useMemo(() => {
    return selectedOptions.reduce((total, option) => {
      const quantity = option.quantity || 1
      const contractSize = 100 // Each option contract represents 100 units
      const liveOptionPrice = getLiveOptionPrice(option)
      return total + (liveOptionPrice * quantity * contractSize)
    }, 0)
  }, [selectedOptions, getLiveOptionPrice])

  // Calculate premium per share/token using live prices (without contract size multiplier)
  const premiumPerShare = useMemo(() => {
    return selectedOptions.reduce((total, option) => {
      const quantity = option.quantity || 1
      const liveOptionPrice = getLiveOptionPrice(option)
      return option.type === 'bid' 
        ? total - (liveOptionPrice * quantity)
        : total + (liveOptionPrice * quantity)
    }, 0)
  }, [selectedOptions, getLiveOptionPrice])

  // Calculate total Greeks for the order using live option chain data
  const totalGreeks = useMemo(() => {
    if (!hasSelectedOptions || !currentOptionChainData.length) {
      return { delta: 0, theta: 0, gamma: 0, vega: 0, rho: 0 };
    }

    return selectedOptions.reduce((totals, option) => {
      const quantity = option.quantity || 1;
      const positionMultiplier = option.type === 'bid' ? 1 : -1; // Long positions are positive, short positions are negative
      
      // Find the matching option contract from the live chain data
      const optionContract = currentOptionChainData.find(contract => 
        contract.strike === option.strike && 
        contract.expiry === option.expiry
      );

      if (!optionContract) {
        return totals; // Skip if contract not found
      }

      // Get the correct Greeks based on option side (call or put)
      const greeks = option.side === 'call' ? optionContract.callGreeks : optionContract.putGreeks;

      return {
        delta: totals.delta + (greeks.delta * quantity * positionMultiplier),
        theta: totals.theta + (greeks.theta * quantity * positionMultiplier),
        gamma: totals.gamma + (greeks.gamma * quantity * positionMultiplier),
        vega: totals.vega + (greeks.vega * quantity * positionMultiplier),
        rho: totals.rho + (greeks.rho * quantity * positionMultiplier)
      };
    }, { delta: 0, theta: 0, gamma: 0, vega: 0, rho: 0 });
  }, [hasSelectedOptions, selectedOptions, currentOptionChainData]);

  const isDebit = totalAmount < 0
  const formattedAmount = Math.abs(totalAmount).toFixed(2)
  const formattedPremiumPerShare = Math.abs(premiumPerShare).toFixed(2)
  const formattedVolume = volume.toFixed(2)
  const formattedCollateral = collateralNeeded.toFixed(2)

  // Calculate fees
  const fees = useMemo(() => {
    const optionCreationFee = hasSelectedOptions ? OPTION_CREATION_FEE_RATE * selectedOptions.length : 0;
    const borrowFee = (collateralData?.borrowedAmount || 0) * BORROW_FEE_RATE;
    const transactionCost = hasSelectedOptions ? TRANSACTION_COST_SOL : 0;

    return {
      optionCreationFee,
      borrowFee,
      transactionCost,
      totalFees: optionCreationFee + borrowFee + transactionCost
    };
  }, [hasSelectedOptions, selectedOptions.length, collateralData?.borrowedAmount]);

  // Calculate max profit and max loss potential using live prices
  const { maxProfit, maxLoss } = useMemo(() => {
    if (!hasSelectedOptions) {
      return { maxProfit: 0, maxLoss: 0 };
    }

    // Calculate isDebit using live totalAmount
    const isLiveDebit = totalAmount < 0;

    // For option trading (not selling), max profit and loss calculations are different
    let calculatedMaxProfit = 0;
    let calculatedMaxLoss = 0;

    // Calculate based on whether this is a net debit or credit position
    if (isLiveDebit) {
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
      maxProfit: calculatedMaxProfit,
      maxLoss: calculatedMaxLoss
    };
  }, [hasSelectedOptions, totalAmount, collateralNeeded, selectedOptions]);

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

  // Check if collateral is required for short positions
  const hasShortPositions = useMemo(() => {
    return selectedOptions.some(option => option.type === 'ask')
  }, [selectedOptions])

  // Reset collateral data when short positions are removed or changed
  useEffect(() => {
    // If there are no short positions anymore, reset collateral data
    if (!hasShortPositions && collateralData) {
      if (onCollateralDataChange) {
        onCollateralDataChange(null);
      }
      return;
    }

    // If short positions changed (different strikes/expiries), reset collateral data
    if (hasShortPositions && collateralData) {
      // Get current short option identifiers
      const currentShortOptionIds = selectedOptions
        .filter(option => option.type === 'ask')
        .map(option => `${option.asset}-${option.side}-${option.strike}-${option.expiry}`)
        .sort();
      
      // Check if we have stored short option identifiers to compare against
      const storedShortOptionIds = collateralData.shortOptionIds || [];
      
      // If the short options have changed, reset collateral data
      if (JSON.stringify(currentShortOptionIds) !== JSON.stringify(storedShortOptionIds)) {
        if (onCollateralDataChange) {
          onCollateralDataChange(null);
        }
      }
    }
  }, [hasShortPositions, selectedOptions, collateralData, onCollateralDataChange]);

  const isCollateralRequired = hasShortPositions && collateralNeeded > 0 && !collateralData?.hasEnoughCollateral

  // Handle collateral modal confirmation
  const handleCollateralConfirm = (data: CollateralData) => {
    if (onCollateralDataChange) {
      onCollateralDataChange(data)
    }
  }

  // Handle collateral modal close
  const handleCollateralModalClose = () => {
    setIsCollateralModalOpen(false)
  }
  
  const handleOpenCollateralModal = () => {
    setIsCollateralModalOpen(true)
  }
  
  // Expose the collateral modal opening function to parent
  useEffect(() => {
    if (onProvideCollateralRef) {
      onProvideCollateralRef(handleOpenCollateralModal)
    }
  }, [onProvideCollateralRef])

  // Handle placing an order
  const handlePlaceOrder = () => {
    if (!hasSelectedOptions) return;

    // If collateral is required for short positions, open modal instead
    if (isCollateralRequired) {
      setIsCollateralModalOpen(true)
      return
    }

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
              <h4 className="text-sm font-medium text-white">Option Greeks</h4>
            </div>
            
            {/* Option Greeks Section */}
            <div className="grid grid-cols-5 gap-4 justify-items-center mb-6">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Delta</p>
                  <Tooltip 
                    content={
                      <div className="text-xs font-light text-white/70 max-w-xs">
                        Measures the rate of change of the option&apos;s price with respect to changes in the underlying asset&apos;s price.
                      </div>
                    }
                    placement="top"
                  >
                    <Info className="w-3 h-3 text-white/30 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-sm font-medium text-white transition-all duration-300 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]">
                  {hasSelectedOptions ? totalGreeks.delta.toFixed(3) : '--'}
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Theta</p>
                  <Tooltip 
                    content={
                      <div className="text-xs font-light text-white/70 max-w-xs">
                        Measures the rate of decline in the value of an option due to the passage of time (time decay).
                      </div>
                    }
                    placement="top"
                  >
                    <Info className="w-3 h-3 text-white/30 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-sm font-medium text-white transition-all duration-300 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]">
                  {hasSelectedOptions ? totalGreeks.theta.toFixed(3) : '--'}
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Gamma</p>
                  <Tooltip 
                    content={
                      <div className="text-xs font-light text-white/70 max-w-xs">
                        Measures the rate of change of delta with respect to changes in the underlying price.
                      </div>
                    }
                    placement="top"
                  >
                    <Info className="w-3 h-3 text-white/30 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-sm font-medium text-white transition-all duration-300 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]">
                  {hasSelectedOptions ? totalGreeks.gamma.toFixed(3) : '--'}
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Vega</p>
                  <Tooltip 
                    content={
                      <div className="text-xs font-light text-white/70 max-w-xs">
                        Measures sensitivity to volatility. Shows how much an option&apos;s price will change for a 1% change in implied volatility.
                      </div>
                    }
                    placement="top"
                  >
                    <Info className="w-3 h-3 text-white/30 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-sm font-medium text-white transition-all duration-300 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]">
                  {hasSelectedOptions ? totalGreeks.vega.toFixed(3) : '--'}
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Rho</p>
                  <Tooltip 
                    content={
                      <div className="text-xs font-light text-white/70 max-w-xs">
                        Measures sensitivity to interest rate changes. Shows how much an option&apos;s price will change for a 1% change in interest rates.
                      </div>
                    }
                    placement="top"
                  >
                    <Info className="w-3 h-3 text-white/30 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-sm font-medium text-white transition-all duration-300 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)] hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]">
                  {hasSelectedOptions ? totalGreeks.rho.toFixed(3) : '--'}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                  <Receipt className="w-3 h-3 text-[#4a85ff]" />
                </div>
                <h4 className="text-sm font-medium text-white">Order Summary</h4>
              </div>
              
              {/* Order Summary Section */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-items-center">
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
                    <p className="text-xs text-white/40">Premium</p>
                  </div>
                  <p className="text-sm font-medium text-blue-400 transition-all duration-300 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)] hover:drop-shadow-[0_0_12px_rgba(96,165,250,1)]">
                    {hasSelectedOptions ? `$${formattedPremiumPerShare}` : '--'}
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-white/40">Moneyness</p>
                    <Tooltip 
                      content={
                        <div className="text-xs font-light text-white/70 max-w-xs">
                          Shows how much of the option&apos;s premium comes from immediate profit (IV) vs time/volatility value (EV). Helps assess risk and pricing efficiency.
                        </div>
                      }
                      placement="top"
                    >
                      <Info className="w-3 h-3 text-white/30 cursor-help" />
                    </Tooltip>
                  </div>
                  {/* Value Breakdown Display - Now supports multiple contracts */}
                  {(() => {
                    if (!hasSelectedOptions || !underlyingPrice) {
                      return <p className="text-sm font-medium text-white">-</p>;
                    }

                    // Calculate total intrinsic and extrinsic value across all selected options using live prices
                    let totalIntrinsicValue = 0;
                    let totalExtrinsicValue = 0;

                    selectedOptions.forEach(option => {
                      const quantity = option.quantity || 1;
                      const liveOptionPrice = getLiveOptionPrice(option);
                      
                      if (liveOptionPrice > 0) {
                        const optionIntrinsicValue = calculateIntrinsicValue(option.side, underlyingPrice, option.strike);
                        const optionExtrinsicValue = calculateExtrinsicValue(liveOptionPrice, optionIntrinsicValue);
                        
                        // Weight by quantity (but not contract size since we're showing per-share values)
                        totalIntrinsicValue += optionIntrinsicValue * quantity;
                        totalExtrinsicValue += optionExtrinsicValue * quantity;
                      }
                    });

                    const totalValue = totalIntrinsicValue + totalExtrinsicValue;
                    
                    if (totalValue <= 0) {
                      return <p className="text-sm font-medium text-white">-</p>;
                    }

                    const intrinsicPercentage = (totalIntrinsicValue / totalValue) * 100;
                    const extrinsicPercentage = (totalExtrinsicValue / totalValue) * 100;
                    const intrinsicDominant = intrinsicPercentage > extrinsicPercentage;
                    
                    return (
                      <div className="flex items-center gap-2">
                        <span 
                          className={`text-xs font-medium text-green-400 transition-all duration-300 ${
                            intrinsicDominant ? 'drop-shadow-[0_0_6px_rgba(34,197,94,0.8)]' : ''
                          }`}
                        >
                          IV
                        </span>
                        
                        <Tooltip 
                          content={
                            <div className="text-xs font-light space-y-1">
                              <div><span className="text-green-400">Intrinsic Value</span>: {formatUSD(totalIntrinsicValue)} ({intrinsicPercentage.toFixed(1)}%)</div>
                              <div><span className="text-red-400">Extrinsic Value</span>: {formatUSD(totalExtrinsicValue)} ({extrinsicPercentage.toFixed(1)}%)</div>
                              <div className="text-white/60">Total Portfolio Value: {formatUSD(totalValue)}</div>
                            </div>
                          }
                          placement="top"
                        >
                          <div className="relative h-2 w-16 bg-white/10 rounded-full overflow-hidden cursor-help">
                            <div 
                              className="absolute left-0 h-full bg-green-400 transition-all duration-300"
                              style={{ 
                                width: `${intrinsicPercentage}%`,
                                boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
                              }}
                            />
                            <div 
                              className="absolute right-0 h-full bg-red-400 transition-all duration-300"
                              style={{ 
                                width: `${extrinsicPercentage}%`,
                                boxShadow: '0 0 8px rgba(248, 113, 113, 0.6)'
                              }}
                            />
                          </div>
                        </Tooltip>
                        
                        <span 
                          className={`text-xs font-medium text-red-400 transition-all duration-300 ${
                            !intrinsicDominant ? 'drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]' : ''
                          }`}
                        >
                          EV
                        </span>
                      </div>
                    );
                  })()}
                </div>
                
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
                    {hasSelectedOptions ? (!Number.isFinite(maxProfit) ? 'Unlimited' : formatUSD(maxProfit)) : '--'}
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
          borrowedAmount={collateralData?.borrowedAmount || 0}
        />
      </motion.div>

      {/* Place Order Button */}
      <motion.div variants={itemVariants}>
        <Tooltip 
          content={
            insufficientOptions 
              ? "There are not enough options available to trade for the quantity selected." 
              : isCollateralRequired 
                ? "Short positions require collateral. Please provide collateral to proceed with the order."
                : undefined
          }
          isDisabled={!insufficientOptions && !isCollateralRequired}
        >
          <div 
            ref={placeOrderButtonRef}
            className="relative transition-all duration-300"
            style={{
              background: hasSelectedOptions && !isPlacingOrder && !insufficientOptions && !orderSuccess && !isCollateralRequired ? `
                radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                  rgba(74, 133, 255, calc(0.2 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                  rgba(24, 81, 196, calc(0.1 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                  transparent 50%
                )
              ` : 'transparent',
              borderRadius: '12px',
              padding: '2px',
              transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
            }}
          >
            <Button 
              className={cn(
                "w-full h-14 font-semibold text-lg transition-all duration-300",
                !hasSelectedOptions || isPlacingOrder || insufficientOptions || isCollateralRequired
                  ? "bg-white/10 text-white/40 border border-white/20"
                  : orderSuccess
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25"
                    : "bg-gradient-to-r from-[#4a85ff] to-[#1851c4] text-white shadow-lg shadow-[#4a85ff]/25 hover:shadow-[#4a85ff]/40"
              )}
              isDisabled={!hasSelectedOptions || isPlacingOrder || insufficientOptions || isCollateralRequired}
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
          </div>
        </Tooltip>
      </motion.div>

      {/* Collateral Modal */}
      <CollateralModal
        isOpen={isCollateralModalOpen}
        onClose={handleCollateralModalClose}
        onConfirm={handleCollateralConfirm}
        selectedOptions={selectedOptions}
        selectedAsset={selectedAsset}
        isDebit={isDebit}
        externalCollateralNeeded={collateralNeeded}
      />
    </motion.div>
  )
}