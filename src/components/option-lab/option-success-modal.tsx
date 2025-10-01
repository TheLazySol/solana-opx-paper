'use client'

import { 
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip
} from '@heroui/react'
import { CheckCircle, ExternalLink, Copy, Calendar, DollarSign } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/utils'
import { motion } from 'framer-motion'
import { useMouseGlow } from '@/hooks/useMouseGlow'

interface OptionSuccessModalProps {
  isOpen: boolean
  onOpenChange: () => void
  optionDetails?: {
    token: string
    type: 'Call' | 'Put'
    direction: 'Long' | 'Short'
    strikePrice: number
    premium: number
    quantity: number
    expirationDate: string
    totalValue: number
    transactionHash?: string
  } | null
}

export function OptionSuccessModal({ 
  isOpen, 
  onOpenChange, 
  optionDetails 
}: OptionSuccessModalProps) {
  const modalContentRef = useMouseGlow()
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const handleModalClose = () => {
    onOpenChange()
  }

  const viewOnExplorer = () => {
    if (optionDetails?.transactionHash) {
      window.open(`https://solscan.io/tx/${optionDetails.transactionHash}`, '_blank')
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
                rgba(34, 197, 94, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                rgba(16, 185, 129, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                rgba(34, 197, 94, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
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
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/30">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <span className="text-xl font-semibold text-white/90">
                    Option Created Successfully!
                  </span>
                  <p className="text-sm text-white/60">
                    Your option contract has been minted and is now active
                  </p>
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
                {/* Success Animation */}
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 200, 
                      damping: 15,
                      delay: 0.2
                    }}
                    className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30"
                  >
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </motion.div>
                </div>

                {/* Option Summary */}
                {optionDetails && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-gray-950/60 border border-white/5">
                      <h4 className="text-sm font-medium text-white/90 mb-3">Option Contract Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-white/60">Type:</span>
                          <Chip 
                            size="sm" 
                            className={cn(
                              "text-xs",
                              optionDetails.type === 'Call' 
                                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                            )}
                          >
                            {optionDetails.type}
                          </Chip>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/60">Direction:</span>
                          <Chip 
                            size="sm" 
                            variant="flat" 
                            className="bg-white/10 text-white/90"
                          >
                            {optionDetails.direction}
                          </Chip>
                        </div>
                        <div>
                          <span className="text-white/60">Asset:</span>
                          <p className="text-white/90 font-medium">{optionDetails.token}</p>
                        </div>
                        <div>
                          <span className="text-white/60">Quantity:</span>
                          <p className="text-white/90 font-medium">{optionDetails.quantity}</p>
                        </div>
                        <div>
                          <span className="text-white/60">Strike Price:</span>
                          <p className="text-white/90 font-medium">${optionDetails.strikePrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-white/60">Premium:</span>
                          <p className="text-white/90 font-medium">${optionDetails.premium.toFixed(2)}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-white/60">Expiration:</span>
                          <p className="text-white/90 font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {optionDetails.expirationDate}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-white/60">Total Value:</span>
                          <p className="text-green-400 font-medium flex items-center gap-2 text-lg">
                            <DollarSign className="w-4 h-4" />
                            {optionDetails.totalValue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Hash */}
                    {optionDetails.transactionHash && (
                      <div className="p-4 rounded-lg bg-gray-950/60 border border-white/5">
                        <h4 className="text-sm font-medium text-white/90 mb-3">Transaction Details</h4>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs text-white/70 bg-white/5 px-2 py-1 rounded font-mono break-all">
                            {optionDetails.transactionHash}
                          </code>
                          <Button
                            size="sm"
                            variant="flat"
                            className="bg-white/5 hover:bg-white/10 border border-white/10"
                            onPress={() => copyToClipboard(optionDetails.transactionHash || '')}
                          >
                            {copied ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30"
                            onPress={viewOnExplorer}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Next Steps */}
                <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-500/20">
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Whats Next?</h4>
                  <ul className="text-sm text-white/70 space-y-1">
                    <li>• Your option is now active and can be exercised or traded</li>
                    <li>• Monitor your position in the Portfolio section</li>
                    <li>• Set up alerts for price movements</li>
                  </ul>
                </div>
              </motion.div>
            </ModalBody>

            <ModalFooter className="border-t border-white/5 px-6 py-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Option Contract Created</span>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="flat"
                    onPress={onClose}
                    className="bg-white/5 hover:bg-white/10 border border-white/10"
                  >
                    Close
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 font-semibold transition-all duration-300"
                    onPress={() => {
                      onClose()
                      // Navigate to portfolio or dashboard
                      // You can add navigation logic here
                    }}
                  >
                    View Portfolio
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
