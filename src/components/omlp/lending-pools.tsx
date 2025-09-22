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
  const [depositAmount, setDepositAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Mouse glow effect hooks
  const cardRef = useMouseGlow()
  const modalContentRef = useMouseGlow()
  
  // Get SOL price for mock pool
  const { price: solPrice, refreshPrice } = useAssetPriceInfo('SOL')
  
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
    setDepositAmount('')
    onDepositModalOpen()
  }

  const handleDeposit = async () => {
    if (!selectedPool) return

    try {
      setIsProcessing(true)
      // TODO: Implement actual deposit functionality
      console.log('Deposit:', { token: selectedPool.token, amount: parseFloat(depositAmount) })
      
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
              <div className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm rounded-lg p-1">
                <Tabs
                  selectedKey={showUSD ? "usd" : "tokens"}
                  onSelectionChange={(key) => setShowUSD(key === "usd")}
                  variant="light"
                  size="sm"
                  classNames={{
                    tabList: "gap-1 w-full relative rounded-md p-0",
                    cursor: "w-full bg-gradient-to-r from-[#4a85ff] to-[#1851c4] backdrop-blur-sm border border-[#4a85ff]/50 shadow-lg shadow-[#4a85ff]/25",
                    tab: "px-3 h-8 data-[selected=true]:text-white text-white/60 min-w-0",
                    tabContent: "group-data-[selected=true]:text-white font-medium text-xs"
                  }}
                >
                  <Tab
                    key="usd"
                    title={
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3" />
                        <span>USD</span>
                      </div>
                    }
                  />
                  <Tab
                    key="tokens"
                    title={
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-3 h-3" />
                        <span>Tokens</span>
                      </div>
                    }
                  />
                </Tabs>
              </div>
              <Chip 
                size="sm" 
                variant="flat" 
                className="bg-white/10 text-white/80 border border-white/20"
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
              {displayPools.map((pool, i) => (
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
                        <span className="text-white/80">{calculateUtilization(pool.borrowed, pool.supply).toFixed(2)}%</span>
                        <Progress 
                          value={calculateUtilization(pool.borrowed, pool.supply)}
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
      <Modal 
        isOpen={isDepositModalOpen} 
        onOpenChange={onDepositModalOpenChange}
        size="lg"
        backdrop="blur"
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              scale: 1,
              transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }
            },
            exit: {
              y: -20,
              opacity: 0,
              scale: 0.95,
              transition: {
                duration: 0.2,
                ease: [0.4, 0, 1, 1]
              }
            }
          }
        }}
        classNames={{
          base: "bg-transparent",
          wrapper: "items-center justify-center p-4",
          body: "p-0"
        }}
        hideCloseButton
        isDismissable={false}
        isKeyboardDismissDisabled={true}
      >
        <div ref={modalContentRef}>
          <ModalContent 
            className="border border-gray-700/40 backdrop-blur-lg max-h-[90vh] overflow-hidden relative transition-all duration-300 ease-out"
            style={{
              background: `
                radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                  rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                  rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                  rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                  transparent 75%
                ),
                linear-gradient(to bottom right, 
                  rgb(17 24 39 / 0.9), 
                  rgb(31 41 55 / 0.8), 
                  rgb(55 65 81 / 0.7)
                )
              `,
              transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
            }}
          >
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4a85ff]/10 flex items-center justify-center border border-[#4a85ff]/20">
                    <Database className="w-4 h-4 text-[#4a85ff]" />
                  </div>
                  <div>
                    <span className="text-lg font-medium text-white/90">
                      {selectedPool?.token} Pool
                    </span>
                  </div>
                </div>
              </ModalHeader>

              <ModalBody className="p-6 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Deposit Input Section */}
                  <div className="space-y-4">
                    <Input
                      type="text"
                      label="Deposit Amount"
                      value={depositAmount}
                      onValueChange={(value) => {
                        // Only allow numbers and decimals
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setDepositAmount(value);
                        }
                      }}
                      placeholder="0.00"
                      size="lg"
                      endContent={
                        <Chip size="sm" variant="flat" className="bg-white/10">
                          {selectedPool?.token || 'SOL'}
                        </Chip>
                      }
                      classNames={{
                        base: "max-w-full",
                        label: "text-white/80",
                        input: "text-white/90",
                        inputWrapper: "bg-white/5 border-white/10 hover:border-white/20 data-[hover=true]:bg-white/10 data-[focus=true]:!bg-white/10 data-[focus-visible=true]:!bg-white/10 focus:!bg-white/10"
                      }}
                    />
                    
                    {selectedPool && (
                      <div className="p-4 rounded-lg bg-gray-950/60 border border-white/5 space-y-3">
                        <h4 className="text-sm font-medium text-white/90 mb-2">Pool Information</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-white/60">Pool Supply:</span>
                            <p className="text-white/90 font-medium">{formatValue(selectedPool.supply, selectedPool.tokenPrice, selectedPool.token)}</p>
                          </div>
                          <div>
                            <span className="text-white/60">Supply Limit:</span>
                            <p className="text-white/90 font-medium">{formatValue(selectedPool.supplyLimit, selectedPool.tokenPrice, selectedPool.token)}</p>
                          </div>
                          <div>
                            <span className="text-white/60">Utilization:</span>
                            <p className="text-white/90 font-medium">{calculateUtilization(selectedPool.borrowed, selectedPool.supply).toFixed(2)}%</p>
                          </div>
                          <div>
                            <span className="text-white/60">Supply APY:</span>
                            <p className="text-green-400 font-medium">{selectedPool.supplyApy}%</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </ModalBody>

              <ModalFooter className="border-t border-white/5 px-6 py-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Database className="w-4 h-4" />
                    <span>Lending Pool Deposit</span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="flat"
                      onPress={onClose}
                      className="bg-white/5 hover:bg-white/10 border border-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      className={cn(
                        "font-semibold transition-all duration-300",
                        (!isProcessing && depositAmount && parseFloat(depositAmount) > 0 && !Number.isNaN(parseFloat(depositAmount)))
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
                          : "bg-white/10 text-white/40 border border-white/10"
                      )}
                      isDisabled={
                        isProcessing ||
                        !depositAmount ||
                        parseFloat(depositAmount) <= 0 ||
                        Number.isNaN(parseFloat(depositAmount))
                      }
                      onPress={handleDeposit}
                    >
                      {isProcessing ? "Processing..." : "Deposit"}
                    </Button>
                  </div>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
        </div>
      </Modal>
    </>
  )
} 