import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SelectedOption } from './option-data'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TradeCollateralProviderProps {
  selectedOptions: SelectedOption[]
  selectedAsset: string
}

export const TradeCollateralProvider: FC<TradeCollateralProviderProps> = ({
  selectedOptions = [],
  selectedAsset
}) => {
  const hasSelectedOptions = selectedOptions.length > 0
  const { price: underlyingPrice } = useAssetPriceInfo(selectedAsset)
  const contractSize = 100 // Each option contract represents 100 units

  // Calculate total collateral needed based on option positions
  const calculateCollateralNeeded = () => {
    let totalCollateral = 0
    
    // Separate options by type
    const shortCalls = selectedOptions.filter(opt => opt.type === 'ask' && opt.side === 'call')
    const shortPuts = selectedOptions.filter(opt => opt.type === 'ask' && opt.side === 'put')
    const longCalls = selectedOptions.filter(opt => opt.type === 'bid' && opt.side === 'call')
    const longPuts = selectedOptions.filter(opt => opt.type === 'bid' && opt.side === 'put')

    // Handle short calls
    shortCalls.forEach(shortCall => {
      const quantity = shortCall.quantity || 1
      // Short calls require full underlying price as collateral if not covered
      const numUncovered = Math.max(0, quantity - longCalls.length)
      if (numUncovered > 0) {
        totalCollateral += underlyingPrice * contractSize * numUncovered
      }
    })

    // Handle short puts
    shortPuts.forEach(shortPut => {
      const quantity = shortPut.quantity || 1
      // Find the highest strike long put that could cover this short put
      const coveringPut = longPuts.find(lp => lp.strike >= shortPut.strike)
      
      if (!coveringPut) {
        // If no covering put, full collateral needed
        totalCollateral += shortPut.strike * contractSize * quantity
      }
    })

    return totalCollateral
  }

  const collateralNeeded = calculateCollateralNeeded()
  const formattedCollateral = collateralNeeded.toFixed(2)

  // Calculate total premium
  const totalPremium = selectedOptions.reduce((total, option) => {
    const quantity = option.quantity || 1
    const optionPrice = option.limitPrice !== undefined ? option.limitPrice : option.price
    return total + (optionPrice * quantity * contractSize)
  }, 0)

  // Calculate fees (simplified for now)
  const tradingFee = totalPremium * 0.001 // 0.1% trading fee
  const networkFee = 0.00001 // SOL network fee

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

            {/* Fees Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground cursor-help">Trading Fee</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>0.1% fee on the total premium</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="font-medium">${tradingFee.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground cursor-help">Network Fee</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Solana network transaction fee</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="font-medium">{networkFee} SOL</span>
              </div>
            </div>

            <Separator className="my-2 bg-white/10" />

            {/* Total Section */}
            <div className="flex items-center justify-between">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-muted-foreground cursor-help">Total Required</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total collateral plus fees required to execute this trade</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-lg font-semibold text-white">
                ${(collateralNeeded + tradingFee).toFixed(2)}
              </span>
            </div>
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