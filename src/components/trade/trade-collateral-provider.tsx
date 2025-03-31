import { FC, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SelectedOption } from './option-data'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const COLLATERAL_TYPES = [
  { value: "USDC", label: "USDC", default: true },
  { value: "SOL", label: "SOL" },
]

const MAX_LEVERAGE = 1.5 // Maximum leverage allowed

interface TradeCollateralProviderProps {
  selectedOptions: SelectedOption[]
  selectedAsset: string
  isDebit: boolean
  externalCollateralNeeded: number
}

export const TradeCollateralProvider: FC<TradeCollateralProviderProps> = ({
  selectedOptions = [],
  selectedAsset,
  isDebit,
  externalCollateralNeeded
}) => {
  const hasSelectedOptions = selectedOptions.length > 0
  const { price: underlyingPrice } = useAssetPriceInfo(selectedAsset)
  const contractSize = 100 // Each option contract represents 100 units

  // State for collateral input and leverage
  const [collateralProvided, setCollateralProvided] = useState<string>("")
  const [leverage, setLeverage] = useState<number[]>([1])
  const [collateralType, setCollateralType] = useState<string>(
    COLLATERAL_TYPES.find(type => type.default)?.value || "USDC"
  )

  // Calculate total collateral needed based on option positions
  const calculateCollateralNeeded = () => {
    let totalCollateral = 0
    const contractSize = 100 // Each option contract represents 100 units
    
    // Separate options by type
    const shortCalls = selectedOptions.filter(opt => opt.type === 'ask' && opt.side === 'call')
    const shortPuts = selectedOptions.filter(opt => opt.type === 'ask' && opt.side === 'put')
    const longCalls = selectedOptions.filter(opt => opt.type === 'bid' && opt.side === 'call')
    const longPuts = selectedOptions.filter(opt => opt.type === 'bid' && opt.side === 'put')

    // Handle short calls
    shortCalls.forEach(shortCall => {
      const quantity = shortCall.quantity || 1
      // Find long calls with lower strike prices (these can cover the short call)
      const coveringCalls = longCalls.filter(lc => lc.strike <= shortCall.strike)
      
      if (coveringCalls.length === 0) {
        // No covering calls, need full collateral based on strike price
        totalCollateral += shortCall.strike * contractSize * quantity
      } else {
        // Calculate how many contracts are covered by long calls
        const coveredQuantity = coveringCalls.reduce((total, call) => total + (call.quantity || 1), 0)
        const uncoveredQuantity = Math.max(0, quantity - coveredQuantity)
        
        if (uncoveredQuantity > 0) {
          // Need collateral for uncovered portion based on strike price
          totalCollateral += shortCall.strike * contractSize * uncoveredQuantity
        }
      }
    })

    // Handle short puts
    shortPuts.forEach(shortPut => {
      const quantity = shortPut.quantity || 1
      // Find long puts with higher strike prices (these can cover the short put)
      const coveringPuts = longPuts.filter(lp => lp.strike >= shortPut.strike)
      
      if (coveringPuts.length === 0) {
        // No covering puts, need full collateral based on strike price
        totalCollateral += shortPut.strike * contractSize * quantity
      } else {
        // Calculate how many contracts are covered by long puts
        const coveredQuantity = coveringPuts.reduce((total, put) => total + (put.quantity || 1), 0)
        const uncoveredQuantity = Math.max(0, quantity - coveredQuantity)
        
        if (uncoveredQuantity > 0) {
          // Need collateral for uncovered portion based on strike price
          totalCollateral += shortPut.strike * contractSize * uncoveredQuantity
        }
      }
    })

    return totalCollateral
  }

  const collateralNeeded = calculateCollateralNeeded()
  const formattedCollateral = collateralNeeded.toFixed(2)

  // Calculate position size (collateral provided + borrowed amount)
  const positionSize = Number(collateralProvided || 0) * leverage[0]

  // Calculate if enough collateral is provided
  const hasEnoughCollateral = Number(collateralProvided) >= collateralNeeded / leverage[0]

  // Calculate optimal leverage based on collateral needed and provided
  const calculateOptimalLeverage = () => {
    if (!Number(collateralProvided) || Number(collateralProvided) <= 0) return 1
    const optimal = collateralNeeded / Number(collateralProvided)
    return Math.min(optimal, MAX_LEVERAGE)
  }

  return (
    <Card className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-muted-foreground">
          Collateral Requirements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasSelectedOptions ? (
          <div className="space-y-3">
            {/* Collateral Details */}
            <div className="flex flex-col p-2 rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground cursor-help">
                      Required Collateral:
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The amount of collateral needed to open this position</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="font-semibold text-lg">${formattedCollateral}</span>
            </div>

            {/* Collateral Input */}
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm font-medium mb-1 block cursor-help">
                      <span className="border-b border-dotted border-slate-500">Provide Collateral Amount</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This is the amount of collateral you want to provide for this position.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center gap-2">
                <Select
                  value={collateralType}
                  onValueChange={setCollateralType}
                  disabled={isDebit && externalCollateralNeeded === 0}
                >
                  <SelectTrigger className="h-10 w-24 bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939] focus:ring-1 focus:ring-[#4a85ff]/40">
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
                    const value = e.target.value
                    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
                      setCollateralProvided(value)
                    }
                  }}
                  disabled={isDebit && externalCollateralNeeded === 0}
                  min="1"
                  step="0.01"
                  className="h-10 flex-1 px-3 bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939] 
                    focus:border-[#4a85ff]/40 focus:ring-1 focus:ring-[#4a85ff]/40
                    text-right text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Leverage Controls */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm font-medium cursor-help">
                        <span className="border-b border-dotted border-slate-500">Leverage</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Multiply your buying power by borrowing additional capital.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex space-x-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const optimalLeverage = calculateOptimalLeverage()
                      setLeverage([optimalLeverage])
                    }}
                    className="h-6 px-2 py-0 text-xs bg-[#4a85ff]/10 border border-[#4a85ff]/40
                      hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60
                      transition-all duration-200"
                  >
                    Auto-Size
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newLeverage = Math.max(1, leverage[0] - 0.01)
                      setLeverage([newLeverage])
                    }}
                    className="h-6 w-6 p-0 text-xs bg-[#4a85ff]/10 border border-[#4a85ff]/40
                      hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60
                      transition-all duration-200 flex items-center justify-center"
                  >
                    -
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newLeverage = Math.min(MAX_LEVERAGE, leverage[0] + 0.01)
                      setLeverage([newLeverage])
                    }}
                    className="h-6 w-6 p-0 text-xs bg-[#4a85ff]/10 border border-[#4a85ff]/40
                      hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60
                      transition-all duration-200 flex items-center justify-center"
                  >
                    +
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Slider
                  min={1}
                  max={MAX_LEVERAGE}
                  step={0.01}
                  value={leverage}
                  onValueChange={setLeverage}
                  className="flex-1"
                />
                <span className="font-medium w-12 text-right">
                  {leverage[0].toFixed(2)}x
                </span>
              </div>
            </div>

            <Separator className="my-2 bg-white/10" />

            {/* Position Size */}
            <div className="flex items-center justify-between">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-muted-foreground cursor-help">Position Size</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total position size including leverage</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-lg font-semibold text-white">
                ${positionSize.toFixed(2)}
              </span>
            </div>

            {/* Not Enough Collateral Warning */}
            {!hasEnoughCollateral && Number(collateralProvided) > 0 && (
              <div className="text-sm text-red-500 mt-2">
                Not enough collateral provided. Please increase collateral or leverage.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2 text-sm text-muted-foreground">
            Select options to view collateral requirements
          </div>
        )}
      </CardContent>
    </Card>
  )
} 