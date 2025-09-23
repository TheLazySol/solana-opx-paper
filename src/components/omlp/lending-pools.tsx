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
  Tabs,
  Tab,
  useDisclosure
} from '@heroui/react'
import { RefreshCw, DollarSign, Coins, TrendingUp, Database } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/utils'
import { getTokenDisplayDecimals } from '@/constants/token-list/token-list'
import { motion } from 'framer-motion'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { generateSolPoolData, calculateUtilization } from '@/constants/omlp/calculations'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { DepositModal } from './deposit-modal'
import { useLendingPositions } from '@/context/lending-positions-provider'

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
}

export function LendingPools({ 
  pools, 
  isLoading = false, 
  onRefresh
}: LendingPoolsProps) {
  const [showUSD, setShowUSD] = useState(true)
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null)
  const {isOpen: isDepositModalOpen, onOpen: onDepositModalOpen, onOpenChange: onDepositModalOpenChange} = useDisclosure()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Mouse glow effect hook
  const cardRef = useMouseGlow()
  
  // Get SOL price for mock pool
  const { price: solPrice, refreshPrice } = useAssetPriceInfo('SOL')
  
  // Use lending positions context
  const { addPosition } = useLendingPositions()
  
  // Generate mock pools using constants and calculations
  const generateMockPools = (): Pool[] => {
    const mockPools: Pool[] = []
    
    // Generate SOL pool using our constants and calculations
    if (solPrice > 0) {
      const solPool = generateSolPoolData(solPrice)
      mockPools.push(solPool)
    }
    
    return mockPools
  }
  
  // Use mock pools if no pools provided, otherwise use provided pools
  const displayPools = pools.length > 0 ? pools : generateMockPools()
  
  const tvl = displayPools.reduce((acc, pool) => {
    const poolValueUSD = pool.supply * pool.tokenPrice
    return acc + poolValueUSD
  }, 0)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      // Refresh SOL price for mock pools
      await refreshPrice()
      
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


  const handleOpenDepositModal = (pool: Pool) => {
    setSelectedPool(pool)
    onDepositModalOpen()
  }

  const handleDeposit = async (amount: number) => {
    if (!selectedPool) return

    try {
      setIsProcessing(true)
      
      // Convert token amount to USD amount for storage
      const usdAmount = amount * selectedPool.tokenPrice
      
      // Add the position to the user's lending positions (stored in USD)
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
                <Database className="w-4 h-4 text-[#4a85ff]" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Lending Pools
              </h3>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <Chip 
                size="sm" 
                variant="flat" 
                className="bg-white/10 text-white/80 border border-white/20"
                startContent={<TrendingUp className="w-3 h-3" />}
              >
                TVL: ${Math.round(tvl).toLocaleString()}
              </Chip>
              <div className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm rounded-lg p-0.5">
                <Tabs
                  selectedKey={showUSD ? "usd" : "tokens"}
                  onSelectionChange={(key) => setShowUSD(key === "usd")}
                  variant="light"
                  size="sm"
                  classNames={{
                    tabList: "gap-0.5 w-full relative rounded-md p-0",
                    cursor: "w-full bg-gradient-to-r from-[#4a85ff] to-[#1851c4] backdrop-blur-sm border border-[#4a85ff]/50 shadow-lg shadow-[#4a85ff]/25",
                    tab: "px-2 h-6 data-[selected=true]:text-white text-white/60 min-w-0",
                    tabContent: "group-data-[selected=true]:text-white font-medium text-xs"
                  }}
                >
                  <Tab
                    key="usd"
                    title={
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-2.5 h-2.5" />
                        <span className="text-xs">USD</span>
                      </div>
                    }
                  />
                  <Tab
                    key="tokens"
                    title={
                      <div className="flex items-center gap-1">
                        <Coins className="w-2.5 h-2.5" />
                        <span className="text-xs">Tokens</span>
                      </div>
                    }
                  />
                </Tabs>
              </div>
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
            className="min-h-[300px] border-collapse"
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
              <TableColumn className="w-[12.5%]">POOL</TableColumn>
              <TableColumn className="w-[12.5%]">SUPPLY</TableColumn>
              <TableColumn className="w-[12.5%]">SUPPLY APY</TableColumn>
              <TableColumn className="w-[12.5%]">BORROWED</TableColumn>
              <TableColumn className="w-[12.5%]">BORROW APY</TableColumn>
              <TableColumn className="w-[12.5%]">UTILIZATION</TableColumn>
              <TableColumn className="w-[12.5%]">SUPPLY LIMIT</TableColumn>
              <TableColumn className="w-[12.5%]">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent={isLoading ? "Loading pools..." : "No pools available"}>
              {displayPools.map((pool, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Chip variant="flat" className="bg-white/10">
                        {pool.token}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-white/60 font-medium">
                      {formatValue(pool.supply, pool.tokenPrice, pool.token)}
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" className="bg-green-500/20 text-green-400">
                        {pool.supplyApy.toFixed(2)}%
                      </Chip>
                    </TableCell>
                    <TableCell className="text-white/60">
                      {formatValue(pool.borrowed, pool.tokenPrice, pool.token)}
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" className="bg-red-500/20 text-red-400">
                        {pool.borrowApy.toFixed(2)}%
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-white/80">{calculateUtilization(pool.borrowed, pool.supply).toFixed(2)}%</span>
                        <Progress 
                          value={calculateUtilization(pool.borrowed, pool.supply)}
                          className="w-16 h-1"
                          classNames={{
                            indicator: "bg-white transition-all duration-300"
                          }}
                          style={{
                            filter: `drop-shadow(0 0 ${Math.max(1, calculateUtilization(pool.borrowed, pool.supply) / 25)}px rgba(255, 255, 255, ${Math.min(0.4, calculateUtilization(pool.borrowed, pool.supply) / 100 * 0.8)})) drop-shadow(0 0 ${Math.max(2, calculateUtilization(pool.borrowed, pool.supply) / 15)}px rgba(255, 255, 255, ${Math.min(0.3, calculateUtilization(pool.borrowed, pool.supply) / 100 * 0.6)}))`
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-white/60">
                      {formatValue(pool.supplyLimit, pool.tokenPrice, pool.token)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-start gap-2">
                        <Button 
                          size="sm"
                          variant="flat"
                          onPress={() => handleOpenDepositModal(pool)}
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

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onOpenChange={onDepositModalOpenChange}
        selectedPool={selectedPool}
        onDeposit={handleDeposit}
        formatValue={formatValue}
        isProcessing={isProcessing}
      />
    </>
  )
} 