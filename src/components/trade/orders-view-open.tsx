'use client'

import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import React from 'react'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// Data structure for option positions
type OptionLeg = {
  type: 'Call' | 'Put'
  strike: number
  expiry: string
  position: number
  marketPrice: number
  delta: number
  theta: number
  gamma: number
  vega: number
  rho: number
  collateral: number
  value: number
  pnl: number
}

type AssetPosition = {
  asset: string
  marketPrice: number
  legs: OptionLeg[]
  // Aggregated values
  netDelta: number
  netTheta: number
  netGamma: number
  netVega: number
  netRho: number
  totalCollateral: number
  totalValue: number
  totalPnl: number
  // Add id for unique key
  id: string
}

export const OrdersViewOpen = () => {
  const [expandedAssets, setExpandedAssets] = useState<string[]>([])
  const [positions, setPositions] = useState<AssetPosition[]>([])

  // Load positions from localStorage on component mount
  useEffect(() => {
    try {
      const storedOrders = localStorage.getItem('openOrders')
      if (storedOrders) {
        const parsedOrders: AssetPosition[] = JSON.parse(storedOrders)
        
        // Calculate aggregate values for each position and add unique IDs
        const updatedPositions = parsedOrders.map((position, index) => {
          const netDelta = position.legs.reduce((sum, leg) => sum + leg.delta, 0)
          const netTheta = position.legs.reduce((sum, leg) => sum + leg.theta, 0)
          const netGamma = position.legs.reduce((sum, leg) => sum + leg.gamma, 0)
          const netVega = position.legs.reduce((sum, leg) => sum + leg.vega, 0)
          const netRho = position.legs.reduce((sum, leg) => sum + leg.rho, 0)
          
          return {
            ...position,
            netDelta,
            netTheta,
            netGamma,
            netVega,
            netRho,
            // Add unique ID using timestamp and index
            id: position.id || `${position.asset}-${Date.now()}-${index}`
          }
        })
        
        setPositions(updatedPositions)
        
        // Expand all assets by default for better UX
        if (updatedPositions.length > 0) {
          setExpandedAssets(updatedPositions.map(pos => pos.id))
        }
      }
    } catch (error) {
      console.error('Error loading open orders:', error)
    }
  }, [])

  // Update market prices and P/L values periodically
  useEffect(() => {
    const updatePositions = () => {
      setPositions(prevPositions => {
        return prevPositions.map(position => {
          // In a real app, we would fetch the latest price from an API
          // For this demo, we'll simulate price changes
          const priceChange = (Math.random() - 0.5) * 0.02 // Random price change ±1%
          const newMarketPrice = position.marketPrice * (1 + priceChange)
          
          // Update legs with new market prices and P/L
          const legs = position.legs.map(leg => {
            // Simulate changes in option prices based on underlying movement
            const legPriceChange = priceChange * (leg.delta * 100)
            const newLegPrice = leg.marketPrice * (1 + legPriceChange)
            
            // Calculate new P/L
            const pnl = (newLegPrice - leg.marketPrice) * Math.abs(leg.position) * 100
            
            return {
              ...leg,
              marketPrice: newLegPrice,
              pnl
            }
          })
          
          // Calculate new totals
          const totalPnl = legs.reduce((sum, leg) => sum + leg.pnl, 0)
          
          return {
            ...position,
            marketPrice: newMarketPrice,
            legs,
            totalPnl
          }
        })
      })
    }
    
    // Update positions every 10 seconds
    const intervalId = setInterval(updatePositions, 10000)
    
    return () => clearInterval(intervalId)
  }, [])

  const toggleAsset = (id: string) => {
    setExpandedAssets(prev => 
      prev.includes(id) 
        ? prev.filter(a => a !== id)
        : [...prev, id]
    )
  }

  const handleCloseAll = (id: string) => {
    // Remove all positions for this asset
    const updatedPositions = positions.filter(pos => pos.id !== id)
    setPositions(updatedPositions)
    
    // Update localStorage
    localStorage.setItem('openOrders', JSON.stringify(updatedPositions))
    
    console.log(`Closed position with ID ${id}`)
  }

  const handleCloseLeg = (id: string, legIndex: number) => {
    // Find the position for this ID
    const positionIndex = positions.findIndex(pos => pos.id === id)
    if (positionIndex === -1) return
    
    // Make a deep copy of positions
    const updatedPositions = [...positions]
    const position = { ...updatedPositions[positionIndex] }
    
    // Remove the leg
    position.legs = position.legs.filter((_, idx) => idx !== legIndex)
    
    // If all legs are removed, remove the entire position
    if (position.legs.length === 0) {
      updatedPositions.splice(positionIndex, 1)
    } else {
      // Recalculate aggregate values
      position.netDelta = position.legs.reduce((sum, leg) => sum + leg.delta, 0)
      position.netTheta = position.legs.reduce((sum, leg) => sum + leg.theta, 0)
      position.netGamma = position.legs.reduce((sum, leg) => sum + leg.gamma, 0)
      position.netVega = position.legs.reduce((sum, leg) => sum + leg.vega, 0)
      position.netRho = position.legs.reduce((sum, leg) => sum + leg.rho, 0)
      position.totalPnl = position.legs.reduce((sum, leg) => sum + leg.pnl, 0)
      
      updatedPositions[positionIndex] = position
    }
    
    // Update state and localStorage
    setPositions(updatedPositions)
    localStorage.setItem('openOrders', JSON.stringify(updatedPositions))
    
    console.log(`Closed leg ${legIndex} for position with ID ${id}`)
  }

  return (
    <Card className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-muted-foreground">
          Open Positions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No open positions
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map((position) => (
              <div 
                key={position.id}
                className="rounded-lg border border-[#e5e5e5]/20 dark:border-[#393939] overflow-hidden"
              >
                {/* Position Header */}
                <div 
                  className="bg-white/5 dark:bg-black/20 p-3 cursor-pointer hover:bg-white/10 dark:hover:bg-black/30
                    transition-colors duration-200"
                  onClick={() => toggleAsset(position.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-4 h-4 flex items-center justify-center 
                        rounded-full border border-[#e5e5e5]/50 dark:border-[#393939]
                        transition-all duration-200
                        ${expandedAssets.includes(position.id) 
                          ? 'bg-[#4a85ff]/10 border-[#4a85ff]/40' 
                          : 'hover:border-[#4a85ff]/40 hover:bg-[#4a85ff]/10'
                        }
                      `}>
                        <ChevronRight 
                          size={12} 
                          className={`
                            text-muted-foreground
                            transition-transform duration-200
                            ${expandedAssets.includes(position.id) ? 'rotate-90' : ''}
                          `}
                        />
                      </div>
                      <Badge variant="grey" className="capitalize">
                        {position.asset}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        Market Price: <span className="text-foreground">${position.marketPrice.toFixed(2)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Positions: <span className="text-foreground">{position.legs.length}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="grid grid-cols-2 gap-x-6 text-sm">
                        <div className="text-right">
                          <div className="text-muted-foreground">Total Value</div>
                          <div className="font-medium">${position.totalValue.toFixed(2)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground">P/L</div>
                          <div className={position.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {position.totalPnl >= 0 ? '+$' : '-$'}
                            {Math.abs(position.totalPnl).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCloseAll(position.id)
                        }}
                        className="text-red-500/50 hover:text-red-500 transition-all duration-200 hover:scale-110"
                      >
                        Close All
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedAssets.includes(position.id) && (
                  <div className="p-3 space-y-3">
                    {/* Greeks Summary */}
                    <div className="grid grid-cols-5 gap-4 p-2 rounded-lg bg-white/5 dark:bg-black/20">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Delta</div>
                        <div className="font-medium">{position.netDelta.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Theta</div>
                        <div className="font-medium">{position.netTheta.toFixed(3)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Gamma</div>
                        <div className="font-medium">{position.netGamma.toFixed(3)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Vega</div>
                        <div className="font-medium">{position.netVega.toFixed(3)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Rho</div>
                        <div className="font-medium">{position.netRho.toFixed(3)}</div>
                      </div>
                    </div>

                    {/* Individual Legs */}
                    <div className="space-y-2">
                      {position.legs.map((leg, idx) => (
                        <div 
                          key={`${position.id}-leg-${idx}`}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/5 dark:bg-black/20
                            border border-[#e5e5e5]/10 dark:border-[#393939]/50"
                        >
                          <div className="flex items-center gap-3">
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
                            <div className="text-sm space-x-3">
                              <span>
                                <span className="text-muted-foreground">Price:</span> ${leg.marketPrice.toFixed(2)}
                              </span>
                              <span>
                                <span className="text-muted-foreground">Qty:</span> {Math.abs(leg.position)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="grid grid-cols-2 gap-x-6 text-sm">
                              <div className="text-right">
                                <div className="text-muted-foreground">Value</div>
                                <div className="font-medium">${leg.value.toFixed(2)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-muted-foreground">P/L</div>
                                <div className={leg.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                  {leg.pnl >= 0 ? '+$' : '-$'}
                                  {Math.abs(leg.pnl).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCloseLeg(position.id, idx)}
                              className="text-red-500/50 hover:text-red-500 transition-all duration-200 hover:scale-110"
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 