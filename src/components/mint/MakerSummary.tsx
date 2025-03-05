import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MakerSummaryProps } from "@/types/mint/optionTypes"
import { cn } from "@/lib/misc/utils"
import { calculateTotalPremium, calculateCollateralNeeded } from "@/constants/mint/calculations"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { useState, useEffect } from "react"

export function MakerSummary({ options, onRemoveOption }: MakerSummaryProps) {
  const totalPremium = calculateTotalPremium(options)
  const collateralNeeded = calculateCollateralNeeded(options)
  const [collateralProvided, setCollateralProvided] = useState<string>("")
  const [leverage, setLeverage] = useState<number[]>([1])
  const maxLeverage = 5

  // Calculate total available capital with leverage
  const totalAvailableCapital = Number(collateralProvided || 0) * leverage[0]

  return (
    <Card className="mt-6 card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
      transition-all duration-300 hover:bg-transparent overflow-hidden">
      <div className="relative z-10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Maker Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {options.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground 
              border border-[#e5e5e5]/50 dark:border-[#393939] rounded-lg">
              Add options to see them summarized here
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                {options.map((option, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "group flex items-center justify-between py-2.5 px-3",
                      "backdrop-blur-sm bg-white/5 dark:bg-black/20",
                      "border border-[#e5e5e5]/50 dark:border-[#393939] rounded-lg",
                      "hover:bg-[#4a85ff]/5 hover:border-[#4a85ff]/40",
                      "transition-all duration-200 hover:shadow-[0_0_15px_rgba(74,133,255,0.2)]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-base font-semibold tracking-tight">{option.quantity}</span>
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500/10 text-red-500 rounded">SHORT</span>
                      </div>
                      <div className="flex items-center gap-1.5">
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
              
              <Separator className="my-4 bg-[#e5e5e5]/20 dark:bg-[#393939]/50" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Premium Received:</span>
                  <span className="font-medium text-green-500">${totalPremium.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Collateral Needed:</span>
                  <span className="font-medium text-yellow-500">${collateralNeeded.toFixed(2)}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Collateral Provided:</span>
                    <div className="w-32">
                      <Input
                        type="number"
                        value={collateralProvided}
                        onChange={(e) => setCollateralProvided(e.target.value)}
                        className="h-7 px-2 bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939] 
                          focus:border-[#4a85ff]/40 focus:ring-1 focus:ring-[#4a85ff]/40
                          text-right text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Leverage:</span>
                      <span className="font-medium text-[#4a85ff]">{leverage[0]}x</span>
                    </div>
                    <Slider
                      min={1}
                      max={maxLeverage}
                      step={0.1}
                      value={leverage}
                      onValueChange={setLeverage}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Available:</span>
                      <span className="font-medium text-[#4a85ff]">
                        ${totalAvailableCapital.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </div>
    </Card>
  )
} 