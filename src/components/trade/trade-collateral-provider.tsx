import { FC, useState, useMemo, useEffect } from 'react'
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Divider, 
  Input, 
  Slider, 
  Button, 
  Select, 
  SelectItem, 
  Tooltip,
  Chip,
  Progress,
  cn
} from '@heroui/react'
import { SelectedOption } from './option-data'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { motion } from 'framer-motion'
import { BASE_ANNUAL_INTEREST_RATE, MAX_LEVERAGE } from '@/constants/constants'
import { Info, AlertTriangle, TrendingUp, DollarSign, Clock, Zap } from 'lucide-react'

const COLLATERAL_TYPES = [
  { value: "USDC", label: "USDC", default: true },
  { value: "SOL", label: "SOL" },
]

interface TradeCollateralProviderProps {
  selectedOptions: SelectedOption[]
  selectedAsset: string
  isDebit: boolean
  externalCollateralNeeded: number
  onBorrowedAmountChange?: (amount: number) => void
}

export const TradeCollateralProvider: FC<TradeCollateralProviderProps> = ({
  selectedOptions = [],
  selectedAsset,
  isDebit,
  externalCollateralNeeded,
  onBorrowedAmountChange
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

  // Reset collateral input when all options are removed
  useEffect(() => {
    if (!hasSelectedOptions) {
      setCollateralProvided("")
      setLeverage([1])
    }
  }, [hasSelectedOptions])

  // Calculate total collateral needed based on option positions
  const calculateCollateralNeeded = useMemo(() => {
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
  }, [selectedOptions])

  const formattedCollateral = calculateCollateralNeeded.toFixed(2)

  // Calculate optimal leverage based on collateral needed and provided
  const calculateOptimalLeverage = () => {
    if (!Number(collateralProvided) || Number(collateralProvided) <= 0) return 1
    const optimal = calculateCollateralNeeded / Number(collateralProvided)
    return Math.min(optimal, MAX_LEVERAGE)
  }

  // Calculate borrowed amount based on collateral and leverage
  const borrowedAmount = useMemo(() => {
    if (!Number(collateralProvided) || leverage[0] <= 1) return 0;
    return Number(collateralProvided) * (leverage[0] - 1);
  }, [collateralProvided, leverage]);

  // Notify parent component when borrowed amount changes
  useEffect(() => {
    if (onBorrowedAmountChange) {
      onBorrowedAmountChange(borrowedAmount);
    }
  }, [borrowedAmount, onBorrowedAmountChange]);

  // Calculate if enough collateral is provided - include borrowed amount
  const totalFunds = Number(collateralProvided) + borrowedAmount
  const hasEnoughCollateral = totalFunds >= calculateCollateralNeeded
  const collateralProgress = calculateCollateralNeeded > 0 ? (totalFunds / calculateCollateralNeeded) * 100 : 0

  // Calculate hourly borrow rate (instead of daily)
  const hourlyBorrowRate = BASE_ANNUAL_INTEREST_RATE / (365 * 24);

  // Calculate estimated hourly borrow cost
  const hourlyBorrowCost = borrowedAmount * hourlyBorrowRate;

  // Calculate minimum required collateral
  const minCollateralRequired = useMemo(() => {
    return calculateCollateralNeeded / MAX_LEVERAGE;
  }, [calculateCollateralNeeded]);

  const isDisabled = !hasSelectedOptions || (isDebit && externalCollateralNeeded === 0)

  return (
    <Card className={cn(
      "bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl h-full transition-all duration-300",
      isDisabled && "opacity-50 pointer-events-none"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Collateral Requirements
          </h3>
          {isDisabled && (
            <Chip size="sm" variant="flat" className="bg-white/10 text-white/50">
              Not Required
            </Chip>
          )}
        </div>
      </CardHeader>
      
      <CardBody className="gap-4">
        {/* Collateral Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/60">Collateral Status</span>
            </div>
            <Chip 
              size="sm" 
              variant="flat"
              className={cn(
                "font-medium",
                hasEnoughCollateral 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-amber-500/20 text-amber-400"
              )}
            >
              {hasEnoughCollateral ? "Sufficient" : "Insufficient"}
            </Chip>
          </div>
          
          <Progress
            value={Math.min(collateralProgress, 100)}
            className="h-2"
            classNames={{
              indicator: cn(
                "transition-all",
                hasEnoughCollateral ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-amber-400 to-amber-600"
              )
            }}
          />
          
          <div className="flex justify-between text-xs">
            <span className="text-white/40">
              ${totalFunds.toFixed(2)} provided
            </span>
            <span className="text-white/40">
              ${calculateCollateralNeeded.toFixed(2)} needed
            </span>
          </div>
        </motion.div>

        <Divider className="bg-white/10" />

        {/* Collateral Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white/80">Provide Collateral</label>
            <Tooltip content={`Minimum required with max leverage (${MAX_LEVERAGE}x)`}>
              <Button
                size="sm"
                variant="flat"
                className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 h-7"
                onPress={() => setCollateralProvided(minCollateralRequired.toFixed(2))}
              >
                Min: ${minCollateralRequired.toFixed(2)}
              </Button>
            </Tooltip>
          </div>
          
          <div className="flex gap-2">
            <Select
              selectedKeys={[collateralType]}
              onSelectionChange={(selection) => {
                const selected = Array.from(selection)[0] as string;
                setCollateralType(selected);
              }}
              isDisabled={isDisabled}
              size="sm"
              variant="bordered"
              className="w-28 dropdown-thin-border"
              classNames={{
                trigger: "bg-white/5 border-white/20 hover:border-white/30 border-[0.5px]",
                value: "text-white/80"
              }}
            >
              {COLLATERAL_TYPES.map((type) => (
                <SelectItem key={type.value}>
                  {type.label}
                </SelectItem>
              ))}
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
              disabled={isDisabled}
              min="1"
              step="0.01"
              size="sm"
              variant="flat"
              placeholder="0.00"
              classNames={{
                input: "text-right font-medium text-white",
                inputWrapper: "bg-white/5 border border-transparent rounded-lg backdrop-blur-sm h-10 hover:bg-white/8 data-[hover=true]:bg-white/8 data-[focus=true]:bg-white/10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:shadow-none data-[focus=true]:ring-0 data-[focus=true]:shadow-none flex-1"
              }}
              startContent={<span className="text-white/40">$</span>}
            />
          </div>
        </div>

        {/* Leverage Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-white/60" />
              <label className="text-sm font-medium text-white/80">Leverage</label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="flat"
                className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 h-7"
                onPress={() => {
                  const optimalLeverage = calculateOptimalLeverage()
                  setLeverage([optimalLeverage])
                }}
                startContent={<Zap className="w-3 h-3" />}
              >
                Auto
              </Button>
              <Chip 
                size="sm" 
                variant="flat" 
                className="bg-white/10 font-mono"
              >
                {leverage[0].toFixed(2)}x
              </Chip>
            </div>
          </div>
          
          <Slider
            minValue={1}
            maxValue={MAX_LEVERAGE}
            step={0.01}
            value={leverage}
            onChange={(value) => setLeverage(Array.isArray(value) ? value : [value])}
            className="flex-1"
            classNames={{
              track: "bg-white/10",
              filler: "bg-gradient-to-r from-blue-400 to-purple-400"
            }}
          />
        </div>

        <Divider className="bg-white/10" />

        {/* Borrow Summary */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
        >
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white/80">Borrowing Details</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/60">Amount Borrowed</span>
              <span className="text-sm font-medium text-white/80">
                {borrowedAmount > 0 ? `$${borrowedAmount.toFixed(2)}` : '--'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <Tooltip content={`${selectedAsset} APR: ${(BASE_ANNUAL_INTEREST_RATE * 100).toFixed(2)}%`}>
                <span className="text-xs text-white/60 border-b border-dotted border-white/30 cursor-help">
                  Hourly Rate
                </span>
              </Tooltip>
              <span className="text-sm font-medium text-amber-400">
                {(hourlyBorrowRate * 100).toFixed(4)}%
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-white/60" />
                <span className="text-xs text-white/60">Est. Hourly Cost</span>
              </div>
              <span className="text-sm font-medium text-red-400">
                {borrowedAmount > 0 ? `$${hourlyBorrowCost.toFixed(4)}` : '--'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Warning Message */}
        {!hasEnoughCollateral && Number(collateralProvided) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-400">
              Insufficient collateral. Increase amount or leverage to proceed.
            </span>
          </motion.div>
        )}
      </CardBody>
    </Card>
  )
}