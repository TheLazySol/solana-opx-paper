'use client'

import { FC, useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, Badge, Button, Chip } from '@heroui/react'
import Image from 'next/image'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative"
    >
      {/* Subtle background glow */}
      <motion.div
        className="absolute -inset-0.5 bg-gradient-to-r from-[#4a85ff]/15 via-[#4a85ff]/10 to-[#4a85ff]/15 rounded-xl blur-sm"
        animate={{
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <Card className="relative bg-gradient-to-br from-white/10 via-white/5 to-transparent dark:from-black/40 dark:via-black/20 dark:to-transparent 
        backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl shadow-[#4a85ff]/10
        hover:shadow-[#4a85ff]/20 transition-all duration-500">
        
        <CardHeader className="pb-6 bg-gradient-to-r from-[#4a85ff]/10 to-[#4a85ff]/5 backdrop-blur-sm border-b border-white/10">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="p-2 rounded-lg bg-[#4a85ff]/20 backdrop-blur-sm">
              <Calendar className="h-5 w-5 text-[#4a85ff]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                Order History
              </h3>
              <p className="text-sm text-white/60 mt-0.5">
                {closedPositions.length} closed position{closedPositions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>
        </CardHeader>

        <CardBody className="p-6">
          {closedPositions.length === 0 ? (
            <motion.div 
              className="flex flex-col items-center justify-center min-h-[300px] space-y-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="p-4 rounded-full bg-gradient-to-br from-[#4a85ff]/20 to-[#4a85ff]/10 backdrop-blur-sm">
                <Calendar className="h-8 w-8 text-[#4a85ff]/60" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-white/80 mb-2">No History Yet</p>
                <p className="text-sm text-white/50">Your closed positions will appear here</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {currentPositions.map((position, index) => (
                    <motion.div 
                      key={position.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1, duration: 0.4 }}
                      className="group relative"
                    >
                      {/* Card glow effect */}
                      <motion.div
                        className="absolute -inset-0.5 bg-gradient-to-r from-[#4a85ff]/0 to-[#4a85ff]/0 rounded-xl blur-sm transition-all duration-300 group-hover:from-[#4a85ff]/10 group-hover:to-[#4a85ff]/10"
                        layoutId={`glow-${position.id}`}
                      />
                      
                      <div className="relative bg-gradient-to-br from-white/10 to-white/5 dark:from-black/30 dark:to-black/10 
                        backdrop-blur-md rounded-xl border border-white/20 dark:border-white/10 
                        hover:border-[#4a85ff]/30 transition-all duration-300 overflow-hidden">
                        
                        {/* Header */}
                        <motion.div 
                          className="p-4 cursor-pointer hover:bg-white/5 dark:hover:bg-black/20 transition-all duration-300"
                          onClick={() => toggleOrderExpansion(position.id)}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              {/* Asset Icon */}
                              <div className="flex items-center gap-3">
                                {position.asset.toUpperCase() === 'SOL' && (
                                  <div className="p-2 rounded-lg bg-[#4a85ff]/20 backdrop-blur-sm">
                                    <Image 
                                      src="/token-logos/solana_logo.png" 
                                      alt="Solana Logo" 
                                      width={24} 
                                      height={24} 
                                      className="drop-shadow-lg"
                                    />
                                  </div>
                                )}
                                <Chip 
                                  variant="flat" 
                                  className="bg-[#4a85ff]/20 text-[#4a85ff] border border-[#4a85ff]/30 capitalize font-medium"
                                >
                                  {position.asset}
                                </Chip>
                              </div>
                              
                              {/* Position Info */}
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-white/60" />
                                  <span className="text-white/70">{formatDate(position.closedAt)}</span>
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
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-white/60 mb-1">Total P/L</p>
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
                                className="p-2 rounded-lg bg-white/10 hover:bg-[#4a85ff]/20 transition-all duration-200"
                              >
                                <ChevronDown className="h-5 w-5 text-white/70" />
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
                              transition={{ duration: 0.4, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-3 border-t border-white/10">
                                {position.legs.map((leg, idx) => (
                                  <motion.div 
                                    key={`${position.id}-leg-${idx}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1, duration: 0.3 }}
                                    className="mt-3 p-4 rounded-lg bg-gradient-to-r from-white/5 to-transparent 
                                      dark:from-black/20 dark:to-transparent backdrop-blur-sm border border-white/10
                                      hover:border-[#4a85ff]/30 transition-all duration-300"
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
                                        <Chip size="sm" variant="flat" className="bg-[#4a85ff]/20 text-[#4a85ff] border border-[#4a85ff]/30">
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
                                      <div className="grid grid-cols-3 gap-6 text-sm">
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
                                            <span className={`font-semibold ${leg.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              
              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <motion.div 
                  className="flex items-center justify-center gap-4 mt-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Button
                      variant="flat"
                      size="sm"
                      onPress={goToPreviousPage}
                      isDisabled={currentPage === 1}
                      isIconOnly
                      className="h-10 w-10 bg-white/10 border border-white/20 text-white/80
                        hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/40 hover:text-[#4a85ff]
                        disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                        backdrop-blur-sm relative overflow-hidden group"
                    >
                      <motion.span
                        className="relative z-10"
                        initial={{ y: 0 }}
                        whileTap={{ y: 0.5 }}
                        transition={{ duration: 0.1 }}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </motion.span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#4a85ff]/20 to-transparent"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      />
                    </Button>
                  </motion.div>
                  
                  <div className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                    <span className="text-sm font-medium text-white/80">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Button
                      variant="flat"
                      size="sm"
                      onPress={goToNextPage}
                      isDisabled={currentPage === totalPages}
                      isIconOnly
                      className="h-10 w-10 bg-white/10 border border-white/20 text-white/80
                        hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/40 hover:text-[#4a85ff]
                        disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                        backdrop-blur-sm relative overflow-hidden group"
                    >
                      <motion.span
                        className="relative z-10"
                        initial={{ y: 0 }}
                        whileTap={{ y: 0.5 }}
                        transition={{ duration: 0.1 }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </motion.span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#4a85ff]/20 to-transparent"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      />
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  )
} 