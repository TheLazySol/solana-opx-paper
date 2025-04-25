'use client'

import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '../ui/button'
import React from 'react'
import Image from 'next/image'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { calculateOption } from '@/lib/option-pricing-model/black-scholes-model'
import { SOL_PH_VOLATILITY, SOL_PH_RISK_FREE_RATE } from '@/constants/constants'
import { updateOptionVolume, decreaseOptionOpenInterest } from './option-data'

// Helper for formatting quantity with 2 decimal places, hiding .00 when whole numbers
const formatQuantity = (quantity: number): string => {
  // If it's a whole number, display without decimal places
  if (quantity === Math.floor(quantity)) {
    return quantity.toString();
  }
  // Otherwise, display with 2 decimal places
  return quantity.toFixed(2);
}

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
  status?: 'pending' | 'filled'
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
    // If the order is still pending, return 0 - no P/L yet
    if (leg.status === 'pending') {
      return 0;
    }

    // For long positions: (current price - entry price) * quantity * 100
    // For short positions: (entry price - current price) * quantity * 100
    const contractSize = 100 // Each option contract represents 100 units
    const quantity = Math.abs(leg.position) // Works with fractional quantities
    
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
          
          // Calculate option prices and Greeks using the Black‑Scholes model
          const legsWithUpdatedPrices = position.legs.map(leg => {
            // Calculate option price using Black‑Scholes
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
            
            // IMPORTANT: Only set entry price if it doesn't exist yet
            // This ensures it's truly static and never changes after first set
            // For backward compatibility with existing data
            const entryPrice = leg.entryPrice !== undefined ? leg.entryPrice : newPrice
            const underlyingEntryPrice = leg.underlyingEntryPrice !== undefined ? leg.underlyingEntryPrice : currentAssetPrice
            
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
            // Add unique ID using asset and index
            id: position.id ?? `${position.asset}-${index}-${parsedOrders.indexOf(position)}`
          }
        })
        
        setPositions(updatedPositions)
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
  // Function to remove a pending option from mintedOptions
  const removePendingOption = (leg: OptionLeg) => {
    try {
      console.log('Removing pending option from mintedOptions:', {
        strike: leg.strike,
        expiry: leg.expiry,
        type: leg.type
      });
      
      // Only remove if the option is pending
      if (leg.status !== 'pending') return;
      
      // Get minted options from localStorage
      const mintedOptionsStr = localStorage.getItem('mintedOptions');
      if (!mintedOptionsStr) return;
      
      const mintedOptions = JSON.parse(mintedOptionsStr);
      
      // Find the corresponding mintedOption by matching strike, expiry, and option type
      const side = leg.type === 'Call' ? 'call' : 'put';
      
      // Remove the matching option(s)
      const updatedMintedOptions = mintedOptions.filter((opt: any) => 
        !(opt.strike === leg.strike && 
          opt.expiry === leg.expiry && 
          opt.side === side && 
          opt.status === 'pending')
      );
      
      // Save back to localStorage
      localStorage.setItem('mintedOptions', JSON.stringify(updatedMintedOptions));
      
      console.log(`Removed ${mintedOptions.length - updatedMintedOptions.length} pending options from mintedOptions`);
      
      // Dispatch a custom event to notify other components in the same window
      window.dispatchEvent(new CustomEvent('mintedOptionsUpdated'));
    } catch (error) {
      console.error('Error removing pending option from mintedOptions:', error);
    }
  };

  const handleCloseAll = (id: string) => {
    // Find the position for this ID before removing it
    const position = positions.find(pos => pos.id === id)
    if (!position) return
    
    // For each leg that is pending, remove it from mintedOptions
    position.legs.forEach(leg => {
      if (leg.status === 'pending' && leg.position < 0) {
        removePendingOption(leg);
      }
    });
    
    // Create history entry for the closed position
    const closedPosition = {
      id: position.id,
      asset: position.asset,
      closedAt: new Date().toISOString(),
      legs: position.legs.map(leg => ({
        type: leg.type,
        strike: leg.strike,
        expiry: leg.expiry,
        position: leg.position,
        entryPrice: leg.entryPrice,
        exitPrice: leg.marketPrice,
        pnl: leg.pnl
      })),
      totalPnl: position.totalPnl
    }
    
    // Update volume and decrease open interest for each leg that's being closed
    position.legs.forEach(leg => {
      // Convert position format to option format for volume tracking
      const side = leg.type === 'Call' ? 'call' : 'put'
      const quantity = Math.abs(leg.position)
      
      // Update volume - closing a position is a trade
      updateOptionVolume({
        index: 0, // not used by volume tracker
        asset: position.asset,
        strike: leg.strike,
        expiry: leg.expiry,
        price: leg.marketPrice,
        side,
        type: leg.position > 0 ? 'ask' : 'bid', // opposite of original position
        quantity
      })
      
      // Decrease open interest
      decreaseOptionOpenInterest(
        leg.strike,
        leg.expiry,
        side,
        quantity
      )
    })
    
    // Save to closed orders history
    try {
      const existingHistory = localStorage.getItem('closedOrders')
      const historyArray = existingHistory ? JSON.parse(existingHistory) : []
      historyArray.push(closedPosition)
      localStorage.setItem('closedOrders', JSON.stringify(historyArray))
    } catch (error) {
      console.error('Error saving to order history:', error)
    }
    
    // Remove all positions for this asset
    const updatedPositions = positions.filter(pos => pos.id !== id)
    setPositions(updatedPositions)
    
    // Update localStorage for open orders
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
    
    // Get the leg being closed before removing it
    const closedLeg = position.legs[legIndex]
    
    // If this is a pending option, remove it from mintedOptions
    if (closedLeg.status === 'pending' && closedLeg.position < 0) {
      removePendingOption(closedLeg);
    }
    
    // Update volume for this leg being closed
    const side = closedLeg.type === 'Call' ? 'call' : 'put'
    const quantity = Math.abs(closedLeg.position)
    
    // Update volume - closing a position is a trade
    updateOptionVolume({
      index: 0, // not used by volume tracker
      asset: position.asset,
      strike: closedLeg.strike,
      expiry: closedLeg.expiry,
      price: closedLeg.marketPrice,
      side,
      type: closedLeg.position > 0 ? 'ask' : 'bid', // opposite of original position
      quantity
    })
    
    // Decrease open interest
    decreaseOptionOpenInterest(
      closedLeg.strike,
      closedLeg.expiry,
      side,
      quantity
    )
    
    // Create history entry for the closed leg
    const closedLegEntry = {
      type: closedLeg.type,
      strike: closedLeg.strike,
      expiry: closedLeg.expiry,
      position: closedLeg.position,
      entryPrice: closedLeg.entryPrice,
      exitPrice: closedLeg.marketPrice,
      pnl: closedLeg.pnl
    }
    
    // Save to closed orders history - either as a new position or adding to existing position
    try {
      const existingHistory = localStorage.getItem('closedOrders')
      const historyArray = existingHistory ? JSON.parse(existingHistory) : []
      
      // Check if we're closing the last leg - if so, save the entire position
      if (position.legs.length === 1) {
        // Save the entire position to history
        const closedPosition = {
          id: position.id,
          asset: position.asset,
          closedAt: new Date().toISOString(),
          legs: [closedLegEntry],
          totalPnl: closedLeg.pnl // Only one leg, so total PNL is just this leg's PNL
        }
        historyArray.push(closedPosition)
      } else {
        // Save just this leg to history as a single-leg position
        const closedSingleLegPosition = {
          id: `${position.id}-leg-${legIndex}-${Date.now()}`,
          asset: position.asset,
          closedAt: new Date().toISOString(),
          legs: [closedLegEntry],
          totalPnl: closedLeg.pnl
        }
        historyArray.push(closedSingleLegPosition)
      }
      
      localStorage.setItem('closedOrders', JSON.stringify(historyArray))
    } catch (error) {
      console.error('Error saving to order history:', error)
    }
    
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
                  className="bg-white/5 dark:bg-black/20 p-2 sm:p-3 cursor-pointer hover:bg-white/10 dark:hover:bg-black/30
                    transition-colors duration-200"
                  onClick={() => toggleAsset(position.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                        Current Price: <span className="text-foreground">${position.marketPrice.toFixed(2)}</span>
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Options: <span className="text-foreground">{position.legs.length}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-6">
                      <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 text-xs sm:text-sm">
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
                  <div className="p-2 sm:p-3 space-y-3">
                    {/* Greeks Summary - Responsive grid that stacks on mobile */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 p-2 rounded-lg bg-white/5 dark:bg-black/20">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Delta</div>
                        <div className="font-medium text-sm">{position.netDelta.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Theta</div>
                        <div className="font-medium text-sm">{position.netTheta.toFixed(3)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Gamma</div>
                        <div className="font-medium text-sm">{position.netGamma.toFixed(3)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Vega</div>
                        <div className="font-medium text-sm">{position.netVega.toFixed(3)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Rho</div>
                        <div className="font-medium text-sm">{position.netRho.toFixed(3)}</div>
                      </div>
                    </div>

                    {/* Individual Legs */}
                    <div className="space-y-2">
                      {position.legs.map((leg, idx) => (
                        <div 
                          key={`${position.id}-leg-${idx}`}
                          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-2 rounded-lg bg-white/5 dark:bg-black/20
                            border border-[#e5e5e5]/10 dark:border-[#393939]/50"
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
                            {leg.status === 'pending' && (
                              <Badge variant="warning" className="animate-pulse">
                                PENDING
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-2 sm:gap-6">
                            <div className="grid grid-cols-3 gap-x-3 text-xs sm:text-sm w-full sm:w-auto">
                              <div className="text-right">
                                <div className="text-muted-foreground">Entry Price</div>
                                <div className="font-medium">
                                  {leg.status === 'pending' ? '-' : `$${leg.entryPrice.toFixed(2)}`}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-muted-foreground">Option Price</div>
                                <div className="font-medium">
                                  {leg.status === 'pending' ? '-' : `$${leg.marketPrice.toFixed(2)}`}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-muted-foreground">Qty</div>
                                <div className="font-medium">{formatQuantity(Math.abs(leg.position))}</div>
                              </div>
                            </div>
                          
                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-6 w-full sm:w-auto">
                              <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 text-xs sm:text-sm">
                                <div className="text-right">
                                  <div className="text-muted-foreground">Value</div>
                                  <div className="font-medium">
                                    {leg.status === 'pending' 
                                      ? '-' 
                                      : `$${(leg.marketPrice * 100 * Math.abs(leg.position) * (leg.position > 0 ? 1 : -1)).toFixed(2)}`}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-muted-foreground">P/L</div>
                                  <div className={leg.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                    {leg.status === 'pending' 
                                      ? '-' 
                                      : `${leg.pnl >= 0 ? '+$' : '-$'}${Math.abs(leg.pnl).toFixed(2)}`}
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