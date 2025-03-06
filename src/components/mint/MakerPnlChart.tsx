import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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

    return Array.from({ length: steps + 1 }, (_, i) => {
      const price = minPrice + (i * priceStep)
      let pnl = totalPremium

      options.forEach(option => {
        const quantity = Number(option.quantity)
        const strike = Number(option.strikePrice)

        if (option.optionType.toLowerCase() === 'call') {
          if (price > strike) {
            pnl = totalPremium - (quantity * (price - strike) * 100)
          }
        } else {
          if (price < strike) {
            pnl = totalPremium - (quantity * (strike - price) * 100)
          }
        }
      })

      return {
        name: `$${price.toFixed(2)}`,
        value: Number(pnl.toFixed(2))
      }
    })
  }, [options])

  const maxProfit = useMemo(() => {
    return options.reduce((acc, opt) => 
      acc + (Number(opt.premium) * Number(opt.quantity) * 100), 0)
  }, [options])

  // Calculate min PnL for better Y-axis scaling
  const minPnL = useMemo(() => {
    if (calculatePnLPoints.length === 0) return 0
    return Math.min(...calculatePnLPoints.map(point => point.value))
  }, [calculatePnLPoints])

  // Generate Y-axis ticks for better readability
  const yAxisTicks = useMemo(() => {
    if (maxProfit <= 0) return []
    const interval = Math.ceil(maxProfit / 4) // Divide the range into 4 parts
    const minValue = Math.floor(minPnL)
    const maxValue = Math.ceil(maxProfit)
    const ticks = []
    
    // Add negative ticks
    for (let i = 0; i >= minValue; i -= interval) {
      ticks.unshift(i)
    }
    // Add positive ticks
    for (let i = interval; i <= maxValue; i += interval) {
      ticks.push(i)
    }
    // Always include 0 if it's not already included
    if (!ticks.includes(0)) {
      ticks.push(0)
      ticks.sort((a, b) => a - b)
    }
    return ticks
  }, [maxProfit, minPnL])

  return (
    <Card className="mt-6 card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 
      dark:border-white/5 transition-all duration-300 hover:bg-transparent overflow-hidden shadow-lg">
      <CardHeader className="pb-3 border-b border-[#e5e5e5]/20 dark:border-[#393939]/50">
        <CardTitle className="text-lg font-semibold text-center">
          Profit & Loss Projection
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {options.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground 
            border border-dashed border-[#e5e5e5]/50 dark:border-[#393939] rounded-lg">
            Add options to see PnL projection
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={calculatePnLPoints}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#393939" opacity={0.2} />
                <XAxis 
                  dataKey="name"
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => value.replace('$', '')}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => `$${value}`}
                  ticks={yAxisTicks}
                  domain={[minPnL, maxProfit]}
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
                    value: `Max: $${maxProfit.toFixed(2)}`,
                    fill: '#22c55e',
                    fontSize: 12,
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
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 