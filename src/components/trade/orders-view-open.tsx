'use client'

import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import React from 'react'
import { useAssetPriceInfo } from '@/context/asset-price-provider'

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
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800">
          <tr>
            <th className="text-left py-2 px-3 font-medium text-gray-500">Asset</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Market Price</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Positions</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Delta</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Theta</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Gamma</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Vega</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Rho</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Collateral</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Value</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">P/L</th>
            <th className="w-24"></th>
          </tr>
        </thead>
        <tbody>
          {positions.length === 0 ? (
            <tr>
              <td colSpan={12} className="py-8 text-center text-gray-500">
                No open positions
              </td>
            </tr>
          ) : (
            positions.map((position) => (
              <React.Fragment key={position.id}>
                <tr 
                  className="border-b border-gray-800 hover:bg-gray-900/50 group"
                >
                  <td 
                    className="py-2 px-3 flex items-center gap-2 cursor-pointer" 
                    onClick={() => toggleAsset(position.id)}
                  >
                    <div className={`
                      w-4 h-4 flex items-center justify-center 
                      rounded-full border border-gray-700
                      transition-all duration-200
                      ${expandedAssets.includes(position.id) 
                        ? 'bg-blue-500/10 border-blue-500/50' 
                        : 'hover:border-gray-600'
                      }
                    `}>
                      <ChevronRight 
                        size={12} 
                        className={`
                          text-gray-400
                          transition-transform duration-200
                          ${expandedAssets.includes(position.id) ? 'rotate-90' : ''}
                        `}
                      />
                    </div>
                    {position.asset}
                  </td>
                  <td className="text-right py-2 px-3">${position.marketPrice.toFixed(2)}</td>
                  <td className="text-right py-2 px-3">{position.legs.length}</td>
                  <td className="text-right py-2 px-3">{position.netDelta.toFixed(2)}</td>
                  <td className="text-right py-2 px-3">{position.netTheta.toFixed(3)}</td>
                  <td className="text-right py-2 px-3">{position.netGamma.toFixed(3)}</td>
                  <td className="text-right py-2 px-3">{position.netVega.toFixed(3)}</td>
                  <td className="text-right py-2 px-3">{position.netRho.toFixed(3)}</td>
                  <td className="text-right py-2 px-3">${position.totalCollateral.toFixed(2)}</td>
                  <td className="text-right py-2 px-3">${position.totalValue.toFixed(2)}</td>
                  <td className="text-right py-2 px-3">
                    <span className={position.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {position.totalPnl >= 0 ? '+$' : '-$'}
                      {Math.abs(position.totalPnl).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
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
                  </td>
                </tr>
                {expandedAssets.includes(position.id) && position.legs.map((leg, idx) => (
                  <tr 
                    key={`${position.id}-leg-${idx}`} 
                    className="border-b border-gray-800/50"
                  >
                    <td className="py-2 px-3 pl-10">
                      {leg.type} ${leg.strike} {leg.expiry.split('T')[0]}
                    </td>
                    <td className="text-right py-2 px-3">
                      ${leg.marketPrice.toFixed(2)}
                    </td>
                    <td className="text-right py-2 px-3">{leg.position}</td>
                    <td className="text-right py-2 px-3">{leg.delta.toFixed(2)}</td>
                    <td className="text-right py-2 px-3">{leg.theta.toFixed(3)}</td>
                    <td className="text-right py-2 px-3">{leg.gamma.toFixed(3)}</td>
                    <td className="text-right py-2 px-3">{leg.vega.toFixed(3)}</td>
                    <td className="text-right py-2 px-3">{leg.rho.toFixed(3)}</td>
                    <td className="text-right py-2 px-3">${leg.collateral.toFixed(2)}</td>
                    <td className="text-right py-2 px-3">${leg.value.toFixed(2)}</td>
                    <td className="text-right py-2 px-3">
                      <span className={leg.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {leg.pnl >= 0 ? '+$' : '-$'}
                        {Math.abs(leg.pnl).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCloseLeg(position.id, idx)}
                        className="text-red-500/50 hover:text-red-500 transition-all duration-200 hover:scale-110"
                      >
                        Close
                      </Button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
} 