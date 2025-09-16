'use client'

import { FC, useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, Badge, Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react'
import Image from 'next/image'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Calendar, TrendingUp, TrendingDown, Trash2, AlertTriangle, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMouseGlow } from '@/hooks/useMouseGlow'

// Helper for formatting quantity with 2 decimal places, hiding .00 when whole numbers
const formatQuantity = (quantity: number): string => {
  // If it's a whole number, display without decimal places
  if (quantity === Math.floor(quantity)) {
    return quantity.toString();
  }
  // Otherwise, display with 2 decimal places
  return quantity.toFixed(2);
}

// Types for closed positions
type ClosedOptionLeg = {
  type: 'Call' | 'Put'
  strike: number
  expiry: string
  position: number
  entryPrice: number
  exitPrice: number
  pnl: number
}

type ClosedPosition = {
  id: string
  asset: string
  closedAt: string
  legs: ClosedOptionLeg[]
  totalPnl: number
}

export const OrdersViewHistory: FC = () => {
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})
  const positionsPerPage = 10
  
  // Mouse glow effect hooks
  const historyCardRef = useMouseGlow()
  
  // Modal for clear history confirmation
  const {isOpen, onOpen, onOpenChange} = useDisclosure()
  
  // Load closed positions from localStorage
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('closedOrders')
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory)
        // Sort by closedAt date (newest first)
        const sortedHistory = parsedHistory.sort((a: ClosedPosition, b: ClosedPosition) => 
          new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()
        )
        setClosedPositions(sortedHistory)
      }
    } catch (error) {
      console.error('Error loading closed orders history:', error)
    }
  }, [])

  // Calculate pagination
  const totalPages = Math.ceil(closedPositions.length / positionsPerPage)
  const indexOfLastPosition = currentPage * positionsPerPage
  const indexOfFirstPosition = indexOfLastPosition - positionsPerPage
  const currentPositions = closedPositions.slice(indexOfFirstPosition, indexOfLastPosition)

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Toggle leg expansion
  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }

  // Clear trade history
  const handleClearHistory = () => {
    try {
      localStorage.removeItem('closedOrders')
      setClosedPositions([])
      setCurrentPage(1)
      setExpandedOrders({})
    } catch (error) {
      console.error('Error clearing trade history:', error)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Animation variants  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <motion.div variants={itemVariants}>
        <Card 
          ref={historyCardRef}
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
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                  <History className="w-3 h-3 text-[#4a85ff]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Order History</h3>
                  {closedPositions.length > 0 && (
                    <p className="text-sm text-white/60 mt-0.5">
                      {closedPositions.length} closed position{closedPositions.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              
              {closedPositions.length > 0 && (
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  onPress={onOpen}
                  startContent={<Trash2 className="h-4 w-4" />}
                  className="bg-red-500/10 border border-red-500/30 text-red-400 
                    hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300
                    transition-all duration-300 backdrop-blur-sm"
                >
                  Clear History
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardBody className="p-4 sm:p-6">
            {closedPositions.length === 0 ? (
              <motion.div 
                className="flex flex-col items-center justify-center min-h-[300px] py-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-500/20">
                    <History className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-white/90">No History Yet</p>
                    <p className="text-sm text-white/60 max-w-sm">Your closed positions will appear here after you close trades</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {currentPositions.map((position, index) => (
                    <motion.div 
                      key={position.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className="group relative"
                    >
                      <Card className="bg-black/20 backdrop-blur-md border border-white/10 hover:border-blue-500/30 transition-all duration-300 overflow-hidden">
                        {/* Header */}
                        <CardBody className="p-0">
                          <motion.div 
                            className="p-4 cursor-pointer hover:bg-white/5 transition-all duration-300"
                            onClick={() => toggleOrderExpansion(position.id)}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3 sm:gap-4">
                                {/* Asset Icon */}
                                <div className="flex items-center gap-2 sm:gap-3">
                                  {position.asset.toUpperCase() === 'SOL' && (
                                    <div className="p-2 rounded-lg bg-[#4a85ff]/20 backdrop-blur-sm">
                                      <Image 
                                        src="/token-logos/solana_logo.png" 
                                        alt="Solana Logo" 
                                        width={20} 
                                        height={20}
                                        className="drop-shadow-lg sm:w-6 sm:h-6"
                                      />
                                    </div>
                                  )}
                                  <Chip 
                                    variant="flat" 
                                    size="sm"
                                    className="bg-blue-500/20 text-blue-400 border border-blue-500/30 capitalize font-medium"
                                  >
                                    {position.asset}
                                  </Chip>
                                </div>
                                
                                {/* Position Info */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-white/60" />
                                    <span className="text-white/70 text-xs sm:text-sm">{formatDate(position.closedAt)}</span>
                                  </div>
                                  <Chip 
                                    size="sm" 
                                    variant="flat"
                                    className="bg-white/10 text-white/80 border border-white/20"
                                  >
                                    {position.legs.length} leg{position.legs.length !== 1 ? 's' : ''}
                                  </Chip>
                                </div>
                              </div>
                              
                              {/* P/L and Expand */}
                              <div className="flex items-center gap-3 sm:gap-4">
                                <div className="text-left sm:text-right">
                                  <p className="text-xs text-white/60 mb-1">Total P/L</p>
                                  <div className="flex items-center gap-2">
                                    {position.totalPnl >= 0 ? (
                                      <TrendingUp className="h-4 w-4 text-green-400" />
                                    ) : (
                                      <TrendingDown className="h-4 w-4 text-red-400" />
                                    )}
                                    <span className={`text-lg font-semibold ${position.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {position.totalPnl >= 0 ? '+$' : '-$'}
                                      {Math.abs(position.totalPnl).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                
                                <motion.div
                                  animate={{ rotate: expandedOrders[position.id] ? 180 : 0 }}
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className="p-2 rounded-lg bg-white/10 hover:bg-blue-500/20 transition-all duration-200"
                                >
                                  <ChevronDown className="h-4 w-4 text-white/70" />
                                </motion.div>
                              </div>
                            </div>
                          </motion.div>
                          
                          {/* Expanded Content */}
                          <AnimatePresence>
                            {expandedOrders[position.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden border-t border-white/10"
                              >
                                <div className="p-4 space-y-3">
                                  {position.legs.map((leg, idx) => (
                                    <motion.div 
                                      key={`${position.id}-leg-${idx}`}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.1, duration: 0.3 }}
                                      className="p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all duration-300"
                                    >
                                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        {/* Leg Details */}
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Chip 
                                            size="sm" 
                                            variant="flat"
                                            className={leg.position > 0 
                                              ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                                            }
                                          >
                                            {leg.position > 0 ? 'Long' : 'Short'}
                                          </Chip>
                                          <Chip 
                                            size="sm" 
                                            variant="flat"
                                            className={leg.type === 'Call' 
                                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                                              : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                            }
                                          >
                                            {leg.type}
                                          </Chip>
                                          <Chip size="sm" variant="flat" className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                            ${leg.strike}
                                          </Chip>
                                          <Chip size="sm" variant="flat" className="bg-white/10 text-white/80 border border-white/20">
                                            {leg.expiry.split('T')[0]}
                                          </Chip>
                                          <Chip size="sm" variant="flat" className="bg-white/10 text-white/80 border border-white/20">
                                            Qty: {formatQuantity(Math.abs(leg.position))}
                                          </Chip>
                                        </div>
                                        
                                        {/* Pricing Info */}
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                          <div className="text-center">
                                            <p className="text-white/60 mb-1">Entry</p>
                                            <p className="font-semibold text-white/90">${leg.entryPrice.toFixed(2)}</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-white/60 mb-1">Exit</p>
                                            <p className="font-semibold text-white/90">${leg.exitPrice.toFixed(2)}</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-white/60 mb-1">P/L</p>
                                            <div className="flex items-center justify-center gap-1">
                                              {leg.pnl >= 0 ? (
                                                <TrendingUp className="h-3 w-3 text-green-400" />
                                              ) : (
                                                <TrendingDown className="h-3 w-3 text-red-400" />
                                              )}
                                              <span className={`font-semibold text-sm ${leg.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {leg.pnl >= 0 ? '+$' : '-$'}
                                                {Math.abs(leg.pnl).toFixed(2)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardBody>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Enhanced Pagination */}
                {totalPages > 1 && (
                  <motion.div 
                    className="flex items-center justify-center gap-4 mt-6 pt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <Button
                      variant="flat"
                      size="sm"
                      onPress={goToPreviousPage}
                      isDisabled={currentPage === 1}
                      isIconOnly
                      aria-label="Go to previous page"
                      className="h-9 w-9 bg-white/10 border border-white/20 text-white/80
                        hover:bg-blue-500/20 hover:border-blue-500/40 hover:text-blue-400
                        disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                        backdrop-blur-sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                      <span className="text-sm font-medium text-white/80">
                        {currentPage} / {totalPages}
                      </span>
                    </div>
                    
                    <Button
                      variant="flat"
                      size="sm"
                      onPress={goToNextPage}
                      isDisabled={currentPage === totalPages}
                      isIconOnly
                      aria-label="Go to next page"
                      className="h-9 w-9 bg-white/10 border border-white/20 text-white/80
                        hover:bg-blue-500/20 hover:border-blue-500/40 hover:text-blue-400
                        disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                        backdrop-blur-sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* Clear History Confirmation Modal */}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        size="md"
        classNames={{
          backdrop: "bg-black/50 backdrop-blur-sm",
          base: "border border-red-500/20 bg-black/80 backdrop-blur-md",
          header: "border-b border-red-500/20",
          body: "py-6",
          footer: "border-t border-red-500/20"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20 backdrop-blur-sm">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <span className="text-red-400 font-semibold">Confirm Clear History</span>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-white/80">
                    Are you sure you want to permanently delete all your trade history? 
                  </p>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 text-sm font-medium">
                      ⚠️ This action cannot be undone
                    </p>
                    <p className="text-white/60 text-sm mt-1">
                      All {closedPositions.length} closed position{closedPositions.length !== 1 ? 's' : ''} will be permanently removed.
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <div className="flex gap-3">
                  <Button 
                    variant="flat" 
                    onPress={onClose}
                    className="bg-white/10 border border-white/20 text-white/80
                      hover:bg-white/20 hover:border-white/30 hover:text-white
                      transition-all duration-300"
                  >
                    Cancel
                  </Button>
                  <Button 
                    color="danger" 
                    variant="flat"
                    onPress={() => {
                      handleClearHistory()
                      onClose()
                    }}
                    startContent={<Trash2 className="h-4 w-4" />}
                    className="bg-red-500/20 border border-red-500/30 text-red-400
                      hover:bg-red-500/30 hover:border-red-500/50 hover:text-red-300
                      transition-all duration-300"
                  >
                    Clear History
                  </Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </motion.div>
  )
} 