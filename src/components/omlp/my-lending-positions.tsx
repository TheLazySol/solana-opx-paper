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
import { GLOBAL_OMLP_CONFIG } from '@/constants/omlp/omlp-pools'
import { calculateUtilization, calculateSupplyApy, calculateBorrowApy, calculateBorrowedAmount } from '@/constants/omlp/calculations'

export type Position = {
  token: string
  amount: number // USD amount
  apy: number
  earned: number // USD earned
  tokenAmount: number // Original token amount deposited
  depositPrice: number // Token price at time of deposit
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
  const [mounted, setMounted] = useState(false)

  // Avoid SSR/client divergence by rendering nothing until mounted
  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Helper function to create pool data from position (fallback for when pool doesn't exist in Redis)
  const createPoolFromPosition = (position: Position): Pool => {
    const tokenPrice = getTokenPrice(position.token)
    
    // Use default configuration values
    const defaultConfig = {
      initialSupply: 1000,
      baseSupplyApy: 0,
      baseBorrowApy: 0,
      utilizationRateMultiplier: 0.05,
      borrowSpread: 5.0,
      supplyLimit: 2500,
      minUtilizationForDynamicRates: 10,
      maxUtilizationThreshold: 90,
      initialBorrowedPercentage: 0,
    }
    
    // Fallback to mock data if price not found
    if (!tokenPrice || tokenPrice === 0) {
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

    // Generate realistic pool data based on default configuration
    const supply = defaultConfig.initialSupply
    const borrowed = calculateBorrowedAmount(supply, defaultConfig.initialBorrowedPercentage)
    const utilization = calculateUtilization(borrowed, supply)
    
    // Calculate dynamic APYs
    const supplyApy = calculateSupplyApy(
      defaultConfig.baseSupplyApy, 
      utilization, 
      defaultConfig.utilizationRateMultiplier,
      defaultConfig.minUtilizationForDynamicRates
    )
    const borrowApy = calculateBorrowApy(
      defaultConfig.baseBorrowApy,
      utilization,
      defaultConfig.utilizationRateMultiplier,
      defaultConfig.maxUtilizationThreshold
    )

    return {
      token: position.token,
      supply,
      supplyApy,
      borrowed,
      borrowApy,
      utilization,
      supplyLimit: defaultConfig.supplyLimit,
      tokenPrice
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
      
      // Add to the user's lending positions with original token amount and deposit price
      addPosition(selectedPool.token, usdAmount, selectedPool.supplyApy, amount, selectedPool.tokenPrice)
      
      console.log('Deposit successful:', { 
        token: selectedPool.token, 
        tokenAmount: amount, 
        usdAmount: usdAmount,
        depositPrice: selectedPool.tokenPrice
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
      
      // Validate withdrawal amount (amount is in USD, but check is against token amount logic)
      if (amount <= 0 || amount > selectedPosition.amount) {
        throw new Error(`Invalid withdrawal amount. Maximum available: ${selectedPosition.amount}`)
      }
      
      // Calculate the proportion of tokens being withdrawn
      const withdrawalProportion = amount / selectedPosition.amount
      const tokenAmountToWithdraw = selectedPosition.tokenAmount * withdrawalProportion
      
      // Update the position with the new amounts
      const newUsdAmount = selectedPosition.amount - amount
      const newTokenAmount = selectedPosition.tokenAmount - tokenAmountToWithdraw
      
      // Remove position if amount is very small (less than $0.01 USD or 0.0001 tokens)
      if (newUsdAmount <= 0.01 || newTokenAmount <= 0.0001) {
        // Remove the position completely if withdrawing all or leaving dust
        removePosition(selectedPosition.token)
      } else {
        // Update with remaining amounts
        updatePosition(selectedPosition.token, newUsdAmount, newTokenAmount)
      }
      
      console.log('Withdraw successful:', { 
        token: selectedPosition.token, 
        usdAmount: amount,
        tokenAmount: tokenAmountToWithdraw,
        remainingUsd: newUsdAmount,
        remainingTokens: newTokenAmount
      })
      
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
        minimumFractionDigits: 4,
        maximumFractionDigits: Math.max(4, decimals)
      })
    }
  }

  const totalValue = positions.reduce((acc, pos) => acc + pos.amount, 0)
  const totalEarned = positions.reduce((acc, pos) => acc + pos.earned, 0)

  // Avoid hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null
  }

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
                          ({position.tokenAmount.toLocaleString(undefined, { 
                            minimumFractionDigits: 4,
                            maximumFractionDigits: Math.max(4, getTokenDisplayDecimals(position.token))
                          })} {position.token})
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
                          (+{(position.earned / position.depositPrice).toLocaleString(undefined, { 
                            minimumFractionDigits: 4,
                            maximumFractionDigits: Math.max(4, getTokenDisplayDecimals(position.token))
                          })} {position.token})
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