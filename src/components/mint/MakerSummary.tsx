import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/misc/utils"
import { calculateTotalPremium } from "@/constants/mint/calculations"
import { MakerPnlChart } from "./MakerPnlChart"

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
}

export function MakerSummary({ 
  options, 
  onRemoveOption,
  collateralProvided,
  leverage
}: MakerSummaryProps) {
  const totalPremium = calculateTotalPremium(options);

  return (
    <Card className="h-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
      transition-all duration-300 hover:bg-transparent overflow-hidden shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle>Position Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground 
            border border-dashed border-[#e5e5e5]/50 dark:border-[#393939] rounded-lg">
            Add options to see PnL projection at expiration
          </div>
        ) : (
          <div className="space-y-6">
            {/* PnL Chart */}
            <div className="rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50 p-4">
              <h3 className="text-lg font-semibold mb-4">Profit & Loss Projection</h3>
              <MakerPnlChart 
                options={options}
                collateralProvided={collateralProvided}
                leverage={leverage}
              />
            </div>

            {/* Options List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Option Contracts</h3>
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Max Profit</span>
                    <span className="font-semibold text-green-500">${totalPremium.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "group flex items-center justify-between py-2.5 px-4",
                      "backdrop-blur-sm bg-white/5 dark:bg-black/20",
                      "border border-[#e5e5e5]/50 dark:border-[#393939] rounded-lg",
                      "hover:bg-[#4a85ff]/5 hover:border-[#4a85ff]/40",
                      "transition-all duration-200 hover:shadow-[0_0_15px_rgba(74,133,255,0.2)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-semibold tracking-tight">{option.quantity}</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-500 rounded-md">SHORT</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{option.asset} {option.optionType.toUpperCase()}</span>
                        <span className="text-muted-foreground font-normal">
                          ${Number(option.strikePrice).toFixed(2)} Strike @ {Number(option.premium).toFixed(4)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveOption(index)}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                        hover:bg-destructive/20 hover:text-destructive-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 