'use client'

import React, { useMemo, useCallback, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ResponsiveContainer,
  ReferenceArea,
  TooltipProps
} from 'recharts'
import { Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { TrendingUp, TrendingDown, Target, Activity, DollarSign } from 'lucide-react'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { motion } from 'framer-motion'

interface PnLChartProps {
  // Required props
  strikePrice: number
  premium: number
  contracts: number
  currentPrice: number
  
  // Optional props with defaults
  maxPrice?: number
  contractMultiplier?: number
  
  // Styling props
  className?: string
  showHeader?: boolean
  title?: string
  
  // Future extensibility for multi-leg
  legs?: OptionLeg[]
}

// For future multi-leg support
interface OptionLeg {
  type: 'call' | 'put'
  position: 'long' | 'short'
  strike: number
  premium: number
  contracts: number
}

interface ChartDataPoint {
  price: number
  pnl: number
  isProfit: boolean
}

// Custom tooltip component matching HeroUI style
const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0]
  const pnl = data.value as number
  const price = label as number

  return (
    <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-3 shadow-xl">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <DollarSign className="w-3 h-3 text-white/60" />
          <span className="text-xs text-white/60">Price at Expiration</span>
          <span className="text-sm font-semibold text-white">${price.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          {pnl >= 0 ? (
            <TrendingUp className="w-3 h-3 text-green-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
          <span className="text-xs text-white/60">P/L</span>
          <span className={`text-sm font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pnl >= 0 ? '+' : ''} ${pnl.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

export const PnLChart: React.FC<PnLChartProps> = ({
  strikePrice,
  premium,
  contracts,
  currentPrice,
  maxPrice,
  contractMultiplier = 100,
  className = '',
  showHeader = true,
  title = 'Payoff Diagram',
  legs
}) => {
  const chartCardRef = useMouseGlow()
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null)

  // Input validation
  const validatedInputs = useMemo(() => {
    const validStrike = Math.max(0, strikePrice || 0)
    const validPremium = Math.max(0, premium || 0)
    const validContracts = Math.max(1, Math.floor(contracts || 1))
    const validCurrent = Math.max(0, currentPrice || 0)
    const validMultiplier = Math.max(1, contractMultiplier || 100)
    
    // Calculate breakeven
    const breakeven = validStrike + validPremium
    
    // Determine max price for X-axis
    const defaultMax = Math.max(
      validStrike * 2,
      breakeven * 1.5,
      validCurrent * 1.5,
      60 // Minimum reasonable max
    )
    const validMax = Math.max(defaultMax, maxPrice || defaultMax)
    
    return {
      strike: validStrike,
      premium: validPremium,
      contracts: validContracts,
      current: validCurrent,
      max: validMax,
      multiplier: validMultiplier,
      breakeven
    }
  }, [strikePrice, premium, contracts, currentPrice, maxPrice, contractMultiplier])

  // Calculate P&L for a given underlying price
  const calculatePnL = useCallback((underlyingPrice: number): number => {
    const { strike, premium: prem, contracts: qty, multiplier } = validatedInputs
    
    // Long call P&L formula
    const intrinsicValue = Math.max(0, underlyingPrice - strike)
    const pnl = (intrinsicValue - prem) * qty * multiplier
    
    return pnl
  }, [validatedInputs])

  // Generate chart data points
  const chartData = useMemo((): ChartDataPoint[] => {
    const { max, strike, breakeven, current } = validatedInputs
    const points: ChartDataPoint[] = []
    
    // Key points to always include
    const keyPrices = new Set([
      0,
      strike * 0.5,
      strike * 0.75,
      strike,
      breakeven,
      current,
      strike * 1.25,
      strike * 1.5,
      max
    ])
    
    // Add regular intervals
    const step = max / 50 // 50 points for smooth curve
    for (let price = 0; price <= max; price += step) {
      keyPrices.add(Math.round(price * 100) / 100) // Round to 2 decimals
    }
    
    // Convert to sorted array and generate data
    const sortedPrices = Array.from(keyPrices).sort((a, b) => a - b)
    
    for (const price of sortedPrices) {
      const pnl = calculatePnL(price)
      points.push({
        price: Math.round(price * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        isProfit: pnl >= 0
      })
    }
    
    return points
  }, [validatedInputs, calculatePnL])

  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    const pnlValues = chartData.map(d => d.pnl)
    const minPnL = Math.min(...pnlValues)
    const maxPnL = Math.max(...pnlValues)
    
    // Add padding
    const padding = Math.abs(maxPnL - minPnL) * 0.1
    return [
      Math.floor((minPnL - padding) / 10) * 10,
      Math.ceil((maxPnL + padding) / 10) * 10
    ]
  }, [chartData])

  // Calculate key metrics
  const metrics = useMemo(() => {
    const { breakeven, premium: prem, contracts: qty, multiplier, current } = validatedInputs
    const maxLoss = -prem * qty * multiplier
    const currentPnL = calculatePnL(current)
    
    return {
      maxLoss: Math.round(maxLoss * 100) / 100,
      breakeven: Math.round(breakeven * 100) / 100,
      currentPnL: Math.round(currentPnL * 100) / 100,
      maxProfit: 'Unlimited' as const
    }
  }, [validatedInputs, calculatePnL])

  // Split data into profit and loss regions for area fills
  const { profitData, lossData } = useMemo(() => {
    const profit = chartData.map(d => ({
      ...d,
      pnl: d.pnl >= 0 ? d.pnl : null
    }))
    
    const loss = chartData.map(d => ({
      ...d,
      pnl: d.pnl < 0 ? d.pnl : null
    }))
    
    return { profitData: profit, lossData: loss }
  }, [chartData])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card 
        ref={chartCardRef}
        className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
        style={{
          background: `
            radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
              rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
              rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
              rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
              transparent 75%
            ),
            linear-gradient(to bottom right, 
              rgb(15 23 42 / 0.4), 
              rgb(30 41 59 / 0.3), 
              rgb(51 65 85 / 0.2)
            )
          `,
          transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
        }}
      >
        {showHeader && (
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                  <Activity className="w-3 h-3 text-[#4a85ff]" />
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              </div>
              
              {/* Key Metrics */}
              <div className="flex items-center gap-3">
                <Chip size="sm" variant="flat" className="bg-white/10 text-white/70">
                  Break-even: ${metrics.breakeven}
                </Chip>
                <Chip 
                  size="sm" 
                  variant="flat" 
                  className={metrics.currentPnL >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
                >
                  Current P/L: {metrics.currentPnL >= 0 ? '+' : ''}${metrics.currentPnL}
                </Chip>
              </div>
            </div>
          </CardHeader>
        )}
        
        <CardBody className="p-4">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ top: 10, right: 30, left: 60, bottom: 40 }}
                onMouseMove={(e) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const point = e.activePayload[0].payload as ChartDataPoint
                    setHoveredPoint(point)
                  }
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.05}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255,255,255,0.1)" 
                  vertical={false}
                />
                
                <XAxis 
                  dataKey="price"
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  label={{ 
                    value: 'Price at Expiration ($)', 
                    position: 'insideBottom', 
                    offset: -5,
                    style: { fill: 'rgba(255,255,255,0.5)', fontSize: 12 }
                  }}
                  domain={[0, validatedInputs.max]}
                />
                
                <YAxis 
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  label={{ 
                    value: 'Profit / Loss ($)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: 'rgba(255,255,255,0.5)', fontSize: 12 }
                  }}
                  domain={yDomain}
                  tickFormatter={(value) => `$${value}`}
                />
                
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                />
                
                {/* Profit area */}
                <Area
                  type="monotone"
                  dataKey="pnl"
                  data={profitData}
                  stroke="none"
                  fill="url(#profitGradient)"
                  connectNulls={false}
                />
                
                {/* Loss area */}
                <Area
                  type="monotone"
                  dataKey="pnl"
                  data={lossData}
                  stroke="none"
                  fill="url(#lossGradient)"
                  connectNulls={false}
                />
                
                {/* Zero line */}
                <ReferenceLine 
                  y={0} 
                  stroke="rgba(255,255,255,0.3)" 
                  strokeWidth={1}
                />
                
                {/* Strike price line */}
                <ReferenceLine 
                  x={validatedInputs.strike} 
                  stroke="#4a85ff" 
                  strokeWidth={2}
                  strokeDasharray="0"
                  label={{
                    value: `Strike: $${validatedInputs.strike}`,
                    position: 'top',
                    fill: '#4a85ff',
                    fontSize: 11,
                    offset: 5
                  }}
                />
                
                {/* Breakeven line */}
                <ReferenceLine 
                  x={validatedInputs.breakeven} 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: `B/E: $${validatedInputs.breakeven}`,
                    position: 'top',
                    fill: '#f59e0b',
                    fontSize: 11,
                    offset: 5
                  }}
                />
                
                {/* Current price line */}
                <ReferenceLine 
                  x={validatedInputs.current} 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  strokeDasharray="2 2"
                  label={{
                    value: `Current: $${validatedInputs.current}`,
                    position: 'bottom',
                    fill: '#8b5cf6',
                    fontSize: 11,
                    offset: 5
                  }}
                />
                
                {/* Main payoff line */}
                <Line 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#4a85ff" 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#4a85ff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Metrics Summary */}
          <div className="grid grid-cols-4 gap-4 mt-4 p-4 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10">
            <div className="text-center">
              <p className="text-xs text-white/60 mb-1">Max Loss</p>
              <p className="text-sm font-semibold text-red-400">${Math.abs(metrics.maxLoss)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/60 mb-1">Max Profit</p>
              <p className="text-sm font-semibold text-green-400">{metrics.maxProfit}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/60 mb-1">Strike Price</p>
              <p className="text-sm font-semibold text-white/80">${validatedInputs.strike}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/60 mb-1">Premium Paid</p>
              <p className="text-sm font-semibold text-white/80">${validatedInputs.premium}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
}

// Export a memoized version for performance
export default React.memo(PnLChart)
