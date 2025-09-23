'use client'

import { 
  Button, 
  Card, 
  CardBody, 
  CardHeader,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Chip,
  Spinner,
  useDisclosure
} from '@heroui/react'
import { RefreshCw, TrendingUp, DollarSign, Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getTokenDisplayDecimals } from '@/constants/token-list/token-list'
import { motion } from 'framer-motion'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { useLendingPositions } from '@/context/lending-positions-provider'
import { DepositModal } from './deposit-modal'
import { WithdrawModal } from './withdraw-modal'
import { Pool } from './lending-pools'
import { useAssetPriceInfo, useAssetPrice } from '@/context/asset-price-provider'
import { POOL_CONFIGS, GLOBAL_OMLP_CONFIG } from '@/constants/omlp/omlp-pools'
import { generateSolPoolData, calculateUtilization } from '@/constants/omlp/calculations'

export type Position = {
  token: string
  amount: number
  apy: number
  earned: number
}

interface MyLendingPositionsProps {
  isLoading?: boolean
  onRefresh?: () => Promise<void>
}

export function MyLendingPositions({ isLoading = false, onRefresh }: MyLendingPositionsProps) {
  const {isOpen: isDepositModalOpen, onOpen: onDepositModalOpen, onOpenChange: onDepositModalOpenChange} = useDisclosure()
  const {isOpen: isWithdrawModalOpen, onOpen: onWithdrawModalOpen, onOpenChange: onWithdrawModalOpenChange} = useDisclosure()
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Mouse glow effect hook
  const cardRef = useMouseGlow()
  
  // Use lending positions context
  const { positions, addPosition, updatePosition, removePosition } = useLendingPositions()
  
  // Get asset price context for multi-asset pricing
  const { prices, refreshPrice } = useAssetPrice()
  
  // Get unique tokens from positions
  const uniqueTokens = [...new Set(positions.map(pos => pos.token))]
  
  // Fetch prices for all unique tokens
  useEffect(() => {
    uniqueTokens.forEach(token => {
      if (!prices[token]) {
        refreshPrice(token)
      }
    })
  }, [uniqueTokens.length, refreshPrice]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      // Refresh prices for all unique tokens
      await Promise.all(uniqueTokens.map(token => refreshPrice(token)))
      
      if (onRefresh) {
        await onRefresh()
      }
      // Add a small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error('Error during refresh:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Helper function to create pool data from position using real pool configurations
  const createPoolFromPosition = (position: Position): Pool => {
    // Get the real pool config for this token
    const poolConfig = POOL_CONFIGS[position.token as keyof typeof POOL_CONFIGS]
    
    if (!poolConfig) {
      // Fallback to mock data if pool config not found
      return {
        token: position.token,
        supply: 1000000,
        supplyApy: position.apy,
        borrowed: 500000,
        borrowApy: position.apy + 2,
        utilization: 50,
        supplyLimit: 2000000,
        tokenPrice: 1
      }
    }

    // For SOL, use the generated pool data with real price
    if (position.token === 'SOL') {
      const solPrice = getTokenPrice('SOL')
      if (solPrice > 0) {
        return generateSolPoolData(solPrice)
      }
    }

    // Generate realistic pool data based on the configuration
    const supply = poolConfig.initialSupply
    const borrowed = supply * (poolConfig.initialBorrowedPercentage / 100)
    const utilization = calculateUtilization(borrowed, supply)
    
    // Calculate dynamic APYs based on utilization
    const utilizationFactor = Math.max(0, utilization - poolConfig.minUtilizationForDynamicRates) / 100
    const supplyApy = poolConfig.baseSupplyApy + (utilizationFactor * poolConfig.utilizationRateMultiplier)
    const borrowApy = supplyApy + poolConfig.borrowSpread

    return {
      token: position.token,
      supply,
      supplyApy,
      borrowed,
      borrowApy,
      utilization,
      supplyLimit: poolConfig.supplyLimit,
      tokenPrice: getTokenPrice(position.token) // Use real token price for all assets
    }
  }

  const handleOpenDepositModal = (position: Position) => {
    const pool = createPoolFromPosition(position)
    setSelectedPool(pool)
    onDepositModalOpen()
  }

  const handleOpenWithdrawModal = (position: Position) => {
    setSelectedPosition(position)
    onWithdrawModalOpen()
  }

  const handleDeposit = async (amount: number) => {
    if (!selectedPool) return

    try {
      setIsProcessing(true)
      
      // Convert token amount to USD amount for storage
      const usdAmount = amount * selectedPool.tokenPrice
      
      // Add to the user's lending positions (stored in USD)
      addPosition(selectedPool.token, usdAmount, selectedPool.supplyApy)
      
      console.log('Deposit successful:', { 
        token: selectedPool.token, 
        tokenAmount: amount, 
        usdAmount: usdAmount 
      })
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000))
      onDepositModalOpenChange()
      if (onRefresh) await onRefresh()
    } catch (error) {
      console.error('Error depositing:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWithdraw = async (amount: number) => {
    if (!selectedPosition) return

    try {
      setIsProcessing(true)
      
      // Validate withdrawal amount
      if (amount <= 0 || amount > selectedPosition.amount) {
        throw new Error(`Invalid withdrawal amount. Maximum available: ${selectedPosition.amount}`)
      }
      
      // Update the position with the new amount (subtract withdrawal)
      const newAmount = selectedPosition.amount - amount
      if (newAmount <= 0) {
        // Remove the position completely if withdrawing all
        removePosition(selectedPosition.token)
      } else {
        // Update with remaining amount
        updatePosition(selectedPosition.token, newAmount)
      }
      
      console.log('Withdraw successful:', { token: selectedPosition.token, amount })
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000))
      onWithdrawModalOpenChange()
      if (onRefresh) await onRefresh()
    } catch (error) {
      console.error('Error withdrawing:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Format value for deposit modal
  const formatValue = (value: number, tokenPrice: number, token: string) => {
    const decimals = getTokenDisplayDecimals(token);
    return `$${(value * tokenPrice).toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  // Helper function to get token price for a specific token
  const getTokenPrice = (token: string): number => {
    const priceData = prices[token]
    return priceData?.price || 1 // Fallback to 1 if price not available
  }

  // Helper function to format combined USD and token amounts
  const formatCombinedAmount = (usdAmount: number, token: string) => {
    const tokenPrice = getTokenPrice(token)
    const tokenAmount = tokenPrice > 0 ? usdAmount / tokenPrice : 0
    const decimals = getTokenDisplayDecimals(token)
    
    return {
      usd: usdAmount.toLocaleString(undefined, { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      token: tokenAmount.toLocaleString(undefined, { 
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
      })
    }
  }

  const totalValue = positions.reduce((acc, pos) => acc + pos.amount, 0)
  const totalEarned = positions.reduce((acc, pos) => acc + pos.earned, 0)

  return (
    <>
      <Card 
        ref={cardRef}
        className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
        style={{
          background: `
            radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
              rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
              rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
              rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
              transparent 75%
            ),
            linear-gradient(to bottom right, 
              rgb(15 23 42 / 0.4), 
              rgb(30 41 59 / 0.3), 
              rgb(51 65 85 / 0.2)
            )
          `,
          transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#4a85ff]" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                My Lendings / Collateral
              </h3>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <Chip 
                size="md" 
                variant="flat" 
                className="bg-white/10 text-white border border-white/20"
                startContent={<TrendingUp className="w-3 h-3" />}
              >
                TVL: ${Math.round(totalValue).toLocaleString()}
              </Chip>
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                color="default"
                onPress={handleRefresh}
                isLoading={isRefreshing}
                spinner={
                  <Spinner 
                    size="sm" 
                    color="current"
                    classNames={{
                      circle1: "border-b-current",
                      circle2: "border-b-current",
                    }}
                  />
                }
                aria-label={isRefreshing ? "Refreshing lending positions..." : "Refresh lending positions"}
                className="w-6 h-6 min-w-6 bg-white/5 hover:bg-white/10 data-[hover=true]:scale-110 data-[pressed=true]:scale-95"
              >
                {!isRefreshing && <RefreshCw className="h-3 w-3 text-foreground-500" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardBody className="p-0">
          <Table 
            aria-label="My lending positions"
            className="min-h-[200px] border-collapse"
            removeWrapper
            classNames={{
              wrapper: "bg-transparent rounded-none",
              th: "bg-black/20 text-white/80 text-left backdrop-blur-sm px-4 font-medium !border-0",
              td: "text-left px-4 !border-0",
              table: "bg-transparent table-fixed !border-0",
              tbody: "bg-transparent",
              tr: "!border-0",
              thead: "!border-0",
            }}
          >
            <TableHeader>
              <TableColumn className="w-[20%]">POOL</TableColumn>
              <TableColumn className="w-[20%]">AMOUNT</TableColumn>
              <TableColumn className="w-[20%]">APY</TableColumn>
              <TableColumn className="w-[20%]">EARNED</TableColumn>
              <TableColumn className="w-[20%]">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent={isLoading ? "Loading positions..." : "No active lending positions"}>
              {positions.map((position, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Chip variant="flat" className="bg-white/10">
                        {position.token}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-white/90 font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span>${formatCombinedAmount(position.amount, position.token).usd}</span>
                        <span className="text-white/40 text-xs font-normal">
                          ({formatCombinedAmount(position.amount, position.token).token} {position.token})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" className="bg-green-500/20 text-green-400">
                        {(() => {
                          const pool = createPoolFromPosition(position)
                          return pool.supplyApy.toFixed(2)
                        })()}%
                      </Chip>
                    </TableCell>
                    <TableCell className="text-green-400 font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span>+${formatCombinedAmount(position.earned, position.token).usd}</span>
                        <span className="text-white/40 text-xs font-normal">
                          (+{formatCombinedAmount(position.earned, position.token).token} {position.token})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-start gap-2">
                        <Button 
                          size="sm"
                          variant="flat"
                          onPress={() => handleOpenWithdrawModal(position)}
                          isDisabled={isProcessing}
                          className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        >
                          Withdraw
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => handleOpenDepositModal(position)}
                          isDisabled={isProcessing}
                          className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                        >
                          Deposit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Shared Deposit Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onOpenChange={onDepositModalOpenChange}
        selectedPool={selectedPool}
        onDeposit={handleDeposit}
        formatValue={formatValue}
        isProcessing={isProcessing}
      />

      {/* Shared Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onOpenChange={onWithdrawModalOpenChange}
        selectedPosition={selectedPosition}
        onWithdraw={handleWithdraw}
        isProcessing={isProcessing}
      />
    </>
  )
} 