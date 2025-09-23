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
  useDisclosure
} from '@heroui/react'
import { RefreshCw, TrendingUp, DollarSign, Activity } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/utils'
import { getTokenDisplayDecimals } from '@/constants/token-list/token-list'
import { motion, AnimatePresence } from 'framer-motion'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { useLendingPositions } from '@/context/lending-positions-provider'

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
  const [currentToken, setCurrentToken] = useState('')
  const [amount, setAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDepositing, setIsDepositing] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  // Mouse glow effect hook
  const cardRef = useMouseGlow()
  
  // Use lending positions context
  const { positions, addPosition, updatePosition, removePosition } = useLendingPositions()

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

  const handleOpenDepositModal = (token: string) => {
    setCurrentToken(token)
    setAmount('')
    onDepositModalOpen()
  }

  const handleOpenWithdrawModal = (token: string, maxAmount: number) => {
    setCurrentToken(token)
    setAmount(maxAmount.toString())
    onWithdrawModalOpen()
  }

  const handleDeposit = async () => {
    try {
      setIsProcessing(true)
      const numericAmount = parseFloat(amount)
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        console.warn('Invalid amount entered:', amount)
        return
      }

      // Find the current position to get the APY, or use a default
      const existingPosition = positions.find(p => p.token === currentToken)
      const apy = existingPosition?.apy || 5.0 // Default APY if no existing position
      
      // Add to the user's lending positions
      addPosition(currentToken, numericAmount, apy)
      
      console.log('Deposit successful:', { token: currentToken, amount: numericAmount })
      
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

  const handleWithdraw = async () => {
    try {
      setIsProcessing(true)
      const numericAmount = parseFloat(amount)
      // Find the current position to check the maximum available amount
      const selectedPosition = positions.find(p => p.token === currentToken)
      
      // Validate withdrawal amount
      if (!selectedPosition || numericAmount <= 0 || numericAmount > selectedPosition.amount) {
        throw new Error(`Invalid withdrawal amount. Maximum available: ${selectedPosition?.amount ?? 0}`)
      }
      
      // Update the position with the new amount (subtract withdrawal)
      const newAmount = selectedPosition.amount - numericAmount
      if (newAmount <= 0) {
        // Remove the position completely if withdrawing all
        removePosition(currentToken)
      } else {
        // Update with remaining amount
        updatePosition(currentToken, newAmount)
      }
      
      console.log('Withdraw successful:', { token: currentToken, amount: numericAmount })
      
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
                size="sm" 
                variant="flat" 
                className="bg-white/10 text-white/80 border border-white/20"
                startContent={<DollarSign className="w-3 h-3" />}
              >
                TVL: ${totalValue.toFixed(2)}
              </Chip>
              <Chip 
                size="sm" 
                variant="flat" 
                className="bg-blue-500/20 text-blue-400 border border-blue-500/30"
                startContent={<TrendingUp className="w-3 h-3" />}
              >
                Earned: ${totalEarned.toFixed(2)}
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
                className="w-10 h-10 min-w-10 bg-white/5 hover:bg-white/10 data-[hover=true]:scale-110 data-[pressed=true]:scale-95"
              >
                {!isRefreshing && <RefreshCw className="h-4 w-4 text-foreground-500" />}
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
                      ${position.amount.toLocaleString(undefined, { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" className="bg-green-500/20 text-green-400">
                        {position.apy.toFixed(2)}%
                      </Chip>
                    </TableCell>
                    <TableCell className="text-green-400 font-medium">
                      +${position.earned.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-start gap-2">
                        <Button 
                          size="sm"
                          variant="flat"
                          onPress={() => handleOpenWithdrawModal(position.token, position.amount)}
                          isDisabled={isWithdrawing}
                          className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        >
                          Withdraw
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => handleOpenDepositModal(position.token)}
                          isDisabled={isDepositing}
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
                  Deposit to {currentToken} Pool
                </span>
                <span className="text-sm text-white/60">
                  Enter the amount you would like to deposit
                </span>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    type="number"
                    label="Amount"
                    value={amount}
                    onValueChange={setAmount}
                    variant="flat"
                    placeholder={`0.00 ${currentToken}`}
                    min="0"
                    step="any"
                    classNames={{
                      label: "text-white/80",
                      input: "text-white",
                      inputWrapper: "bg-white/5 border border-white/10 hover:bg-white/10"
                    }}
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-white/60 text-xs">{currentToken}</span>
                      </div>
                    }
                  />
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
                    !amount || 
                    isProcessing || 
                    !Number.isFinite(parseFloat(amount)) ||
                    parseFloat(amount) <= 0
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

      {/* Withdraw Modal */}
      <Modal 
        isOpen={isWithdrawModalOpen} 
        onOpenChange={onWithdrawModalOpenChange}
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
                  Withdraw from {currentToken} Pool
                </span>
                <span className="text-sm text-white/60">
                  Enter the amount you would like to withdraw
                </span>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    type="number"
                    label="Amount"
                    value={amount}
                    onValueChange={setAmount}
                    variant="flat"
                    placeholder={`0.00 ${currentToken}`}
                    description={`Maximum: ${positions.find(p => p.token === currentToken)?.amount ?? 0} ${currentToken}`}
                    min="0"
                    step="any"
                    classNames={{
                      label: "text-white/80",
                      input: "text-white",
                      inputWrapper: "bg-white/5 border border-white/10 hover:bg-white/10",
                      description: "text-white/40"
                    }}
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-white/60 text-xs">{currentToken}</span>
                      </div>
                    }
                  />
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
                  color="danger"
                  onPress={handleWithdraw} 
                  isDisabled={
                    !amount || 
                    isProcessing || 
                    parseFloat(amount) <= 0 || 
                    parseFloat(amount) > (positions.find(p => p.token === currentToken)?.amount ?? 0)
                  }
                  className="bg-red-500 hover:bg-red-600"
                >
                  {isProcessing ? "Processing..." : "Withdraw"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
} 