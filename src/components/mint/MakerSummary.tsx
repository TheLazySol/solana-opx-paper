import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/misc/utils"
import { calculateTotalPremium, calculateLiquidationPrice } from "@/constants/mint/calculations"
import { MakerPnlChart } from "./MakerPnlChart"
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
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Max Potential Profit</span>
                    <span className="font-semibold text-green-500">${totalPremium.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Liquidation Price Indicators moved to right side with same styling */}
                {(liquidationPrices.upward || liquidationPrices.downward) && (
                  <div className="flex flex-col">
                    <div className="mb-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="inline-flex items-center">
                            <span className="text-xs text-muted-foreground">Liquidation Thresholds</span>
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
                          <div className="h-2 w-2 bg-orange-500 rounded-full mr-1.5"></div>
                          <span className="text-sm font-medium text-orange-500">
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
                          <span className="text-sm font-medium text-orange-500">
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