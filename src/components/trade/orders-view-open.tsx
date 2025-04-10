'use client'

import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '../ui/button'
import React from 'react'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { calculateOption } from '@/lib/option-pricing-model/black-scholes-model'
import { SOL_PH_VOLATILITY, SOL_PH_RISK_FREE_RATE } from '@/constants/constants'

// Data structure for option positions
type OptionLeg = {
  type: 'Call' | 'Put'
  strike: number
  expiry: string
  position: number
  marketPrice: number
  entryPrice: number
  underlyingEntryPrice: number
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
  
  // Get current asset prices for all assets in positions
  const { price: solPrice } = useAssetPriceInfo('SOL')

  // Helper function to get price for any asset
  const getAssetPrice = useCallback((asset: string): number => {
    switch (asset.toUpperCase()) {
      case 'SOL': return solPrice || 0
      default: return 0
    }
  }, [solPrice])

  // Helper function to calculate time until expiry in seconds
  const calculateTimeUntilExpiry = useCallback((expiryDate: string): number => {
    const expiry = new Date(expiryDate)
    const now = new Date()
    
    // Convert both dates to UTC
    const utcExpiry = new Date(expiry.getTime() + expiry.getTimezoneOffset() * 60000)
    const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
    
    return Math.max(0, Math.floor((utcExpiry.getTime() - utcNow.getTime()) / 1000))
  }, [])

  // Calculate option price using Black-Scholes model
  const calculateOptionPrice = useCallback((leg: OptionLeg, currentAssetPrice: number): number => {
    const timeUntilExpiry = calculateTimeUntilExpiry(leg.expiry)
    
    const optionResult = calculateOption({
      isCall: leg.type === 'Call',
      strikePrice: leg.strike,
      spotPrice: currentAssetPrice,
      timeUntilExpirySeconds: timeUntilExpiry,
      volatility: SOL_PH_VOLATILITY,
      riskFreeRate: SOL_PH_RISK_FREE_RATE
    })
    
    return optionResult.price
  }, [calculateTimeUntilExpiry])

  // Calculate total value based on position direction
  const calculateTotalValue = (legs: OptionLeg[]) => {
    return legs.reduce((total, leg) => {
      const contractValue = leg.marketPrice * 100 // Base contract value
      const positionValue = contractValue * Math.abs(leg.position) // Value * quantity
      return total + (leg.position > 0 ? positionValue : -positionValue) // Add for long, subtract for short
    }, 0)
  }

  // Calculate P/L based on the change in value from when the position was opened
  const calculatePnL = (leg: OptionLeg) => {
    // For long positions: (current price - entry price) * quantity * 100
    // For short positions: (entry price - current price) * quantity * 100
    const contractSize = 100 // Each option contract represents 100 units
    const quantity = Math.abs(leg.position)
    
    if (leg.position > 0) {
      // Long position
      return (leg.marketPrice - leg.entryPrice) * quantity * contractSize
    } else {
      // Short position
      return (leg.entryPrice - leg.marketPrice) * quantity * contractSize
    }
  }

  // Load positions from localStorage on component mount
  useEffect(() => {
    try {
      const storedOrders = localStorage.getItem('openOrders')
      if (storedOrders) {
        const parsedOrders: AssetPosition[] = JSON.parse(storedOrders)
        
        // Calculate aggregate values for each position and add unique IDs
        const updatedPositions = parsedOrders.map((position, index) => {
          // Get current asset price
          const currentAssetPrice = getAssetPrice(position.asset)
          
          // Calculate option prices and Greeks using the Black-Scholes model
          const legsWithUpdatedPrices = position.legs.map(leg => {
            // Calculate option price using Black-Scholes
            const newPrice = calculateOptionPrice(leg, currentAssetPrice)
            
            // Calculate option Greeks
            const timeUntilExpiry = calculateTimeUntilExpiry(leg.expiry)
            const optionResult = calculateOption({
              isCall: leg.type === 'Call',
              strikePrice: leg.strike,
              spotPrice: currentAssetPrice,
              timeUntilExpirySeconds: timeUntilExpiry, 
              volatility: SOL_PH_VOLATILITY,
              riskFreeRate: SOL_PH_RISK_FREE_RATE
            })
            
            // Ensure entryPrice and underlyingEntryPrice are set (for backward compatibility)
            const entryPrice = leg.entryPrice || newPrice
            const underlyingEntryPrice = leg.underlyingEntryPrice || currentAssetPrice
            
            return {
              ...leg,
              marketPrice: newPrice,
              entryPrice,
              underlyingEntryPrice,
              delta: optionResult.greeks.delta,
              gamma: optionResult.greeks.gamma,
              theta: optionResult.greeks.theta,
              vega: optionResult.greeks.vega,
              rho: optionResult.greeks.rho
            }
          })
          
          // Calculate P/L for each leg
          const legsWithPnL = legsWithUpdatedPrices.map(leg => ({
            ...leg,
            pnl: calculatePnL(leg)
          }))
          
          // Calculate aggregate values
          const netDelta = legsWithPnL.reduce((sum, leg) => sum + leg.delta, 0)
          const netTheta = legsWithPnL.reduce((sum, leg) => sum + leg.theta, 0)
          const netGamma = legsWithPnL.reduce((sum, leg) => sum + leg.gamma, 0)
          const netVega = legsWithPnL.reduce((sum, leg) => sum + leg.vega, 0)
          const netRho = legsWithPnL.reduce((sum, leg) => sum + leg.rho, 0)
          const totalValue = calculateTotalValue(legsWithPnL)
          const totalPnl = legsWithPnL.reduce((sum, leg) => sum + leg.pnl, 0)
          
          return {
            ...position,
            marketPrice: currentAssetPrice,
            legs: legsWithPnL,
            netDelta,
            netTheta,
            netGamma,
            netVega,
            netRho,
            totalValue,
            totalPnl,
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
  }, [solPrice, getAssetPrice, calculateOptionPrice, calculateTimeUntilExpiry])

  // Update option prices and Greeks periodically based on current asset prices
  useEffect(() => {
    // No need for the random update since we're now using the real price model
    // based on the useAssetPriceInfo hook, which will trigger updates automatically
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
                            <div className="grid grid-cols-3 gap-x-3 text-sm">
                              <div className="text-sm">
                                <div className="text-muted-foreground">Entry Price</div>
                                <div className="font-medium">${(leg.underlyingEntryPrice || position.marketPrice).toFixed(2)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-muted-foreground">Price</div>
                                <div className="font-medium">${leg.marketPrice.toFixed(2)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-muted-foreground">Qty</div>
                                <div className="font-medium">{Math.abs(leg.position)}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="grid grid-cols-2 gap-x-6 text-sm">
                              <div className="text-right">
                                <div className="text-muted-foreground">Value</div>
                                <div className="font-medium">${(leg.marketPrice * 100).toFixed(2)}</div>
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