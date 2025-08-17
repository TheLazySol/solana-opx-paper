'use client'

import { 
  Button, 
  Card, 
  CardBody, 
  CardHeader,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Chip,
  Spinner,
  Progress,
  ButtonGroup,
  useDisclosure
} from '@heroui/react'
import { RefreshCw, DollarSign, Coins, BarChart, TrendingUp, Database } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/utils'
import { OmlpChart, type PoolHistoricalData } from './omlp-pool-chart'
import { useOmlpService } from '@/solana/utils/useOmlpService'
import { getTokenDisplayDecimals } from '@/constants/token-list/token-list'
import { motion } from 'framer-motion'

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
  const {isOpen: isDepositModalOpen, onOpen: onDepositModalOpen, onOpenChange: onDepositModalOpenChange} = useDisclosure()
  const [depositAmount, setDepositAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const tvl = pools.reduce((acc, pool) => {
    const poolValueUSD = pool.supply * pool.tokenPrice
    return acc + poolValueUSD
  }, 0)

  const calculateUtilization = (borrowed: number, supply: number) => {
    return ((borrowed / supply) * 100).toFixed(2)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
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

  const handleOpenDepositModal = (pool: Pool) => {
    setSelectedPool(pool)
    setDepositAmount('')
    onDepositModalOpen()
  }

  const handleDeposit = async () => {
    if (!selectedPool) return

    try {
      setIsProcessing(true)
      await deposit({
        tokenSymbol: selectedPool.token,
        amount: parseFloat(depositAmount),
      })
      onDepositModalOpenChange()
      if (onRefresh) await onRefresh()
    } catch (error) {
      console.error('Error depositing:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 backdrop-blur-sm">
                <Database className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Option Margin Liquidity Pool
              </h3>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <ButtonGroup size="sm" variant="flat">
                <Button
                  className={cn(
                    "transition-all",
                    showUSD 
                      ? "bg-blue-500/20 text-blue-400 border-blue-400/50" 
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                  onPress={() => setShowUSD(true)}
                  startContent={<DollarSign className="h-4 w-4" />}
                >
                  USD
                </Button>
                <Button
                  className={cn(
                    "transition-all",
                    !showUSD 
                      ? "bg-blue-500/20 text-blue-400 border-blue-400/50" 
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                  onPress={() => setShowUSD(false)}
                  startContent={<Coins className="h-4 w-4" />}
                >
                  Tokens
                </Button>
              </ButtonGroup>
              <Chip 
                size="sm" 
                variant="flat" 
                className="bg-purple-500/20 text-purple-400 border border-purple-500/30"
                startContent={<TrendingUp className="w-3 h-3" />}
              >
                TVL: ${Math.round(tvl).toLocaleString()}
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
                aria-label={isRefreshing ? "Refreshing lending pools..." : "Refresh lending pools"}
                className="w-10 h-10 min-w-10 bg-white/5 hover:bg-white/10 data-[hover=true]:scale-110 data-[pressed=true]:scale-95"
              >
                {!isRefreshing && <RefreshCw className="h-4 w-4 text-foreground-500" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardBody className="p-0">
          <Table 
            aria-label="Lending pools"
            className="min-h-[300px]"
            classNames={{
              wrapper: "bg-transparent rounded-none",
              th: "bg-black/20 text-white/80 text-center backdrop-blur-sm",
              td: "text-center",
              table: "bg-transparent",
              tbody: "bg-transparent",
              tr: "hover:bg-white/5 transition-colors",
            }}
          >
            <TableHeader>
              <TableColumn>POOL</TableColumn>
              <TableColumn>SUPPLY</TableColumn>
              <TableColumn>SUPPLY APY</TableColumn>
              <TableColumn>BORROWED</TableColumn>
              <TableColumn>BORROW APY</TableColumn>
              <TableColumn>UTILIZATION</TableColumn>
              <TableColumn>SUPPLY LIMIT</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent={isLoading ? "Loading pools..." : "No pools available"}>
              {pools.map((pool, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Chip variant="flat" className="bg-white/10">
                        {pool.token}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-white/90 font-medium">
                      {formatValue(pool.supply, pool.tokenPrice, pool.token)}
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" className="bg-green-500/20 text-green-400">
                        {pool.supplyApy}%
                      </Chip>
                    </TableCell>
                    <TableCell className="text-white/90">
                      {formatValue(pool.borrowed, pool.tokenPrice, pool.token)}
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" className="bg-red-500/20 text-red-400">
                        {pool.borrowApy}%
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-white/80">{calculateUtilization(pool.borrowed, pool.supply)}%</span>
                        <Progress 
                          value={parseFloat(calculateUtilization(pool.borrowed, pool.supply))}
                          className="w-16 h-1"
                          classNames={{
                            indicator: "bg-gradient-to-r from-blue-400 to-purple-400"
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-white/90">
                      {formatValue(pool.supplyLimit, pool.tokenPrice, pool.token)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button 
                          size="sm"
                          variant="flat"
                          onPress={() => handleOpenDepositModal(pool)}
                          isDisabled={isDepositing}
                          className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                        >
                          Deposit
                        </Button>
                        <Button 
                          size="sm"
                          variant="flat" 
                          isIconOnly
                          onPress={() => handleOpenChart(pool)}
                          aria-label="Open pool performance chart"
                          className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                        >
                          <BarChart className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardBody>
        
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
      </Card>

      {/* Deposit Modal */}
      <Modal 
        isOpen={isDepositModalOpen} 
        onOpenChange={onDepositModalOpenChange}
        size="md"
        classNames={{
          base: "bg-black/90 backdrop-blur-md border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Deposit to {selectedPool?.token} Pool
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-white/60">Current APY:</span>
                  <Chip size="sm" variant="flat" className="bg-green-500/20 text-green-400">
                    {selectedPool?.supplyApy}%
                  </Chip>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    type="number"
                    label="Deposit Amount"
                    value={depositAmount}
                    onValueChange={setDepositAmount}
                    variant="flat"
                    placeholder={`0.00 ${selectedPool?.token}`}
                    classNames={{
                      label: "text-white/80",
                      input: "text-white",
                      inputWrapper: "bg-white/5 border border-white/10 hover:bg-white/10"
                    }}
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-white/40 text-sm">$</span>
                      </div>
                    }
                  />
                  {selectedPool && (
                    <div className="p-3 rounded-lg bg-white/5 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Pool Supply:</span>
                        <span className="text-white/90">{formatValue(selectedPool.supply, selectedPool.tokenPrice, selectedPool.token)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Utilization:</span>
                        <span className="text-white/90">{calculateUtilization(selectedPool.borrowed, selectedPool.supply)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button 
                  variant="flat" 
                  onPress={onClose}
                  className="bg-white/10 text-white/80 hover:bg-white/20"
                >
                  Cancel
                </Button>
                <Button 
                  color="primary"
                  onPress={handleDeposit}
                  isDisabled={
                    isProcessing ||
                    !depositAmount ||
                    parseFloat(depositAmount) <= 0 ||
                    Number.isNaN(parseFloat(depositAmount))
                  }
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isProcessing ? "Processing..." : "Deposit"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
} 