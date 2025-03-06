import React, { useMemo } from 'react'
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
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
  const calculatePnLPoints = useMemo(() => {
    if (options.length === 0) return []

    // Calculate total premium received (this is our max profit)
    // Multiply by 100 since each contract represents 100 units
    const totalPremium = options.reduce((acc, opt) => 
      acc + (Number(opt.premium) * Number(opt.quantity) * 100), 0)

    // For the price range, we'll use the strike price as center point
    const strike = Number(options[0].strikePrice)
    // Adjust price range to be more focused around the strike
    const priceRange = strike * 0.4 // 40% range for better visualization
    const minPrice = Math.max(strike - priceRange, 0)
    const maxPrice = strike + priceRange
    const steps = 50
    const priceStep = (maxPrice - minPrice) / steps

    // Calculate position size with leverage
    const positionSize = collateralProvided * leverage

    return Array.from({ length: steps + 1 }, (_, i) => {
      const price = minPrice + (i * priceStep)
      let pnl = totalPremium

      options.forEach(option => {
        const quantity = Number(option.quantity)
        const strike = Number(option.strikePrice)
        const contractSize = 100 // Each contract represents 100 units

        if (option.optionType.toLowerCase() === 'call') {
          if (price > strike) {
            // For calls, loss increases as price goes above strike
            const loss = quantity * (price - strike) * contractSize
            // Apply leverage to the loss calculation
            pnl = totalPremium - (loss * (positionSize / collateralProvided))
          }
        } else {
          if (price < strike) {
            // For puts, loss increases as price goes below strike
            const loss = quantity * (strike - price) * contractSize
            // Apply leverage to the loss calculation
            pnl = totalPremium - (loss * (positionSize / collateralProvided))
          }
        }

        // Limit losses to collateral provided
        if (pnl < -collateralProvided) {
          pnl = -collateralProvided
        }
      })

      return {
        name: `$${price.toFixed(2)}`,
        value: Number(pnl.toFixed(2))
      }
    })
  }, [options, collateralProvided, leverage])

  const maxProfit = useMemo(() => {
    return options.reduce((acc, opt) => 
      acc + (Number(opt.premium) * Number(opt.quantity) * 100), 0)
  }, [options])

  // Calculate min PnL for better Y-axis scaling
  const minPnL = useMemo(() => {
    // Min PnL is now limited to the negative of collateral provided
    return -collateralProvided;
  }, [collateralProvided])

  // Generate Y-axis ticks for better readability with more headroom
  const yAxisTicks = useMemo(() => {
    if (maxProfit <= 0) return []
    
    // Add 20% padding to the max value for headroom
    const maxPadded = maxProfit * 1.2
    // Use collateral provided as the minimum value
    const minValue = -collateralProvided
    const maxValue = Math.ceil(maxPadded)
    
    // Calculate interval based on the range from -collateral to maxProfit
    const totalRange = maxValue - minValue
    const interval = Math.ceil(totalRange / 4) // Divide the range into 4 parts
    const ticks = []
    
    // Add ticks from min (negative collateral) up to max profit
    for (let i = minValue; i <= maxValue; i += interval) {
      ticks.push(i)
    }
    
    // Always include 0 if it's not already included
    if (!ticks.includes(0)) {
      ticks.push(0)
      ticks.sort((a, b) => a - b)
    }
    
    return ticks
  }, [maxProfit, collateralProvided])

  return (
    <div className="h-full w-full">
      {options.length === 0 ? (
        <div className="flex items-center justify-center h-[400px] text-sm text-muted-foreground 
          border border-dashed border-[#e5e5e5]/50 dark:border-[#393939] rounded-lg">
          Add options to see PnL projection
        </div>
      ) : (
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={calculatePnLPoints}
              margin={{
                top: 20,
                right: 30,
                left: 10,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#393939" opacity={0.2} />
              <XAxis 
                dataKey="name"
                stroke="#666"
                fontSize={11}
                tickFormatter={(value) => value.replace('$', '')}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                stroke="#666"
                fontSize={11}
                tickFormatter={(value) => `$${value}`}
                ticks={yAxisTicks}
                domain={[minPnL, maxProfit * 1.2]}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'PnL']}
                labelFormatter={(label) => `Price: ${label}`}
              />
              <ReferenceLine 
                y={maxProfit} 
                stroke="#22c55e"
                strokeDasharray="3 3"
                label={{ 
                  value: `Max Profit: $${maxProfit.toFixed(2)}`,
                  fill: '#22c55e',
                  fontSize: 11,
                  position: 'right'
                }}
              />
              <ReferenceLine 
                y={-collateralProvided} 
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{ 
                  value: `Liquidation: -$${collateralProvided.toFixed(2)}`,
                  fill: '#ef4444',
                  fontSize: 11,
                  position: 'right'
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
      )}
    </div>
  )
} 