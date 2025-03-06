import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MakerSummaryProps } from "@/types/mint/optionTypes"
import { cn } from "@/lib/misc/utils"
import { calculateTotalPremium, calculateCollateralNeeded, calculateRequiredCollateral, hasEnoughCollateral, calculateOptimalLeverage } from "@/constants/mint/calculations"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { useState, useEffect } from "react"
import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { COLLATERAL_TYPES } from "@/constants/mint/constants"
import { MakerPnlChart } from "./MakerPnlChart"

export interface MakerSummaryState {
  hasEnoughCollateral: boolean;
  collateralProvided: string;
  leverage: number;
  collateralType: string;
}

export function MakerSummary({ 
  options, 
  onRemoveOption,
  onStateChange
}: MakerSummaryProps & { 
  onStateChange?: (state: MakerSummaryState) => void 
}) {
  const totalPremium = calculateTotalPremium(options)
  const baseCollateralNeeded = calculateCollateralNeeded(options)
  const [collateralProvided, setCollateralProvided] = useState<string>("")
  const [leverage, setLeverage] = useState<number[]>([1])
  const [collateralType, setCollateralType] = useState<typeof COLLATERAL_TYPES[number]['value']>(
    COLLATERAL_TYPES.find(type => type.default)?.value || "USDC"
  )
  const maxLeverage = 5

  // Calculate position size (total available capital with leverage)
  const positionSize = Number(collateralProvided || 0) * leverage[0]
  
  // Calculate required collateral based on position size
  const collateralNeeded = calculateRequiredCollateral(baseCollateralNeeded, positionSize)
  
  // Check if enough collateral is provided
  const isEnoughCollateral = hasEnoughCollateral(
    baseCollateralNeeded,
    Number(collateralProvided || 0),
    leverage[0]
  )

  // Memoize the state object to prevent unnecessary updates
  const currentState = React.useMemo(() => ({
    hasEnoughCollateral: isEnoughCollateral,
    collateralProvided,
    leverage: leverage[0],
    collateralType
  }), [isEnoughCollateral, collateralProvided, leverage, collateralType])

  // Store previous state to compare
  const prevStateRef = React.useRef(currentState)

  // Notify parent component of state changes only when values actually change
  useEffect(() => {
    if (
      prevStateRef.current.hasEnoughCollateral !== currentState.hasEnoughCollateral ||
      prevStateRef.current.collateralProvided !== currentState.collateralProvided ||
      prevStateRef.current.leverage !== currentState.leverage ||
      prevStateRef.current.collateralType !== currentState.collateralType
    ) {
      prevStateRef.current = currentState
      onStateChange?.(currentState)
    }
  }, [currentState, onStateChange])

  return (
    <Card className="mt-6 card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
      transition-all duration-300 hover:bg-transparent overflow-hidden shadow-lg">
      <div className="relative z-10">
        <CardHeader className="pb-2 pt-2 border-b border-[#e5e5e5]/20 dark:border-[#393939]/50">
          <CardTitle className="text-lg font-semibold text-center">
            Maker Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {options.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground 
              border border-dashed border-[#e5e5e5]/50 dark:border-[#393939] rounded-lg">
              Add options to see them summarized here
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              {/* Left side - PnL Chart and Options List */}
              <div className="col-span-9 space-y-6">
                <div className="rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50 p-4">
                  <h3 className="text-lg font-semibold mb-4">Profit & Loss Projection</h3>
                  <MakerPnlChart 
                    options={options}
                    collateralProvided={Number(collateralProvided) || 0}
                    leverage={leverage[0]}
                  />
                </div>

                {/* Options List moved below chart */}
                <div className="space-y-2.5">
                  <h3 className="text-lg font-semibold mb-4">Option Contracts</h3>
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
              
              {/* Right side - Summary Content */}
              <div className="col-span-3 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex flex-col p-2 rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
                    <span className="text-xs text-muted-foreground">Max Profit Potential</span>
                    <span className="font-semibold text-base text-green-500">${totalPremium.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col p-2 rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
                    <span className="text-xs text-muted-foreground">Max Loss Potential</span>
                    <span className="font-semibold text-base text-red-500">${(Number(options[0]?.strikePrice || 0) * 100).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col p-2 rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
                    <span className="text-xs text-muted-foreground">Collateral Needed</span>
                    <span className={cn(
                      "font-semibold text-base",
                      positionSize > 0 && positionSize < baseCollateralNeeded 
                        ? "text-yellow-500" 
                        : isEnoughCollateral 
                          ? "text-green-500" 
                          : "text-red-500"
                    )}>${collateralNeeded.toFixed(2)}</span>
                  </div>
                </div>
                
                <Separator className="bg-[#e5e5e5]/20 dark:bg-[#393939]/50" />
                
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Provide Collateral</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={collateralType}
                        onValueChange={(value: typeof COLLATERAL_TYPES[number]['value']) => setCollateralType(value)}
                      >
                        <SelectTrigger className="h-9 w-20 bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939] focus:ring-1 focus:ring-[#4a85ff]/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLLATERAL_TYPES.map((type) => (
                            <SelectItem
                              key={type.value}
                              value={type.value}
                              className="text-sm"
                            >
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={collateralProvided}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
                            setCollateralProvided(value);
                          }
                        }}
                        min="1"
                        step="0.01"
                        className="h-9 flex-1 px-3 bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939] 
                          focus:border-[#4a85ff]/40 focus:ring-1 focus:ring-[#4a85ff]/40
                          text-right text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Leverage</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const optimalLeverage = calculateOptimalLeverage(
                            baseCollateralNeeded,
                            Number(collateralProvided || 0)
                          );
                          setLeverage([optimalLeverage]);
                        }}
                        className="h-7 px-3 py-0 text-xs bg-[#4a85ff]/10 border border-[#4a85ff]/40
                          hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60
                          transition-all duration-200"
                      >
                        Auto-Size
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Slider
                        min={1}
                        max={maxLeverage}
                        step={0.01}
                        value={leverage}
                        onValueChange={(value) => setLeverage([Number(value[0].toFixed(2))])}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={maxLeverage}
                          step={0.01}
                          value={leverage[0]}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            if (rawValue === '' || /^\d+(\.\d{0,2})?$/.test(rawValue)) {
                              const value = Number(rawValue);
                              if (!isNaN(value)) {
                                const clampedValue = Math.min(Math.max(value || 1, 1), maxLeverage);
                                setLeverage([clampedValue]);
                              }
                            }
                          }}
                          className="h-9 w-14 px-2 bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939] 
                            focus:border-[#4a85ff]/40 focus:ring-1 focus:ring-[#4a85ff]/40
                            text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="font-medium text-[#4a85ff] text-base">×</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col rounded-lg bg-[#4a85ff]/5 border border-[#4a85ff]/30">
                    <div className="flex items-center justify-between p-2.5 border-b border-[#4a85ff]/20">
                      <span className="text-sm font-medium text-[#4a85ff]">Position Size</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const optimalLeverage = calculateOptimalLeverage(
                            baseCollateralNeeded,
                            Number(collateralProvided || 0)
                          );
                          setLeverage([optimalLeverage]);
                        }}
                        className="h-7 px-2 py-0 text-xs hover:bg-[#4a85ff]/10"
                      >
                        Auto-Size
                      </Button>
                    </div>
                    <div className="p-2.5">
                      <span className={cn(
                        "font-bold text-xl",
                        isEnoughCollateral ? "text-[#4a85ff]" : "text-yellow-500"
                      )}>
                        ${positionSize.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  )
} 