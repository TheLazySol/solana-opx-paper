import React, { useMemo, useState, useRef } from 'react'
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { cn } from "@/lib/misc/utils"

interface OptionPosition {
  quantity: number
  strikePrice: string | number
  premium: string | number
  optionType: string
  asset: string
}

interface MakerPnlChartProps {
  options: OptionPosition[]
  collateralProvided: number
  leverage: number
}

interface PnLDataPoint {
  name: string
  value: number
}

export function MakerPnlChart({ options, collateralProvided, leverage }: MakerPnlChartProps) {
  // Since we're removing all zoom functionality, we don't need this state anymore
  const chartRef = useRef<HTMLDivElement>(null)
  
  const calculatePnLPoints = useMemo(() => {
    if (options.length === 0) return []

    // Calculate total premium received (this is our max profit at expiration)
    // Multiply by 100 since each contract represents 100 units
    const totalPremium = options.reduce((acc, opt) => 
      acc + (Number(opt.premium) * Number(opt.quantity) * 100), 0)

    // For the price range, we'll use the weighted average of strike prices as center point
    const totalQuantity = options.reduce((acc, opt) => acc + Number(opt.quantity), 0)
    const avgStrike = options.reduce(
      (acc, opt) => acc + (Number(opt.strikePrice) * Number(opt.quantity)), 0
    ) / totalQuantity

    // Create a wider price range for better visualization
    const priceRange = avgStrike * 0.2 // 20% range for better visualization
    const minPrice = Math.max(avgStrike - priceRange, 0)
    const maxPrice = avgStrike + priceRange
    const steps = 100 // Increased resolution for smoother curve
    const priceStep = (maxPrice - minPrice) / steps

    // Create points array
    const points = Array.from({ length: steps + 1 }, (_, i) => {
      const price = minPrice + (i * priceStep)
      
      // At expiration, P&L for a maker (seller) is:
      // For call options: Premium - max(0, market price - strike)
      // For put options: Premium - max(0, strike - market price)
      let pnl = totalPremium

      options.forEach(option => {
        const quantity = Number(option.quantity)
        const strike = Number(option.strikePrice)
        const premium = Number(option.premium)
        const contractSize = 100 // Each contract represents 100 units

        // At expiration, calculate intrinsic value
        if (option.optionType.toLowerCase() === 'call') {
          // For call options at expiration
          const intrinsicValue = Math.max(0, price - strike)
          pnl -= quantity * intrinsicValue * contractSize
        } else {
          // For put options at expiration
          const intrinsicValue = Math.max(0, strike - price)
          pnl -= quantity * intrinsicValue * contractSize
        }
      })

      // Apply leverage effect on losses (but not on profits)
      if (pnl < 0) {
        pnl = pnl * leverage
      }

      // Apply a floor to PnL based on collateral
      if (pnl < -collateralProvided) {
        pnl = -collateralProvided
      }

      return {
        price,
        name: `$${price.toFixed(2)}`,
        value: Number(pnl.toFixed(2))
      }
    })

    return points
  }, [options, collateralProvided, leverage])

  // Calculate max profit - premium received
  const maxProfit = useMemo(() => {
    return options.reduce((acc, opt) => 
      acc + (Number(opt.premium) * Number(opt.quantity) * 100), 0)
  }, [options])

  // Calculate max loss - which is collateral required
  const maxLoss = useMemo(() => {
    let totalRisk = 0
    
    options.forEach(option => {
      const quantity = Number(option.quantity)
      const strike = Number(option.strikePrice)
      const contractSize = 100
      
      // For call options, theoretical max loss is infinite, but limited by collateral
      // For put options, max loss is strike price * quantity * contract size
      if (option.optionType.toLowerCase() === 'put') {
        totalRisk += strike * quantity * contractSize
      } else {
        // For calls, use a high multiple of strike as theoretical max
        totalRisk += strike * quantity * contractSize * 2 // Arbitrary multiplier
      }
    })
    
    // Apply leverage
    totalRisk = totalRisk * leverage
    
    // Limited by collateral
    return Math.min(totalRisk, collateralProvided)
  }, [options, collateralProvided, leverage])

  // Get market price from the first option (could be improved with a weighted average)
  const currentMarketPrice = useMemo(() => {
    if (options.length === 0) return 0
    
    const totalQuantity = options.reduce((acc, opt) => acc + Number(opt.quantity), 0)
    return options.reduce(
      (acc, opt) => acc + (Number(opt.strikePrice) * Number(opt.quantity)), 0
    ) / totalQuantity
  }, [options])

  const priceRange = currentMarketPrice * 0.20 // 20% range
  const minPrice = Math.max(currentMarketPrice - priceRange, 0)
  const maxPrice = currentMarketPrice + priceRange

  // Calculate chart domains for centering zero and adding headroom
  const chartDomains = useMemo(() => {
    const absMax = Math.max(Math.abs(maxLoss), maxProfit)
    // Add 10% headroom to both sides
    const yDomain = [-absMax * 1.1, absMax * 1.1]
    
    // For X domain, use the market price +/- range
    const defaultXDomain = [minPrice, maxPrice]
    
    return { xDomain: defaultXDomain, yDomain }
  }, [maxLoss, maxProfit, minPrice, maxPrice])

  // Add the LineChart props for the Recharts component
  const lineChartProps = {
    data: calculatePnLPoints,
    margin: {
      top: 20,
      right: 30,
      left: 10,
      bottom: 25,
    },
  };

  return (
    <div 
      className="h-full w-full" 
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => e.preventDefault()}
    >
      {options.length === 0 ? (
        <div className="flex items-center justify-center h-[400px] text-sm text-muted-foreground 
          border border-dashed border-[#e5e5e5]/50 dark:border-[#393939] rounded-lg">
          Add options to see PnL projection at expiration
        </div>
      ) : (
        // Form protection wrapper to prevent chart from triggering form submission
        <div 
          className="space-y-2" 
          onClick={(e) => {
            // Stop propagation to prevent reaching any parent form elements
            e.stopPropagation()
          }}
          onKeyDown={(e) => {
            // Prevent Enter key from submitting parent forms
            if (e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <div 
            className="h-[400px] w-full relative" 
            ref={chartRef}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                {...lineChartProps}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#393939" opacity={0.2} />
                <XAxis 
                  dataKey="price"
                  stroke="#666"
                  fontSize={11}
                  tickFormatter={(value: number) => value.toFixed(2)}
                  interval="preserveStartEnd"
                  minTickGap={40}
                  domain={chartDomains.xDomain}
                  type="number"
                  label={{ 
                    value: 'Underlying Price at Expiration', 
                    position: 'bottom',
                    offset: 10,
                    fontSize: 11,
                    fill: '#666'
                  }}
                />
                <YAxis
                  stroke="#666"
                  fontSize={11}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  domain={chartDomains.yDomain}
                  width={60}
                  label={{ 
                    value: 'Profit / Loss ($)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' },
                    fontSize: 11,
                    fill: '#666'
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                  }}
                  formatter={(value: number) => {
                    const color = value >= 0 ? '#22c55e' : '#ef4444'; // Green for positive, red for negative
                    return [<span key="pnl-value" style={{ color }}>{`$${value.toFixed(2)}`}</span>, 'PnL at Expiration'];
                  }}
                  labelFormatter={(label) => `Price: $${label}`}
                />
                <ReferenceLine 
                  y={maxProfit} 
                  stroke="#22c55e"
                  strokeDasharray="3 3"
                  label={{ 
                    value: `Max Profit: $${maxProfit.toFixed(2)}`,
                    fill: '#22c55e',
                    fontSize: 11,
                    position: 'top'
                  }}
                />
                <ReferenceLine 
                  y={-maxLoss} 
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ 
                    value: `Max Loss: -$${maxLoss.toFixed(2)}`,
                    fill: '#ef4444',
                    fontSize: 11,
                    position: 'top'
                  }}
                />
                <ReferenceLine 
                  y={0} 
                  stroke="#666"
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#4a85ff"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}