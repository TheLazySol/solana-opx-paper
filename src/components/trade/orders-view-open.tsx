'use client'

import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import React from 'react'

// Mock data structure
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
}

// Mock data
const mockPositions: AssetPosition[] = [
  {
    asset: 'SOL',
    marketPrice: 247.92,
    legs: [
      {
        type: 'Call',
        strike: 250,
        expiry: '2024-02-23',
        position: -2,
        marketPrice: 1.45,
        delta: -0.45,
        theta: 0.05,
        gamma: 0.02,
        vega: 0.15,
        rho: 0.01,
        collateral: 200,
        value: 180,
        pnl: 60,
      },
      {
        type: 'Put',
        strike: 240,
        expiry: '2024-02-23',
        position: 1,
        marketPrice: 0.56,
        delta: -0.30,
        theta: 0.03,
        gamma: 0.01,
        vega: 0.10,
        rho: -0.01,
        collateral: 90,
        value: 95,
        pnl: 5,
      },
    ],
    netDelta: -0.75,
    netTheta: 0.08,
    netGamma: 0.03,
    netVega: 0.25,
    netRho: 0.00,
    totalCollateral: 290,
    totalValue: 275,
    totalPnl: 65,
  },
]

export const OrdersViewOpen = () => {
  const [expandedAssets, setExpandedAssets] = useState<string[]>([])

  const toggleAsset = (asset: string) => {
    setExpandedAssets(prev => 
      prev.includes(asset) 
        ? prev.filter(a => a !== asset)
        : [...prev, asset]
    )
  }

  const handleCloseAll = (asset: string) => {
    console.log(`Closing all positions for ${asset}`)
    // Add logic to close all positions
  }

  const handleCloseLeg = (asset: string, legIndex: number) => {
    console.log(`Closing leg ${legIndex} for ${asset}`)
    // Add logic to close specific leg
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
          {mockPositions.map((position) => (
            <React.Fragment key={position.asset}>
              <tr 
                className="border-b border-gray-800 hover:bg-gray-900/50 group"
              >
                <td 
                  className="py-2 px-3 flex items-center gap-2 cursor-pointer" 
                  onClick={() => toggleAsset(position.asset)}
                >
                  <div className={`
                    w-4 h-4 flex items-center justify-center 
                    rounded-full border border-gray-700
                    transition-all duration-200
                    ${expandedAssets.includes(position.asset) 
                      ? 'bg-blue-500/10 border-blue-500/50' 
                      : 'hover:border-gray-600'
                    }
                  `}>
                    <ChevronRight 
                      size={12} 
                      className={`
                        text-gray-400
                        transition-transform duration-200
                        ${expandedAssets.includes(position.asset) ? 'rotate-90' : ''}
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
                      handleCloseAll(position.asset)
                    }}
                    className="text-red-500/50 hover:text-red-500 transition-all duration-200 hover:scale-110"
                  >
                    Close All
                  </Button>
                </td>
              </tr>
              {expandedAssets.includes(position.asset) && position.legs.map((leg, idx) => (
                <tr 
                  key={`${position.asset}-${idx}`} 
                  className="border-b border-gray-800/50"
                >
                  <td className="py-2 px-3 pl-10">
                    {leg.type} ${leg.strike} {leg.expiry}
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
                      onClick={() => handleCloseLeg(position.asset, idx)}
                      className="text-red-500/50 hover:text-red-500 transition-all duration-200 hover:scale-110"
                    >
                      Close
                    </Button>
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
} 