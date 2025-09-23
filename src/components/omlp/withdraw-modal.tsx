'use client'

import { 
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  Chip,
  Spinner
} from '@heroui/react'
import { TrendingDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/utils'
import { motion } from 'framer-motion'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { Position } from './my-lending-positions'

interface WithdrawModalProps {
  isOpen: boolean
  onOpenChange: () => void
  selectedPosition: Position | null
  onWithdraw: (amount: number) => Promise<void>
  isProcessing?: boolean
}

export function WithdrawModal({ 
  isOpen, 
  onOpenChange, 
  selectedPosition, 
  onWithdraw,
  isProcessing = false
}: WithdrawModalProps) {
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const modalContentRef = useMouseGlow()

  const handleWithdraw = async () => {
    if (!selectedPosition || !withdrawAmount) return
    
    const numericAmount = parseFloat(withdrawAmount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      console.warn('Invalid amount entered:', withdrawAmount)
      return
    }

    if (numericAmount > selectedPosition.amount) {
      console.warn('Amount exceeds available balance')
      return
    }

    await onWithdraw(numericAmount)
    setWithdrawAmount('')
  }

  const handleModalClose = () => {
    setWithdrawAmount('')
    onOpenChange()
  }

  const handleMaxClick = () => {
    if (selectedPosition) {
      setWithdrawAmount(selectedPosition.amount.toString())
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={handleModalClose}
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
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <span className="text-lg font-medium text-white/90">
                    Withdraw from {selectedPosition?.token} Position
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
                {/* Withdraw Input Section */}
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      type="text"
                      label="Withdraw Amount"
                      value={withdrawAmount}
                      onValueChange={(value) => {
                        // Only allow numbers and decimals
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setWithdrawAmount(value);
                        }
                      }}
                      placeholder="0.00"
                      size="lg"
                      endContent={
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="flat"
                            className="bg-white/10 hover:bg-white/20 text-white/80 min-w-12 h-6"
                            onPress={handleMaxClick}
                          >
                            MAX
                          </Button>
                          <Chip size="sm" variant="flat" className="bg-white/10">
                            {selectedPosition?.token || 'SOL'}
                          </Chip>
                        </div>
                      }
                      classNames={{
                        base: "max-w-full",
                        label: "text-white/80",
                        input: "text-white/90",
                        inputWrapper: "bg-white/5 border-white/10 hover:border-white/20 data-[hover=true]:bg-white/10 data-[focus=true]:!bg-white/10 data-[focus-visible=true]:!bg-white/10 focus:!bg-white/10"
                      }}
                    />
                  </div>
                  
                  {selectedPosition && (
                    <div className="p-4 rounded-lg bg-gray-950/60 border border-white/5 space-y-3">
                      <h4 className="text-sm font-medium text-white/90 mb-2">Position Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-white/60">Available Balance:</span>
                          <p className="text-white/90 font-medium">
                            ${selectedPosition.amount.toLocaleString(undefined, { 
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                        </div>
                        <div>
                          <span className="text-white/60">Current APY:</span>
                          <p className="text-green-400 font-medium">{selectedPosition.apy.toFixed(2)}%</p>
                        </div>
                        <div>
                          <span className="text-white/60">Total Earned:</span>
                          <p className="text-green-400 font-medium">
                            +${selectedPosition.earned.toLocaleString(undefined, { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2
                            })}
                          </p>
                        </div>
                        <div>
                          <span className="text-white/60">After Withdraw:</span>
                          <p className="text-white/90 font-medium">
                            ${Math.max(0, selectedPosition.amount - (parseFloat(withdrawAmount) || 0)).toLocaleString(undefined, { 
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
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
                  <TrendingDown className="w-4 h-4" />
                  <span>Lending Position Withdrawal</span>
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
                      (!isProcessing && withdrawAmount && parseFloat(withdrawAmount) > 0 && !Number.isNaN(parseFloat(withdrawAmount)) && selectedPosition && parseFloat(withdrawAmount) <= selectedPosition.amount)
                        ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
                        : "bg-white/10 text-white/40 border border-white/10"
                    )}
                    isDisabled={
                      isProcessing ||
                      !withdrawAmount ||
                      parseFloat(withdrawAmount) <= 0 ||
                      Number.isNaN(parseFloat(withdrawAmount)) ||
                      !selectedPosition ||
                      parseFloat(withdrawAmount) > selectedPosition.amount
                    }
                    onPress={handleWithdraw}
                  >
                    {isProcessing ? "Processing..." : "Withdraw"}
                  </Button>
                </div>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
      </div>
    </Modal>
  )
}
