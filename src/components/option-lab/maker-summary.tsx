import { Card, CardBody, CardHeader, Tooltip, Chip } from '@heroui/react'
import { calculateTotalPremium, calculateLiquidationPrice } from "@/constants/option-lab/calculations"
import { MakerPnlChart } from "./maker-pnl-chart"
import { formatNumberWithCommas } from '@/utils/utils'
import { useMemo } from "react"
import { Activity, Target, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'

export interface OptionPosition {
  quantity: number;
  strikePrice: string | number;
  premium: string | number;
  optionType: string;
  asset: string;
}

export interface MakerSummaryProps {
  options: OptionPosition[];
  onRemoveOption: (index: number) => void;
  collateralProvided: number;
  leverage: number;
  assetPrice?: number | null;
}

export function MakerSummary({ 
  options, 
  onRemoveOption,
  collateralProvided,
  leverage,
  assetPrice = null
}: MakerSummaryProps) {
  const totalPremium = calculateTotalPremium(options);
  
  // Calculate PnL data points similar to the PnL chart
  const pnlPoints = useMemo(() => {
    if (options.length === 0 || !collateralProvided) return [];
    
    // Calculate total premium received (this is our max profit at expiration)
    const totalPremium = options.reduce((acc, opt) => 
      acc + (Number(opt.premium) * Number(opt.quantity) * 100), 0);
      
    // For the price range, use the weighted average of strike prices as center point
    const totalQuantity = options.reduce((acc, opt) => acc + Number(opt.quantity), 0);
    const avgStrike = options.reduce(
      (acc, opt) => acc + (Number(opt.strikePrice) * Number(opt.quantity)), 0
    ) / totalQuantity;
    
    // Create a wider price range for better visualization and finding liquidation points
    const priceRange = avgStrike * 1.0; // 100% range for better chance of finding liquidation points
    const minPrice = Math.max(avgStrike - priceRange, 0);
    const maxPrice = avgStrike + priceRange;
    const steps = 200; // Higher resolution for more accurate liquidation point detection
    const priceStep = (maxPrice - minPrice) / steps;
    
    // Create points array
    return Array.from({ length: steps + 1 }, (_, i) => {
      const price = minPrice + (i * priceStep);
      
      // Calculate PnL at each price point
      let pnl = totalPremium;
      
      options.forEach(option => {
        const quantity = Number(option.quantity);
        const strike = Number(option.strikePrice);
        const contractSize = 100; // Each contract represents 100 units
        const isCall = option.optionType.toLowerCase() === 'call';
        
        // Calculate intrinsic value
        const intrinsicValue = isCall 
          ? Math.max(0, price - strike)
          : Math.max(0, strike - price);
          
        // For maker/seller, we lose money as option goes ITM
        pnl -= quantity * intrinsicValue * contractSize;
      });
      
      // Apply leverage effect on losses (but not on profits)
      if (pnl < 0) {
        pnl = pnl * leverage;
      }
      
      // Calculate percentage value relative to collateral
      const percentageValue = (pnl / collateralProvided) * 100;
      
      return {
        price,
        pnl,
        percentageValue
      };
    });
  }, [options, collateralProvided, leverage]);
  
  // Find liquidation points (where PnL = -100% of collateral)
  const exactLiquidationPrices = useMemo(() => {
    if (pnlPoints.length === 0) return { upward: null, downward: null };
    
    // Find points where percentage value is closest to -100%
    // First sort points by price
    const sortedPoints = [...pnlPoints].sort((a, b) => a.price - b.price);
    
    // Find the points where the percentage crosses or gets very close to -100%
    let downwardPoint = null;
    let upwardPoint = null;
    
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const current = sortedPoints[i];
      const next = sortedPoints[i + 1];
      
      // Check if we cross the -100% threshold (or get very close)
      const currentIsAbove = current.percentageValue > -99.5;
      const nextIsBelow = next.percentageValue <= -99.5;
      
      if (currentIsAbove && nextIsBelow) {
        // If we're moving from higher to lower prices (for puts)
        if (current.price > next.price && !downwardPoint) {
          // Interpolate for more accuracy
          const ratio = (current.percentageValue - (-100)) / (current.percentageValue - next.percentageValue);
          const interpolatedPrice = current.price - ratio * (current.price - next.price);
          downwardPoint = interpolatedPrice;
        }
        // If we're moving from lower to higher prices (for calls)
        else if (current.price < next.price && !upwardPoint) {
          // Interpolate for more accuracy
          const ratio = (current.percentageValue - (-100)) / (current.percentageValue - next.percentageValue);
          const interpolatedPrice = current.price + ratio * (next.price - current.price);
          upwardPoint = interpolatedPrice;
        }
      }
    }
    
    // For points that are very close to -100%, consider them actual liquidation points
    if (!downwardPoint) {
      // Use find instead of reduce to avoid TypeScript errors
      const minNegative = sortedPoints.find(point => 
        point.percentageValue <= -99 && point.percentageValue > -101 && point.price < (assetPrice || Infinity)
      );
      
      if (minNegative) {
        downwardPoint = minNegative.price;
      }
    }
    
    if (!upwardPoint) {
      // Find the highest price point that is close to -100%
      let maxNegativePoint = null;
      let maxNegativePrice = 0;
      
      for (const point of sortedPoints) {
        if (point.percentageValue <= -99 && 
            point.percentageValue > -101 && 
            point.price > (assetPrice || 0) && 
            point.price > maxNegativePrice) {
          maxNegativePoint = point;
          maxNegativePrice = point.price;
        }
      }
      
      if (maxNegativePoint) {
        upwardPoint = maxNegativePoint.price;
      }
    }
    
    return { 
      upward: upwardPoint, 
      downward: downwardPoint 
    };
  }, [pnlPoints, assetPrice]);
  
  // Use the exact liquidation points if found, otherwise fall back to the estimated prices
  const liquidationPrices = useMemo(() => {
    if (!assetPrice || assetPrice <= 0 || options.length === 0) {
      return { upward: null, downward: null };
    }
    
    // If we found exact liquidation points from the PnL chart data, use those
    if (exactLiquidationPrices.upward || exactLiquidationPrices.downward) {
      return exactLiquidationPrices;
    }
    
    // Otherwise fall back to the estimated calculation
    return calculateLiquidationPrice(
      options,
      collateralProvided,
      leverage,
      assetPrice
    );
  }, [options, collateralProvided, leverage, assetPrice, exactLiquidationPrices]);

  // Calculate position size (collateral provided + borrowed amount)
  const positionSize = useMemo(() => {
    // Position size = collateral * leverage
    return collateralProvided * leverage;
  }, [collateralProvided, leverage]);

  // Calculate max loss - this is limited to the collateral provided
  const maxLoss = useMemo(() => {
    // When using leverage, max loss is limited to the collateral provided
    return collateralProvided;
  }, [collateralProvided]);

  return (
    <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-[#4a85ff] to-[#5829f2] bg-clip-text text-transparent">
            Strategy Analysis
          </h3>
          {options.length > 0 && (
            <div className="flex items-center gap-2">
              <Chip
                size="sm"
                variant="flat"
                className={totalPremium > maxLoss ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
                startContent={totalPremium > maxLoss ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              >
                Max: {totalPremium > maxLoss 
                  ? `+$${totalPremium.toFixed(2)}` 
                  : `-$${maxLoss.toFixed(2)}`}
              </Chip>
              {(liquidationPrices.upward || liquidationPrices.downward) && (
                <Chip
                  size="sm"
                  variant="flat"
                  className="bg-white/10 text-white/70"
                  startContent={<Target className="w-3 h-3" />}
                >
                  Liq: ${(liquidationPrices.upward || liquidationPrices.downward)?.toFixed(2)}
                </Chip>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardBody>
        {options.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-[200px] flex items-center justify-center"
          >
            <div className="text-center space-y-3">
              <Activity className="w-12 h-12 text-white/30 mx-auto" />
              <div className="space-y-2">
                <p className="text-white/60">Add options to see P&L projection at expiration</p>
                <p className="text-sm text-white/40">
                  Configure your option strategy using the form below
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* PnL Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="h-[300px]">
                <MakerPnlChart 
                  options={options}
                  collateralProvided={collateralProvided}
                  leverage={leverage}
                  assetPrice={assetPrice}
                  liquidationPrices={liquidationPrices}
                />
              </div>
            </motion.div>

            {/* Metrics Section */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
            >
              {/* Position Size */}
              <div className="flex flex-col items-center p-2">
                <Tooltip content={`Total capital deployed (your collateral + borrowed funds with ${leverage}x leverage)`}>
                  <span className="text-xs text-white/60 mb-1 cursor-help border-b border-dotted border-white/30">
                    Position Size
                  </span>
                </Tooltip>
                <span className="font-bold text-sm text-white">
                  ${formatNumberWithCommas(positionSize)}
                </span>
              </div>

              {/* Max Potential Profit */}
              <div className="flex flex-col items-center p-2">
                <Tooltip content="Maximum profit potential before any transaction costs or fees. For option sellers, the maximum profit is limited to the premium collected.">
                  <span className="text-xs text-white/60 mb-1 cursor-help border-b border-dotted border-white/30">
                    Max Profit
                  </span>
                </Tooltip>
                <span className="font-bold text-sm text-green-400">
                  ${formatNumberWithCommas(totalPremium)}
                </span>
              </div>

              {/* Max Potential Loss */}
              <div className="flex flex-col items-center p-2">
                <Tooltip content="Maximum amount you can lose on this position, limited to your provided collateral. When your total losses approach this amount, your position may be liquidated.">
                  <span className="text-xs text-white/60 mb-1 cursor-help border-b border-dotted border-white/30">
                    Max Loss
                  </span>
                </Tooltip>
                <span className="font-bold text-sm text-red-400">
                  -${maxLoss.toFixed(2)}
                </span>
              </div>

              {/* Liquidation Threshold */}
              <div className="flex flex-col items-center p-2">
                <Tooltip content={`Asset price at which you would lose 100% of your collateral, leading to liquidation with your current leverage (${leverage}x). This is calculated based on your total position, option premiums, and potential losses at expiration.`}>
                  <span className="text-xs text-white/60 mb-1 cursor-help border-b border-dotted border-white/30">
                    Liquidation Price
                  </span>
                </Tooltip>
                {(liquidationPrices.upward || liquidationPrices.downward) ? (
                  <div className="flex flex-col items-center">
                    {liquidationPrices.upward && (
                      <div className="flex items-center">
                        <span className="font-bold text-sm text-white">
                          ${liquidationPrices.upward.toFixed(2)}
                        </span>
                        {assetPrice && (
                          <span className="text-xs ml-1 font-normal text-white/60">
                            ({((liquidationPrices.upward / assetPrice - 1) * 100).toFixed(1)}% ↑)
                          </span>
                        )}
                      </div>
                    )}
                    {liquidationPrices.downward && (
                      <div className="flex items-center mt-1">
                        <span className="font-bold text-sm text-white">
                          ${liquidationPrices.downward.toFixed(2)}
                        </span>
                        {assetPrice && (
                          <span className="text-xs ml-1 font-normal text-white/60">
                            ({((1 - liquidationPrices.downward / assetPrice) * 100).toFixed(1)}% ↓)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="font-bold text-sm text-white/40">--</span>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}