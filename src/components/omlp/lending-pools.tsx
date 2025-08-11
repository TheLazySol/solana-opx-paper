'use client'

import { Button } from '../ui/button'
import { RefreshCw, DollarSign, Coins, BarChart } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/utils'
import { OmlpChart, type PoolHistoricalData } from './omlp-pool-chart'
import { useOmlpService } from '@/solana/utils/useOmlpService'
import { getTokenDisplayDecimals } from '@/constants/token-list/token-list'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type Pool = {
  token: string
  supply: number
  supplyApy: number
  borrowed: number
  borrowApy: number
  utilization: number
  supplyLimit: number
  tokenPrice: number
}

interface LendingPoolsProps {
  pools: Pool[]
  isLoading?: boolean
  onRefresh?: () => Promise<void>
  onFetchHistoricalData?: (token: string) => Promise<PoolHistoricalData[]>
}

export function LendingPools({ 
  pools, 
  isLoading = false, 
  onRefresh,
  onFetchHistoricalData 
}: LendingPoolsProps) {
  const { deposit, isDepositing } = useOmlpService()
  const [showUSD, setShowUSD] = useState(true)
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null)
  const [graphOpen, setGraphOpen] = useState(false)
  const [historicalData, setHistoricalData] = useState<PoolHistoricalData[]>([])
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false)
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const tvl = pools.reduce((acc, pool) => {
    const poolValueUSD = pool.supply * pool.tokenPrice
    return acc + poolValueUSD
  }, 0)

  const calculateUtilization = (borrowed: number, supply: number) => {
    return ((borrowed / supply) * 100).toFixed(2)
  }

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh()
    }
  }

  const formatValue = (value: number, tokenPrice: number, token: string) => {
    const decimals = getTokenDisplayDecimals(token);
    if (showUSD) {
      return `$${(value * tokenPrice).toLocaleString(undefined, { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
    return `${value.toLocaleString(undefined, { 
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    })} ${token}`;
  }

  const handleOpenChart = (pool: Pool) => {
    setSelectedPool(pool)
    setGraphOpen(true)
  }

  const handleChartOpen = async () => {
    if (selectedPool && onFetchHistoricalData) {
      try {
        setIsLoadingHistorical(true)
        const data = await onFetchHistoricalData(selectedPool.token)
        setHistoricalData(data)
      } catch (error) {
        console.error('Failed to fetch historical data:', error)
        setHistoricalData([])
      } finally {
        setIsLoadingHistorical(false)
      }
    }
  }

  const handleOpenDepositDialog = (pool: Pool) => {
    setSelectedPool(pool)
    setDepositAmount('')
    setIsDepositDialogOpen(true)
  }

  const handleDeposit = async () => {
    if (!selectedPool) return

    try {
      setIsProcessing(true)
      await deposit({
        tokenSymbol: selectedPool.token,
        amount: parseFloat(depositAmount),
      })
      setIsDepositDialogOpen(false)
      if (onRefresh) await onRefresh()
    } catch (error) {
      console.error('Error depositing:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <div className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 rounded-lg shadow">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold">Option Margin Liquidity Pool</h2>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-2 border border-gray-800 hover:border-gray-600 transition-all",
                "hover:bg-gray-800/50"
              )}
              onClick={() => setShowUSD(!showUSD)}
            >
              {showUSD ? (
                <>
                  <DollarSign className="h-4 w-4" />
                  <span>USD</span>
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  <span>Tokens</span>
                </>
              )}
            </Button>
            <span className="text-sm" style={{ color: '#4a85ff' }}>
              TVL: ${Math.round(tvl).toLocaleString()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={handleRefresh}
              disabled={isLoading}
              aria-label="Refresh lending pools"
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4 text-muted-foreground',
                  isLoading && 'animate-spin'
                )}
              />
            </Button>
          </div>
        </div>
        
        <div className="border-t">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4">Pool</th>
                <th className="text-right p-4">Supply</th>
                <th className="text-right p-4">Supply APY</th>
                <th className="text-right p-4">Borrowed</th>
                <th className="text-right p-4">Borrow APY</th>
                <th className="text-right p-4">Utilization</th>
                <th className="text-right p-4">Supply limit</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-muted-foreground">
                    Loading pools...
                  </td>
                </tr>
              ) : pools.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-muted-foreground">
                    No pools available
                  </td>
                </tr>
              ) : (
                pools.map((pool, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-4">{pool.token}</td>
                    <td className="text-right p-4">
                      {formatValue(pool.supply, pool.tokenPrice, pool.token)}
                    </td>
                    <td className="text-right p-4 text-green-500">{pool.supplyApy}%</td>
                    <td className="text-right p-4">
                      {formatValue(pool.borrowed, pool.tokenPrice, pool.token)}
                    </td>
                    <td className="text-right p-4">{pool.borrowApy}%</td>
                    <td className="text-right p-4">
                      {calculateUtilization(pool.borrowed, pool.supply)}%
                    </td>
                    <td className="text-right p-4">
                      {formatValue(pool.supplyLimit, pool.tokenPrice, pool.token)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => handleOpenDepositDialog(pool)}
                          disabled={isDepositing}
                        >
                          Deposit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="bg-black hover:bg-black/80"
                          onClick={() => handleOpenChart(pool)}
                          aria-label="Open pool performance chart"
                        >
                          <BarChart className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {selectedPool && (
          <OmlpChart 
            open={graphOpen} 
            onOpenChange={setGraphOpen} 
            poolData={selectedPool}
            historicalData={historicalData}
            isLoading={isLoadingHistorical}
            onChartOpen={handleChartOpen}
          />
        )}
      </div>

      {/* Deposit Dialog */}
      <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deposit to {selectedPool?.token} Pool</DialogTitle>
            <DialogDescription>
              Enter the amount you would like to deposit to the {selectedPool?.token} pool.
              Current APY: {selectedPool?.supplyApy}%
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deposit-amount" className="text-right">
                Amount
              </Label>
              <Input
                id="deposit-amount"
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="col-span-3"
                placeholder={`Amount in ${selectedPool?.token}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleDeposit}
              disabled={
                isProcessing ||
                !depositAmount ||            // empty
                parseFloat(depositAmount) <= 0 || // non-positive
                Number.isNaN(parseFloat(depositAmount))
              }>
              {isProcessing ? "Processing..." : "Deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 