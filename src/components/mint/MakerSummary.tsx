import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/misc/utils"
import { calculateTotalPremium, calculateLiquidationPrice } from "@/constants/mint/calculations"
import { MakerPnlChart } from "./MakerPnlChart"
import { useMemo } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { STANDARD_CONTRACT_SIZE } from "@/constants/mint/constants"
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

  // Calculate position size (total notional value based on strike prices)
  const positionSize = useMemo(() => {
    return options.reduce((total, option) => {
      const strikePrice = Number(option.strikePrice);
      const quantity = Number(option.quantity);
      const contractSize = STANDARD_CONTRACT_SIZE; // Each option represents 100 units of the underlying
      
      return total + (strikePrice * quantity * contractSize);
    }, 0);
  }, [options]);

  // Calculate max loss - using similar logic to MakerPnlChart.tsx
  const maxLoss = useMemo(() => {
    let totalRisk = 0;
    
    options.forEach(option => {
      const quantity = Number(option.quantity);
      const strike = Number(option.strikePrice);
      const contractSize = 100;
      
      if (option.optionType.toLowerCase() === 'put') {
        // For puts, max loss is when underlying goes to zero
        totalRisk += strike * quantity * contractSize;
      } else {
        // For calls, max loss depends on how far the underlying could realistically go up
        // Use 2x the strike price as a conservative estimate for max upside move
        const maxUpside = strike * 2;
        totalRisk += (maxUpside - strike) * quantity * contractSize;
      }
    });
    
    return totalRisk;
  }, [options]);

  return (
    <Card className="h-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
      transition-all duration-300 hover:bg-transparent overflow-hidden shadow-lg">
      <CardContent className="px-4 py-4">
        {options.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground 
            border border-dashed border-[#e5e5e5]/50 dark:border-[#393939] rounded-lg">
            Add options to see PnL projection at expiration
          </div>
        ) : (
          <div className="space-y-4">
            {/* PnL Chart */}
            <div className="rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50 p-4">
              <h3 className="text-lg font-semibold mb-3">Profit & Loss Projection</h3>
              <MakerPnlChart 
                options={options}
                collateralProvided={collateralProvided}
                leverage={leverage}
                assetPrice={assetPrice}
              />
            </div>

            {/* Options List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Position Size - Added to the left of Max Potential Profit */}
                  <div className="flex flex-col">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground cursor-help">
                            <span className="border-b border-dotted border-muted-foreground">Position Size</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Total notional value of all options (Strike Price × Quantity × 100)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="font-semibold text-[#4a85ff]">${positionSize.toFixed(2)}</span>
                  </div>

                  {/* Max Potential Profit */}
                  <div className="flex flex-col">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground cursor-help">
                            <span className="border-b border-dotted border-muted-foreground">Max Potential Profit</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Maximum profit potential before any transaction costs or fees</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="font-semibold text-green-500">${totalPremium.toFixed(2)}</span>
                  </div>

                  {/* Max Loss - Added next to Max Potential Profit */}
                  <div className="flex flex-col">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground cursor-help">
                            <span className="border-b border-dotted border-muted-foreground">Max Potential Loss</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Maximum amount you can lose on this position</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="font-semibold text-red-500">-${maxLoss.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Liquidation Price Indicators moved to right side with same styling */}
                {(liquidationPrices.upward || liquidationPrices.downward) && (
                  <div className="flex flex-col">
                    <div className="mb-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="inline-flex items-center">
                            <span className="text-xs text-muted-foreground border-b border-dotted border-muted-foreground">Liquidation Threshold</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">
                              If the asset price reaches these levels, your position may be liquidated based on your current leverage ({leverage}x).
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex gap-2">
                      {liquidationPrices.upward && (
                        <div className="flex items-center">
                          <span className="text-sm font-semibold text-orange-500">
                            ${liquidationPrices.upward.toFixed(2)}
                          </span>
                          {assetPrice && (
                            <span className="text-xs ml-1 opacity-75">
                              ({((liquidationPrices.upward / assetPrice - 1) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      )}
                      {liquidationPrices.downward && (
                        <div className="flex items-center">
                          <div className="h-2 w-2 bg-orange-500 rounded-full mr-1.5"></div>
                          <span className="text-sm font-semibold text-orange-500">
                            ${liquidationPrices.downward.toFixed(2)}
                          </span>
                          {assetPrice && (
                            <span className="text-xs ml-1 opacity-75">
                              ({((1 - liquidationPrices.downward / assetPrice) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 