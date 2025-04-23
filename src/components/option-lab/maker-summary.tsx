import { Card, CardContent } from "@/components/ui/card"
import { calculateTotalPremium, calculateLiquidationPrice } from "@/constants/option-lab/calculations"
import { MakerPnlChart } from "./maker-pnl-chart"
import { useMemo } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
    <Card className="h-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
      transition-all duration-300 hover:bg-transparent overflow-hidden shadow-lg">
      <CardContent className="px-2 sm:px-4 py-3 sm:py-4">
        {options.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs sm:text-sm text-muted-foreground 
            border border-dashed border-[#e5e5e5]/50 dark:border-[#393939] rounded-lg">
            Add options to see PnL projection at expiration
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* PnL Chart */}
            <div className="w-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
              border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
              hover:bg-transparent shadow-lg rounded-lg p-2 sm:p-4">
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 cursor-help">
                      <span className="border-b border-dotted border-slate-500">Profit & Loss Projection</span>
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" side="top">
                    <p className="text-xs sm:text-sm">This chart shows your projected profit or loss at option expiration across different asset price points.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="h-64 sm:h-auto">
                <MakerPnlChart 
                  options={options}
                  collateralProvided={collateralProvided}
                  leverage={leverage}
                  assetPrice={assetPrice}
                />
              </div>
            </div>

            {/* Options List */}
            <div className="space-y-2">
              {/* Metrics Section - Redesigned with single row layout */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
                {/* Position Size */}
                <div className="flex flex-col p-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground mb-1 cursor-help">
                          <span className="border-b border-dotted border-muted-foreground">Position Size</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">Total capital deployed (your collateral + borrowed funds with {leverage}x leverage)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-bold text-sm sm:text-lg">
                    ${positionSize.toFixed(2)}
                  </span>
                </div>

                {/* Max Potential Profit */}
                <div className="flex flex-col p-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground mb-1 cursor-help">
                          <span className="border-b border-dotted border-muted-foreground">Max Potential Profit</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">Maximum profit potential before any transaction costs or fees</p>
                        <p className="text-xs mt-1">For option sellers, the maximum profit is limited to the premium collected.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-bold text-sm sm:text-lg text-green-500">
                    ${totalPremium.toFixed(2)}
                  </span>
                </div>

                {/* Max Potential Loss */}
                <div className="flex flex-col p-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground mb-1 cursor-help">
                          <span className="border-b border-dotted border-muted-foreground">Max Potential Loss</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">Maximum amount you can lose on this position, limited to your provided collateral</p>
                        <p className="text-xs mt-1">When your total losses approach this amount, your position may be liquidated.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-bold text-sm sm:text-lg text-red-500">
                    -${maxLoss.toFixed(2)}
                  </span>
                </div>

                {/* Liquidation Threshold */}
                <div className="flex flex-col p-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground mb-1 cursor-help">
                          <span className="border-b border-dotted border-muted-foreground">Liquidation Price</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs">
                          Asset price at which you would lose 100% of your collateral, leading to liquidation with your current leverage ({leverage}x).
                        </p>
                        <p className="text-xs mt-1">
                          This is calculated based on your total position, option premiums, and potential losses at expiration.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {(liquidationPrices.upward || liquidationPrices.downward) ? (
                    <div className="flex flex-col">
                      {liquidationPrices.upward && (
                        <div className="flex items-start">
                          <span className="font-bold text-sm sm:text-lg">
                            ${liquidationPrices.upward.toFixed(2)}
                          </span>
                          {assetPrice && (
                            <span className="text-xs ml-1 font-normal opacity-75 mt-1">
                              ({((liquidationPrices.upward / assetPrice - 1) * 100).toFixed(1)}% ↑)
                            </span>
                          )}
                        </div>
                      )}
                      {liquidationPrices.downward && (
                        <div className="flex items-start mt-1">
                          <span className="font-bold text-sm sm:text-lg">
                            ${liquidationPrices.downward.toFixed(2)}
                          </span>
                          {assetPrice && (
                            <span className="text-xs ml-1 font-normal opacity-75 mt-1">
                              ({((1 - liquidationPrices.downward / assetPrice) * 100).toFixed(1)}% ↓)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-bold text-sm sm:text-lg text-muted-foreground">--</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 