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
  entryPrice: number  // Will now represent the average entry price
  avgEntryPrice?: number  // Optional for backward compatibility
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
  // Fields to track filled and remaining quantities
  filledQuantity?: number
  pendingQuantity?: number
  // Track fill history for average price calculations
  fillHistory?: Array<{
    price: number,
    quantity: number,
    timestamp: string
  }>
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

// Function to update when a position is partially filled
export const updatePositionFill = (positionId: string, legIndex: number, filledAmount: number) => {
  try {
    // Get open orders from localStorage
    const storedOrders = localStorage.getItem('openOrders')
    if (!storedOrders) return
    
    const orders = JSON.parse(storedOrders)
    
    // Find the position with the matching ID
    const position = orders.find((p: any) => p.id === positionId)
    if (!position || !position.legs || !position.legs[legIndex]) return
    
    const leg = position.legs[legIndex]
    
    // Calculate new filled and pending quantities
    const totalPosition = Math.abs(leg.position)
    const currentFilled = leg.filledQuantity || 0
    const currentPending = leg.pendingQuantity || totalPosition
    
    // Make sure we don't fill more than what's pending
    const actualFillAmount = Math.min(filledAmount, currentPending)
    
    if (actualFillAmount <= 0) return
    
    // Update the quantities
    leg.filledQuantity = currentFilled + actualFillAmount
    leg.pendingQuantity = Math.max(0, currentPending - actualFillAmount)
    
    // If all are filled, update status
    if (leg.pendingQuantity === 0) {
      leg.status = 'filled'
    } else if (leg.filledQuantity > 0) {
      // Partial fill - keep pending status but we'll display differently
      leg.status = 'pending'
    }
    
    // Save back to localStorage
    localStorage.setItem('openOrders', JSON.stringify(orders))
    
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('openOrdersUpdated'))
  } catch (error) {
    console.error('Error updating position fill:', error)
  }
}

export const OrdersViewOpen = () => {
  const [expandedAssets, setExpandedAssets] = useState<string[]>([])
  const [positions, setPositions] = useState<AssetPosition[]>([])
  const [forceUpdate, setForceUpdate] = useState(0)
  
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

  // Calculate total value based on position direction and filled quantities
  const calculateTotalValue = (legs: OptionLeg[]) => {
    return legs.reduce((total, leg) => {
      // Only calculate value for filled portions
      const filledQuantity = leg.filledQuantity ?? 0;
      if (filledQuantity <= 0) return total;
      
      const contractValue = leg.marketPrice * 100 // Base contract value
      const positionValue = contractValue * filledQuantity // Value * filled quantity
      return total + (leg.position > 0 ? positionValue : -positionValue) // Add for long, subtract for short
    }, 0)
  }

  // Calculate P/L based on the change in value from when the position was opened
  const calculatePnL = (leg: OptionLeg) => {
    // Only calculate P/L for filled portions of a position
    const filledQuantity = leg.filledQuantity ?? 0;
    if (filledQuantity <= 0) {
      return 0;
    }

    // For filled or partially filled orders, calculate P/L based on the difference between current market price and entry price
    const contractSize = 100; // Each option contract represents 100 units
    
    if (leg.position > 0) {
      // Long position: (current price - entry price) * filledQuantity * 100
      return (leg.marketPrice - leg.entryPrice) * filledQuantity * contractSize;
    } else {
      // Short position: (entry price - current price) * filledQuantity * 100
      return (leg.entryPrice - leg.marketPrice) * filledQuantity * contractSize;
    }
  };

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
            
            // Make sure we have filledQuantity and pendingQuantity
            let filledQuantity = leg.filledQuantity;
            let pendingQuantity = leg.pendingQuantity;
            
            // If these fields don't exist yet, calculate them based on status
            if (filledQuantity === undefined || pendingQuantity === undefined) {
              if (leg.status === 'pending') {
                filledQuantity = 0;
                pendingQuantity = Math.abs(leg.position);
              } else {
                filledQuantity = Math.abs(leg.position);
                pendingQuantity = 0;
              }
            }
            
            return {
              ...leg,
              marketPrice: newPrice,
              entryPrice,
              underlyingEntryPrice,
              delta: optionResult.greeks.delta,
              gamma: optionResult.greeks.gamma,
              theta: optionResult.greeks.theta,
              vega: optionResult.greeks.vega,
              rho: optionResult.greeks.rho,
              filledQuantity,
              pendingQuantity
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
  }, [solPrice, getAssetPrice, calculateOptionPrice, calculateTimeUntilExpiry, forceUpdate])

  // Update option prices and Greeks periodically based on current asset prices
  useEffect(() => {
    // No need for the random update since we're now using the real price model
    // based on the useAssetPriceInfo hook, which will trigger updates automatically
  }, [])

  // Add an effect to listen for localStorage changes that might indicate options being filled
  useEffect(() => {
    // Function to handle storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'openOrders') {
        // Reload positions from localStorage
        try {
          const storedOrders = localStorage.getItem('openOrders');
          if (storedOrders) {
            // Don't need to parse and process here - the main useEffect will handle it
            // Just force a re-render by incrementing a counter
            setForceUpdate(prev => prev + 1);
          }
        } catch (error) {
          console.error('Error handling storage change:', error);
        }
      }
    };
    
    // Add event listener
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for local updates (within the same window)
    const handleLocalUpdate = () => {
      setForceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('openOrdersUpdated', handleLocalUpdate);
    
    // Clean up
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('openOrdersUpdated', handleLocalUpdate);
    };
  }, []);

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
      if (leg.status === 'pending' && (leg.pendingQuantity ?? 0) > 0 && leg.position < 0) {
        removePendingOption(leg);
      }
      
      // If this is a buyer position, update seller positions
      if (leg.position > 0) {
        updateSellerPositionOnBuyerClose(leg);
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
        pnl: leg.pnl,
        filledQuantity: leg.filledQuantity ?? 0
      })),
      totalPnl: position.totalPnl
    }
    
    // Update volume and decrease open interest for each leg that's being closed
    position.legs.forEach(leg => {
      // Only process if there are filled options to close
      if ((leg.filledQuantity ?? 0) > 0) {
        // Convert position format to option format for volume tracking
        const side = leg.type === 'Call' ? 'call' : 'put'
        const quantity = leg.filledQuantity ?? 0
        
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
      }
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
    
    // If this is a pending option with pending quantity, remove it from mintedOptions
    if (closedLeg.status === 'pending' && (closedLeg.pendingQuantity ?? 0) > 0 && closedLeg.position < 0) {
      removePendingOption(closedLeg);
    }
    
    // If this is a buyer closing a position, update seller positions
    if (closedLeg.position > 0) {
      // Call the function to update seller positions
      updateSellerPositionOnBuyerClose(closedLeg);
    }
    
    // Only process if there are filled options to close
    if ((closedLeg.filledQuantity ?? 0) > 0) {
      // Update volume for this leg being closed
      const side = closedLeg.type === 'Call' ? 'call' : 'put'
      const quantity = closedLeg.filledQuantity ?? 0
      
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
    }
    
    // Create history entry for the closed leg
    const closedLegEntry = {
      type: closedLeg.type,
      strike: closedLeg.strike,
      expiry: closedLeg.expiry,
      position: closedLeg.position,
      entryPrice: closedLeg.entryPrice,
      exitPrice: closedLeg.marketPrice,
      pnl: closedLeg.pnl,
      filledQuantity: closedLeg.filledQuantity ?? 0
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

  // Function to find and update the seller's position when a buyer closes a position
  const updateSellerPositionOnBuyerClose = (closedLeg: OptionLeg) => {
    try {
      // Only process if this is a buyer closing their position 
      // (position > 0 means a long/buy position)
      if (closedLeg.position <= 0 || (closedLeg.filledQuantity ?? 0) <= 0) {
        return;
      }

      console.log('Looking for seller positions to update for:', {
        strike: closedLeg.strike,
        expiry: closedLeg.expiry,
        type: closedLeg.type
      });
      
      // Get all open orders
      const openOrdersStr = localStorage.getItem('openOrders');
      if (!openOrdersStr) return;
      
      const openOrders = JSON.parse(openOrdersStr);
      let positionsUpdated = false;
      
      // Loop through all positions to find sellers of this option
      for (const position of openOrders) {
        for (let i = 0; i < position.legs.length; i++) {
          const leg = position.legs[i];
          
          // Check if this is a matching seller position (opposite side of the closed position)
          if (
            leg.strike === closedLeg.strike && 
            leg.expiry === closedLeg.expiry && 
            leg.type === closedLeg.type && 
            leg.position < 0 && // Must be a short position (selling)
            (leg.status === 'filled' || (leg.filledQuantity ?? 0) > 0)
          ) {
            // Found a matching seller position that was filled
            console.log('Found matching seller position:', {
              legIndex: i,
              position: position.id,
              status: leg.status,
              filledQty: leg.filledQuantity,
              pendingQty: leg.pendingQuantity
            });
            
            // Get current quantities
            const filledQty = leg.filledQuantity ?? Math.abs(leg.position);
            const pendingQty = leg.pendingQuantity ?? 0;
            const closedQty = closedLeg.filledQuantity ?? Math.abs(closedLeg.position);
            
            // Calculate how much of this seller's position can be returned to pending
            const qtyToReturnToPending = Math.min(filledQty, closedQty);
            
            if (qtyToReturnToPending > 0) {
              // Update seller's position quantities
              position.legs[i].filledQuantity = Math.max(0, filledQty - qtyToReturnToPending);
              position.legs[i].pendingQuantity = pendingQty + qtyToReturnToPending;
              
              // If all quantity is now pending, update status to pending
              if (position.legs[i].filledQuantity === 0) {
                position.legs[i].status = 'pending';
              }
              
              // Reset P/L calculation for the portion returned to pending
              // We'll leave the entry price unchanged as it's needed for historical reference
              
              console.log(`Updated seller position: ${qtyToReturnToPending} returned to pending status`);
              positionsUpdated = true;
            }
          }
        }
      }
      
      // If any positions were updated, save back to localStorage
      if (positionsUpdated) {
        localStorage.setItem('openOrders', JSON.stringify(openOrders));
        
        // Also need to update the mintedOptions to reflect the changes
        const mintedOptionsStr = localStorage.getItem('mintedOptions');
        if (mintedOptionsStr) {
          const mintedOptions = JSON.parse(mintedOptionsStr);
          
          // Find the mintedOptions matching the criteria
          const side = closedLeg.type === 'Call' ? 'call' : 'put';
          
          // Add new pending options with the quantity that was closed
          mintedOptions.push({
            strike: closedLeg.strike,
            expiry: closedLeg.expiry,
            side: side.toLowerCase(),
            status: 'pending',
            quantity: closedLeg.filledQuantity ?? Math.abs(closedLeg.position),
            timestamp: new Date().toISOString()
          });
          
          // Save updated mintedOptions
          localStorage.setItem('mintedOptions', JSON.stringify(mintedOptions));
          
          // NOTE: We are intentionally NOT increasing options availability (OA)
          // as this should only reflect newly created options, not returned positions
        }
        
        // Dispatch events to notify all components
        window.dispatchEvent(new CustomEvent('openOrdersUpdated'));
        window.dispatchEvent(new CustomEvent('mintedOptionsUpdated'));
      }
    } catch (error) {
      console.error('Error updating seller positions:', error);
    }
  };

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
                    </div>

                    <div className="grid grid-cols-4 w-full sm:w-auto gap-x-4 sm:gap-x-12 text-xs sm:text-sm mt-2 sm:mt-0">
                      <div className="text-center">
                        <div className="text-muted-foreground">Current Price</div>
                        <div className="text-foreground">${position.marketPrice.toFixed(2)}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-muted-foreground">(Filled / Open)</div>
                        <div className="text-foreground">
                          {(() => {
                            const filled = position.legs.reduce((count, leg) => 
                              count + (leg.filledQuantity ?? 0), 0);
                            const pending = position.legs.reduce((count, leg) => 
                              count + (leg.pendingQuantity ?? 0), 0);
                            return `${formatQuantity(filled)} / ${formatQuantity(pending)}`;
                          })()}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-muted-foreground">Total Value</div>
                        <div className="font-medium">
                          {(() => {
                            const filledCount = position.legs.reduce((count, leg) => 
                              count + (leg.filledQuantity ?? 0), 0);
                            return filledCount > 0 ? `$${position.totalValue.toFixed(2)}` : '-';
                          })()}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-muted-foreground">Total P/L</div>
                        <div className={position.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {(() => {
                            const filledCount = position.legs.reduce((count, leg) => 
                              count + (leg.filledQuantity ?? 0), 0);
                            return filledCount > 0 
                              ? <>{position.totalPnl >= 0 ? '+$' : '-$'}{Math.abs(position.totalPnl).toFixed(2)}</>
                              : '-';
                          })()}
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
                      className="text-red-500/50 hover:text-red-500 transition-all duration-200 hover:scale-110 mt-2 sm:mt-0"
                    >
                      Close All
                    </Button>
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
                              Qty: {`${formatQuantity(leg.filledQuantity ?? 0)} / ${formatQuantity(leg.pendingQuantity ?? 0)}`}
                            </Badge>
                            {leg.status === 'pending' && (leg.pendingQuantity ?? 0) > 0 && (
                              <Badge variant="warning" className="animate-pulse">
                                PENDING
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-2 sm:gap-6">
                            <div className="grid grid-cols-3 gap-x-3 text-xs sm:text-sm w-full sm:w-auto">
                              <div className="text-right">
                                <div className="text-muted-foreground">Avg Price</div>
                                <div className="font-medium">
                                  {(leg.filledQuantity ?? 0) === 0 ? '-' : `$${leg.entryPrice.toFixed(2)}`}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-muted-foreground">Option Price</div>
                                <div className="font-medium">
                                  {(leg.filledQuantity ?? 0) === 0 ? '-' : `$${leg.marketPrice.toFixed(2)}`}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-muted-foreground">Qty</div>
                                <div className="font-medium">
                                  {`${formatQuantity(leg.filledQuantity ?? 0)} / ${formatQuantity(leg.pendingQuantity ?? 0)}`}
                                </div>
                              </div>
                            </div>
                          
                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-6 w-full sm:w-auto">
                              <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 text-xs sm:text-sm">
                                <div className="text-right">
                                  <div className="text-muted-foreground">Value</div>
                                  <div className="font-medium">
                                    {(leg.filledQuantity ?? 0) === 0
                                      ? '-' 
                                      : `$${(leg.marketPrice * 100 * (leg.filledQuantity ?? 0) * (leg.position > 0 ? 1 : -1)).toFixed(2)}`}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-muted-foreground">P/L</div>
                                  <div className={leg.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                    {(leg.filledQuantity ?? 0) === 0
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