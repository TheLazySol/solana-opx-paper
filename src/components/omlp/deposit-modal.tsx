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
import { Database } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/utils'
import { motion } from 'framer-motion'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { calculateUtilization } from '@/constants/omlp/calculations'
import { Pool } from './lending-pools'

interface DepositModalProps {
  isOpen: boolean
  onOpenChange: () => void
  selectedPool: Pool | null
  onDeposit: (amount: number) => Promise<void>
  formatValue: (value: number, tokenPrice: number, token: string) => string
  isProcessing?: boolean
}

export function DepositModal({ 
  isOpen, 
  onOpenChange, 
  selectedPool, 
  onDeposit,
  formatValue,
  isProcessing = false
}: DepositModalProps) {
  const [depositAmount, setDepositAmount] = useState('')
  const modalContentRef = useMouseGlow()

  const handleDeposit = async () => {
    if (!selectedPool || !depositAmount) return
    
    const numericAmount = parseFloat(depositAmount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      console.warn('Invalid amount entered:', depositAmount)
      return
    }

    await onDeposit(numericAmount)
    setDepositAmount('')
  }

  const handleModalClose = () => {
    setDepositAmount('')
    onOpenChange()
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
  )
}
