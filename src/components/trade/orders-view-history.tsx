'use client'

import { FC, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Button } from '../ui/button'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'

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
    <Card className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-muted-foreground">
          Order History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {closedPositions.length === 0 ? (
          <div className="flex items-center justify-center text-muted-foreground min-h-[200px]">
            No order history available
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {currentPositions.map((position) => (
                <div 
                  key={position.id}
                  className="rounded-lg border border-[#e5e5e5]/20 dark:border-[#393939] p-2 sm:p-3"
                >
                  <div 
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 cursor-pointer"
                    onClick={() => toggleOrderExpansion(position.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {position.asset.toUpperCase() === 'SOL' && (
                        <Image 
                          src="/token-logos/solana_logo.png" 
                          alt="Solana Logo" 
                          width={24} 
                          height={24} 
                          className="mr-1"
                        />
                      )}
                      <Badge variant="grey" className="capitalize">
                        {position.asset}
                      </Badge>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Closed: <span className="text-foreground">{formatDate(position.closedAt)}</span>
                      </div>
                      <div className="text-xs sm:text-sm">
                        <Badge variant="outline">
                          {position.legs.length} leg{position.legs.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm text-muted-foreground">Total P/L</div>
                        <div className={`text-sm ${position.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {position.totalPnl >= 0 ? '+$' : '-$'}
                          {Math.abs(position.totalPnl).toFixed(2)}
                        </div>
                      </div>
                      {expandedOrders[position.id] ? 
                        <ChevronUp className="h-5 w-5 text-muted-foreground" /> : 
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      }
                    </div>
                  </div>
                  
                  {/* Closed Legs - Only shown when expanded */}
                  {expandedOrders[position.id] && (
                    <div className="space-y-1 mt-2">
                      {position.legs.map((leg, idx) => (
                        <div 
                          key={`${position.id}-leg-${idx}`}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 rounded-lg bg-white/5 dark:bg-black/20
                            border border-[#e5e5e5]/10 dark:border-[#393939]/50 text-xs sm:text-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-0">
                            <Badge variant={leg.position > 0 ? 'success' : 'destructive'}>
                              {leg.position > 0 ? 'Long' : 'Short'}
                            </Badge>
                            <Badge variant={leg.type === 'Call' ? 'blue' : 'destructive'}>
                              {leg.type}
                            </Badge>
                            <Badge variant="outline">
                              ${leg.strike}
                            </Badge>
                            <Badge variant="outline">
                              {leg.expiry.split('T')[0]}
                            </Badge>
                            <Badge variant="outline">
                              Qty: {formatQuantity(Math.abs(leg.position))}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-x-2 sm:gap-x-4 text-xs sm:text-sm">
                            <div className="text-right">
                              <div className="text-muted-foreground">Entry</div>
                              <div className="font-medium">${leg.entryPrice.toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-muted-foreground">Exit</div>
                              <div className="font-medium">${leg.exitPrice.toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-muted-foreground">P/L</div>
                              <div className={leg.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {leg.pnl >= 0 ? '+$' : '-$'}
                                {Math.abs(leg.pnl).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 