import { FC, useState, useMemo, useEffect } from 'react'
import { Card, CardBody, CardHeader, Divider, Input, Slider, Button, Select, SelectItem, Tooltip } from '@heroui/react'
import { SelectedOption } from './option-data'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { motion } from 'framer-motion'
import { BASE_ANNUAL_INTEREST_RATE, MAX_LEVERAGE } from '@/constants/constants'

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
  const hasEnoughCollateral = Number(collateralProvided) + borrowedAmount >= calculateCollateralNeeded

  // Calculate hourly borrow rate (instead of daily)
  const hourlyBorrowRate = BASE_ANNUAL_INTEREST_RATE / (365 * 24);

  // Calculate estimated hourly borrow cost
  const hourlyBorrowCost = borrowedAmount * hourlyBorrowRate;

  // Calculate minimum required collateral
  const minCollateralRequired = useMemo(() => {
    return calculateCollateralNeeded / MAX_LEVERAGE;
  }, [calculateCollateralNeeded]);

  return (
    <Card className={`card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg h-full
      ${(!hasSelectedOptions || (isDebit && externalCollateralNeeded === 0)) ? 'opacity-50 pointer-events-none select-none' : ''}`}>
      <CardHeader className="pb-3">
        <h3 className="text-base font-medium text-muted-foreground">
          Collateral Requirements
          {(!hasSelectedOptions || (isDebit && externalCollateralNeeded === 0)) && (
            <span className="ml-2 text-xs font-normal">(Not Required)</span>
          )}
        </h3>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="space-y-4">
          {/* Collateral Details */}
          <div className="flex flex-col p-2 rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
            <Tooltip content="The remaining collateral needed after accounting for provided and borrowed amounts">
              <span className="text-xs text-muted-foreground cursor-help">
                <span className="border-b border-dotted border-slate-500">Collateral Needed:</span>
              </span>
            </Tooltip>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-lg">
                ${hasSelectedOptions ? Math.max(0, calculateCollateralNeeded - (Number(collateralProvided) || 0) - borrowedAmount).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>

          {/* Collateral Input */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <Tooltip content="This is the amount of collateral you want to provide for this position.">
                <span className="text-sm font-medium cursor-help">
                  <span className="border-b border-dotted border-slate-500">Provide Collateral Amount</span>
                </span>
              </Tooltip>
              <div className="text-xs text-muted-foreground">
                <Tooltip content={`Click to auto-fill minimum collateral required with max leverage (${MAX_LEVERAGE}x)`}>
                  <span 
                    className="cursor-pointer hover:text-[#4a85ff] transition-colors duration-200"
                    onClick={() => setCollateralProvided(minCollateralRequired.toFixed(2))}
                  >
                    <span className="border-b border-dotted border-slate-500">Min Required: ${minCollateralRequired.toFixed(2)}</span>
                  </span>
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full">
              <Select
                selectedKeys={[collateralType]}
                onSelectionChange={(selection) => {
                  const selected = Array.from(selection)[0] as string;
                  setCollateralType(selected);
                }}
                isDisabled={isDebit && externalCollateralNeeded === 0}
                className="h-10 w-24"
                classNames={{
                  trigger: "bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939] focus:ring-1 focus:ring-[#4a85ff]/40"
                }}
              >
                {COLLATERAL_TYPES.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    className="text-sm"
                  >
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
              <Tooltip content="Multiply your buying power by borrowing additional capital.">
                <span className="text-sm font-medium cursor-help">
                  <span className="border-b border-dotted border-slate-500">Leverage</span>
                </span>
              </Tooltip>
              <div className="flex space-x-1.5">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Button
                    variant="bordered"
                    size="sm"
                    onPress={() => {
                      const optimalLeverage = calculateOptimalLeverage()
                      setLeverage([optimalLeverage])
                    }}
                    className="h-6 px-2 py-0 text-xs bg-[#4a85ff]/10 border border-[#4a85ff]/40
                      hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60
                      transition-all duration-200 relative overflow-hidden group"
                  >
                    <motion.span
                      className="relative z-10"
                      initial={{ y: 0 }}
                      whileTap={{ y: 0.5 }}
                      transition={{ duration: 0.1 }}
                    >
                      Auto-Size
                    </motion.span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />
                  </Button>
                </motion.div>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Button
                    variant="bordered"
                    size="sm"
                    onPress={() => {
                      const newLeverage = Math.max(1, leverage[0] - 0.01)
                      setLeverage([newLeverage])
                    }}
                    className="h-6 w-6 p-0 text-xs bg-[#4a85ff]/10 border border-[#4a85ff]/40
                      hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60
                      transition-all duration-200 flex items-center justify-center relative overflow-hidden group"
                  >
                    <motion.span
                      className="relative z-10"
                      initial={{ y: 0 }}
                      whileTap={{ y: 0.5 }}
                      transition={{ duration: 0.1 }}
                    >
                      -
                    </motion.span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />
                  </Button>
                </motion.div>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Button
                    variant="bordered"
                    size="sm"
                    onPress={() => {
                      const newLeverage = Math.min(MAX_LEVERAGE, leverage[0] + 0.01)
                      setLeverage([newLeverage])
                    }}
                    className="h-6 w-6 p-0 text-xs bg-[#4a85ff]/10 border border-[#4a85ff]/40
                      hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60
                      transition-all duration-200 flex items-center justify-center relative overflow-hidden group"
                  >
                    <motion.span
                      className="relative z-10"
                      initial={{ y: 0 }}
                      whileTap={{ y: 0.5 }}
                      transition={{ duration: 0.1 }}
                    >
                      +
                    </motion.span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />
                  </Button>
                </motion.div>
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

          <Divider className="my-2 bg-white/10" />

          {/* Borrow Summary */}
          <div className="space-y-2 p-2 rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Collateral Borrowed:</span>
              <span className="text-sm font-light">
                {borrowedAmount > 0 ? `$${borrowedAmount.toFixed(2)}` : '--'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <Tooltip content={`${selectedAsset} APR: ${(BASE_ANNUAL_INTEREST_RATE * 100).toFixed(2)}%`}>
                <span className="text-sm text-muted-foreground cursor-help">
                  <span className="border-b border-dotted border-slate-500">Hourly Borrow Rate:</span>
                </span>
              </Tooltip>
              <span className="text-sm font-light text-orange-200">≈{(hourlyBorrowRate * 100).toFixed(4)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Est. Hourly Cost:</span>
              <span className="text-sm font-medium text-red-500">
                {borrowedAmount > 0 ? `$${hourlyBorrowCost.toFixed(4)}` : '--'}
              </span>
            </div>
          </div>

          {/* Not Enough Collateral Warning */}
          {!hasEnoughCollateral && Number(collateralProvided) > 0 && (
            <div className="text-sm text-red-500 mt-2">
              Not enough collateral provided. Please increase collateral or leverage.
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
} 