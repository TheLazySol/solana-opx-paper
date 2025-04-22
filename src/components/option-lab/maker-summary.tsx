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
  
  // Calculate liquidation prices
  const liquidationPrices = useMemo(() => {
    if (!assetPrice || assetPrice <= 0 || options.length === 0) {
      return { upward: null, downward: null };
    }
    return calculateLiquidationPrice(
      options,
      collateralProvided,
      leverage,
      assetPrice
    );
  }, [options, collateralProvided, leverage, assetPrice]);

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
                          <span className="border-b border-dotted border-muted-foreground">Liquidation Threshold</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs">
                          If the asset price reaches these levels, your position may be liquidated based on your current leverage ({leverage}x).
                        </p>
                        <p className="text-xs mt-1">
                          This is calculated based on your collateral and the potential losses from your option positions.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {(liquidationPrices.upward || liquidationPrices.downward) ? (
                    <div className="flex flex-col">
                      {liquidationPrices.upward && (
                        <span className="font-bold text-sm sm:text-lg">
                          ${liquidationPrices.upward.toFixed(2)}
                          {assetPrice && (
                            <span className="text-xs ml-1 font-normal opacity-75">
                              ({((liquidationPrices.upward / assetPrice - 1) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      )}
                      {!liquidationPrices.upward && liquidationPrices.downward && (
                        <span className="font-bold text-sm sm:text-lg">
                          ${liquidationPrices.downward.toFixed(2)}
                          {assetPrice && (
                            <span className="text-xs ml-1 font-normal opacity-75">
                              ({((1 - liquidationPrices.downward / assetPrice) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </span>
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