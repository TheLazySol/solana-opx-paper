'use client'

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { TrendingUp, TrendingDown, Target, Activity, DollarSign, Move } from 'lucide-react'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { motion } from 'framer-motion'
import * as echarts from 'echarts'
import { SelectedOption } from './option-data'

interface PnLChartProps {
  // New approach: use actual selected option data
  selectedOptions: SelectedOption[]
  currentPrice: number
  
  // Optional props with defaults
  maxPrice?: number
  contractMultiplier?: number
  
  // Styling props
  className?: string
  showHeader?: boolean
  title?: string
  
  // Legacy props for backward compatibility (deprecated)
  strikePrice?: number
  premium?: number
  contracts?: number
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

export const PnLChartInteractive: React.FC<PnLChartProps> = ({
  selectedOptions,
  currentPrice,
  maxPrice,
  contractMultiplier = 100,
  className = '',
  showHeader = true,
  title = 'Payoff Diagram',
  // Legacy props for backward compatibility
  strikePrice,
  premium,
  contracts,
  legs
}) => {
  const chartCardRef = useMouseGlow()
  const chartRef = useRef<ReactECharts>(null)
  const [hoveredValue, setHoveredValue] = useState<{ price: number; pnl: number } | null>(null)

  // Input validation and processing
  const validatedInputs = useMemo(() => {
    const validCurrent = Math.max(0, currentPrice || 0)
    const validMultiplier = Math.max(1, contractMultiplier || 100)
    
    // Handle backward compatibility or empty state
    if (!selectedOptions || selectedOptions.length === 0) {
      // Fall back to legacy props if available
      if (strikePrice && premium && contracts) {
        const validStrike = Math.max(0, strikePrice || 0)
        const validPremium = Math.max(0, premium || 0)
        const validContracts = Math.max(1, Math.floor(contracts || 1))
        const breakeven = validStrike + validPremium
        
        const defaultMax = Math.max(
          validStrike * 2,
          breakeven * 1.5,
          validCurrent * 1.5,
          60
        )
        const validMax = Math.max(defaultMax, maxPrice || defaultMax)
        
        return {
          options: [{
            strike: validStrike,
            premium: validPremium,
            contracts: validContracts,
            side: 'call' as const,
            type: 'bid' as const,
            position: 'long' as const
          }],
          current: validCurrent,
          max: validMax,
          multiplier: validMultiplier,
          // Legacy compatibility
          strike: validStrike,
          premium: validPremium,
          contracts: validContracts,
          breakeven
        }
      }
      
      // Return empty state
      return {
        options: [],
        current: validCurrent,
        max: Math.max(validCurrent * 2, 100),
        multiplier: validMultiplier,
        strike: 0,
        premium: 0,
        contracts: 0,
        breakeven: 0
      }
    }
    
    // Process selected options - normalize to full contract quantities for display
    const processedOptions = selectedOptions.map(option => ({
      strike: Math.max(0, option.strike || 0),
      premium: Math.max(0, option.price || 0),
      contracts: 1, // Always show PnL for 1 full contract for clarity
      side: option.side,
      type: option.type,
      position: option.type === 'bid' ? 'long' as const : 'short' as const, // Buying = long, selling = short
      expiry: option.expiry,
      asset: option.asset,
      originalQuantity: option.quantity || 0.01 // Keep track of original selected quantity
    }))
    
    // For multi-leg support, we'll use the first option for basic calculations
    // but store all options for future enhancements
    const primaryOption = processedOptions[0]
    // Simple breakeven for now - will be recalculated properly after calculatePnL is defined
    const simpleBreakeven = primaryOption ? (
      primaryOption.side === 'call' 
        ? primaryOption.strike + primaryOption.premium 
        : primaryOption.strike - primaryOption.premium
    ) : 0
    
    // Calculate max price for X-axis based on all strikes
    const strikes = processedOptions.map(opt => opt.strike).filter(s => s > 0)
    const maxStrike = strikes.length > 0 ? Math.max(...strikes) : 100
    const defaultMax = Math.max(
      maxStrike * 2,
      simpleBreakeven * 1.5,
      validCurrent * 1.5,
      100 // Minimum reasonable max
    )
    const validMax = Math.max(defaultMax, maxPrice || defaultMax)
    
    return {
      options: processedOptions,
      current: validCurrent,
      max: validMax,
      multiplier: validMultiplier,
      // Legacy compatibility for single option
      strike: primaryOption?.strike || 0,
      premium: primaryOption?.premium || 0,
      contracts: primaryOption?.contracts || 0,
      breakeven: simpleBreakeven
    }
  }, [selectedOptions, currentPrice, maxPrice, contractMultiplier, strikePrice, premium, contracts])

  // Calculate P&L for a given underlying price
  const calculatePnL = useCallback((underlyingPrice: number): number => {
    const { options, multiplier } = validatedInputs
    
    if (!options || options.length === 0) return 0
    
    let totalPnL = 0
    
    // Calculate P&L for each option leg
    options.forEach(option => {
      const { strike, premium, contracts, side, position } = option
      
      let legPnL = 0
      
      if (side === 'call') {
        // Call option P&L
        const intrinsicValue = Math.max(0, underlyingPrice - strike)
        if (position === 'long') {
          // Long call: profit when price > strike, max loss = premium paid
          legPnL = (intrinsicValue - premium) * contracts * multiplier
        } else {
          // Short call: profit when price < strike, max profit = premium received
          legPnL = (premium - intrinsicValue) * contracts * multiplier
        }
      } else {
        // Put option P&L  
        const intrinsicValue = Math.max(0, strike - underlyingPrice)
        if (position === 'long') {
          // Long put: profit when price < strike, max loss = premium paid
          legPnL = (intrinsicValue - premium) * contracts * multiplier
        } else {
          // Short put: profit when price > strike, max profit = premium received
          legPnL = (premium - intrinsicValue) * contracts * multiplier
        }
      }
      
      totalPnL += legPnL
    })
    
    return totalPnL
  }, [validatedInputs])

  // Calculate percentage gain/loss for a given P&L
  const calculatePercentageGain = useCallback((pnl: number): number => {
    const { options, multiplier } = validatedInputs
    
    if (!options || options.length === 0) return 0
    
    // Calculate total premium paid/received for all legs
    let totalPremiumPaid = 0
    
    options.forEach(option => {
      const { premium, contracts, position } = option
      if (position === 'long') {
        // Long positions: premium is paid (cost)
        totalPremiumPaid += premium * contracts * multiplier
      } else {
        // Short positions: premium is received (credit)
        totalPremiumPaid -= premium * contracts * multiplier
      }
    })
    
    // For percentage calculation, we use absolute value of total premium
    const absTotal = Math.abs(totalPremiumPaid)
    if (absTotal === 0) return 0
    
    return (pnl / absTotal) * 100
  }, [validatedInputs])

  // Calculate precise breakeven price(s) for multi-leg strategies
  const breakevenPrices = useMemo((): number[] => {
    const { options } = validatedInputs
    if (!options || options.length === 0) return []
    
    // For single leg strategies, use analytical calculation
    if (options.length === 1) {
      const option = options[0]
      if (option.side === 'call' && option.position === 'long') {
        return [option.strike + option.premium] // Long call breakeven
      } else if (option.side === 'put' && option.position === 'long') {
        return [option.strike - option.premium] // Long put breakeven
      } else if (option.side === 'call' && option.position === 'short') {
        return [option.strike + option.premium] // Short call breakeven
      } else if (option.side === 'put' && option.position === 'short') {
        return [option.strike - option.premium] // Short put breakeven
      }
    }
    
    // For multi-leg strategies, find where P&L = 0 by testing price points
    const breakevenResults: number[] = []
    const testRange = validatedInputs.max
    const testStep = testRange / 2000 // Test 2000 points for precision
    
    let prevPnL = calculatePnL(0)
    for (let price = testStep; price <= testRange; price += testStep) {
      const currentPnL = calculatePnL(price)
      
      // Check if P&L crossed zero (sign change)
      if ((prevPnL >= 0 && currentPnL < 0) || (prevPnL < 0 && currentPnL >= 0)) {
        // Use linear interpolation to find more precise breakeven
        const ratio = Math.abs(prevPnL) / (Math.abs(prevPnL) + Math.abs(currentPnL))
        const breakevenPrice = (price - testStep) + (ratio * testStep)
        breakevenResults.push(Math.round(breakevenPrice * 100) / 100)
      }
      
      prevPnL = currentPnL
    }
    
    return breakevenResults
  }, [validatedInputs, calculatePnL])

  // Generate chart data points with higher resolution
  const chartData = useMemo((): ChartDataPoint[] => {
    const { max, strike, breakeven, current } = validatedInputs
    const points: ChartDataPoint[] = []
    
    // Higher resolution for smoother curves
    const numPoints = 500 // Increased from 50
    const step = max / numPoints
    
    for (let price = 0; price <= max; price += step) {
      const pnl = calculatePnL(price)
      points.push({
        price: Math.round(price * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        isProfit: pnl >= 0
      })
    }
    
    return points
  }, [validatedInputs, calculatePnL])

  // Split data for gradient fills
  const { profitData, lossData } = useMemo(() => {
    const profit: [number, number][] = []
    const loss: [number, number][] = []
    
    chartData.forEach(d => {
      if (d.pnl >= 0) {
        profit.push([d.price, d.pnl])
        loss.push([d.price, 0])
      } else {
        profit.push([d.price, 0])
        loss.push([d.price, d.pnl])
      }
    })
    
    return { profitData: profit, lossData: loss }
  }, [chartData])

  // Calculate key metrics and Y-axis range
  const metrics = useMemo(() => {
    const { options, multiplier, current, breakeven } = validatedInputs
    const currentPnL = calculatePnL(current)
    
    if (!options || options.length === 0) {
      return {
        maxLoss: 0,
        breakeven: 0,
        currentPnL: 0,
        maxProfit: 'Unlimited',
        yAxisMin: -100,
        yAxisMax: 100,
        totalPremiumPaid: 0
      }
    }
    
    // Calculate total premium paid/received and max loss
    let totalPremiumPaid = 0
    let maxLoss = 0
    
    options.forEach(option => {
      const { premium, contracts, position, side } = option
      const legCost = premium * contracts * multiplier
      
      if (position === 'long') {
        // Long positions: premium is paid (cost)
        totalPremiumPaid += legCost
        // Max loss for long positions is the premium paid
        maxLoss += legCost
      } else {
        // Short positions: premium is received (credit)
        totalPremiumPaid -= legCost
        // For short positions, max loss could be unlimited (calls) or limited (puts)
        if (side === 'call') {
          // Short call has unlimited loss potential
          maxLoss = Infinity
        } else {
          // Short put max loss = strike - premium received
          maxLoss += Math.max(0, (option.strike - premium) * contracts * multiplier)
        }
      }
    })
    
    // Calculate Y-axis range based on percentage limits (-100% to +100%)
    const absPremium = Math.abs(totalPremiumPaid)
    // For Y-axis, -100% should be the maximum possible loss (premium paid or collateral)
    // +100% should be 100% gain on the premium paid/collateral
    const yAxisMin = -absPremium // This represents -100% (total loss of premium/collateral)
    const yAxisMax = absPremium || 100 // This represents +100% gain
    
    return {
      maxLoss: maxLoss === Infinity ? 'Unlimited' : Math.round(maxLoss * 100) / 100,
      breakeven: breakevenPrices.length > 0 ? Math.round(breakevenPrices[0] * 100) / 100 : Math.round(breakeven * 100) / 100,
      breakevenPrices: breakevenPrices.map(bp => Math.round(bp * 100) / 100),
      currentPnL: Math.round(currentPnL * 100) / 100,
      maxProfit: 'Unlimited', // Could be calculated more precisely for specific strategies
      yAxisMin: Math.round(yAxisMin * 100) / 100,
      yAxisMax: Math.round(yAxisMax * 100) / 100,
      totalPremiumPaid: Math.round(Math.abs(totalPremiumPaid) * 100) / 100
    }
  }, [validatedInputs, calculatePnL, breakevenPrices])

  // ECharts configuration
  const getOption = useCallback(() => {
    const lineData = chartData.map(d => [d.price, d.pnl])
    
    return {
      animation: true,
      animationDuration: 1500,
      animationEasing: 'cubicOut',
      grid: {
        top: 10,
        right: 10,
        bottom: 60, // Increased from 50 to 60 to accommodate taller slider
        left: 60,
        containLabel: false
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          animation: true,
          label: {
            backgroundColor: '#4a85ff',
            borderColor: '#4a85ff',
            shadowBlur: 0
          },
          crossStyle: {
            color: '#4a85ff',
            width: 1,
            type: 'dashed'
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        textStyle: {
          color: '#fff'
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return ''
          const price = params[0].value[0]
          const pnl = params[0].value[1]
          const percentageGain = calculatePercentageGain(pnl)
          setHoveredValue({ price, pnl })
          
          // Format PnL with proper precision for USD values
          const formatPnL = (value: number) => {
            if (Math.abs(value) >= 1000) {
              return `$${(value / 1000).toFixed(2)}k`
            } else if (Math.abs(value) >= 1) {
              return `$${value.toFixed(2)}`
            } else {
              return `$${value.toFixed(4)}`
            }
          }
          
          return `
            <div style="padding: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="color: rgba(255,255,255,0.6); font-size: 12px;">Price at Expiration</span>
                <span style="color: #fff; font-weight: 600;">$${price.toFixed(2)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="color: rgba(255,255,255,0.6); font-size: 12px;">P/L</span>
                <span style="color: ${pnl >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
                  ${pnl >= 0 ? '+' : ''}${formatPnL(pnl)}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: rgba(255,255,255,0.6); font-size: 12px;">Gain/Loss</span>
                <span style="color: ${percentageGain >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
                  ${percentageGain >= 0 ? '+' : ''}${percentageGain.toFixed(1)}%
                </span>
              </div>
            </div>
          `
        }
      },
      xAxis: {
        type: 'value',
        name: 'Price at Expiration ($)',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255,255,255,0.3)'
          }
        },
        axisTick: {
          lineStyle: {
            color: 'rgba(255,255,255,0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(255,255,255,0.7)',
          fontSize: 11,
          formatter: (value: number) => `$${value}`
        },
        splitLine: {
          show: false
        },
        min: 0,
        max: validatedInputs.max
      },
      yAxis: {
        type: 'value',
        name: 'Profit / Loss ($)',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255,255,255,0.3)'
          }
        },
        axisTick: {
          lineStyle: {
            color: 'rgba(255,255,255,0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(255,255,255,0.7)',
          fontSize: 11,
          formatter: (value: number) => {
            const percentage = calculatePercentageGain(value)
            return `$${value} (${percentage >= 0 ? '+' : ''}${percentage.toFixed(0)}%)`
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255,255,255,0.05)'
          }
        },
        min: metrics.yAxisMin,
        max: metrics.yAxisMax
      },
      dataZoom: [
        // X-axis zoom (horizontal)
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'none',
          start: 0,
          end: 100,
          height: 30, // Increased height from 20 to 30
          bottom: 8,
          borderColor: 'rgba(255,255,255,0.1)',
          backgroundColor: 'rgba(0,0,0,0.2)',
          fillerColor: 'rgba(74,133,255,0.2)',
          handleStyle: {
            color: '#4a85ff',
            borderColor: '#4a85ff'
          },
          textStyle: {
            color: 'rgba(255,255,255,0.7)'
          }
        },
        // Y-axis zoom (vertical) - enables dragging up/down (inside only, no slider)
        {
          type: 'inside',
          yAxisIndex: 0,
          filterMode: 'none',
          start: 0,
          end: 100,
          zoomOnMouseWheel: 'shift', // Hold shift to zoom Y-axis
          moveOnMouseMove: true, // Enable dragging
          moveOnMouseWheel: true // Enable wheel scrolling
        }
      ],
      series: [
        // Main P&L line
        {
          name: 'P&L',
          type: 'line',
          data: lineData,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#4a85ff',
            width: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(74, 133, 255, 0.3)'
          },
          emphasis: {
            lineStyle: {
              width: 4
            }
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              type: 'solid',
              width: 2
            },
            label: {
              show: true,
              position: 'start',
              fontSize: 11,
              fontWeight: 600
            },
            data: [
              // Zero line
              {
                yAxis: 0,
                lineStyle: { color: 'rgba(255,255,255,0.3)', type: 'solid', width: 1 },
                label: { show: false }
              },
              // Strike price lines for all options
              ...validatedInputs.options.map((option, index) => ({
                xAxis: option.strike,
                lineStyle: { 
                  color: option.side === 'call' ? '#10b981' : '#ef4444', 
                  type: 'solid',
                  width: 1
                },
                label: { 
                  formatter: `${option.side.toUpperCase()} $${option.strike}`,
                  color: option.side === 'call' ? '#10b981' : '#ef4444',
                  fontSize: 10
                }
              })),
              // Current price line
              {
                xAxis: validatedInputs.current,
                lineStyle: { color: '#8b5cf6', type: 'dashed' },
                label: { 
                  formatter: `Current: $${validatedInputs.current.toFixed(2)}`,
                  color: '#8b5cf6'
                }
              },
              // Breakeven line(s) (grey-white color) - supports multiple breakevens for multi-leg strategies
              ...(metrics.breakevenPrices || []).map((breakevenPrice, index) => ({
                xAxis: breakevenPrice,
                lineStyle: { color: 'rgba(156, 163, 175, 0.8)', type: 'dashed' }, // grey-white
                label: { 
                  formatter: (metrics.breakevenPrices || []).length > 1 
                    ? `B/E${index + 1}: $${breakevenPrice.toFixed(2)}`
                    : `B/E: $${breakevenPrice.toFixed(2)}`,
                  color: 'rgba(156, 163, 175, 0.9)',
                  fontSize: 10
                }
              }))
            ]
          }
        },
        // Profit area
        {
          name: 'Profit',
          type: 'line',
          data: profitData,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 0
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
            ])
          },
          silent: true
        },
        // Loss area
        {
          name: 'Loss',
          type: 'line',
          data: lossData,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 0
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239, 68, 68, 0.05)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.3)' }
            ])
          },
          silent: true
        }
      ]
    }
  }, [chartData, profitData, lossData, validatedInputs, calculatePnL, calculatePercentageGain, metrics])


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
          <CardHeader className="pb-2 px-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                  <Activity className="w-3 h-3 text-[#4a85ff]" />
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              </div>
              
              {/* Compact Inline Metrics */}
              <div className="flex items-center gap-2">
                <Chip 
                  size="sm" 
                  variant="flat" 
                  className="bg-white/10 text-white/70"
                  startContent={<Target className="w-3 h-3" />}
                >
                  B/E: ${metrics.breakeven}
                </Chip>
                <Chip 
                  size="sm" 
                  variant="flat" 
                  className={metrics.currentPnL >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
                  startContent={metrics.currentPnL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                >
                  P/L: {metrics.currentPnL >= 0 ? '+' : ''}${metrics.currentPnL}
                </Chip>
              </div>
            </div>
          </CardHeader>
        )}
        
        <CardBody className="p-2">
          <div className="relative">
            {/* Chart Container with responsive heights */}
            <div className="h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] w-full">
              <ReactECharts 
                ref={chartRef}
                option={getOption()}
                style={{ height: '100%', width: '100%' }}
                theme="dark"
                opts={{ renderer: 'canvas' }}
              />
            </div>
            
            {/* Simple metrics below chart */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-black/40 rounded-lg p-2">
                <span className="text-[10px] sm:text-xs text-white/60 block">Max Loss</span>
                <span className="text-xs sm:text-sm font-semibold text-red-400">
                  {typeof metrics.maxLoss === 'string' ? metrics.maxLoss : `$${Math.abs(metrics.maxLoss)}`}
                </span>
              </div>
              <div className="bg-black/40 rounded-lg p-2">
                <span className="text-[10px] sm:text-xs text-white/60 block">Max Profit</span>
                <span className="text-xs sm:text-sm font-semibold text-green-400">{metrics.maxProfit}</span>
              </div>
              <div className="bg-black/40 rounded-lg p-2">
                <span className="text-[10px] sm:text-xs text-white/60 block">
                  {validatedInputs.options.length > 1 ? 'Legs' : 'Strike'}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-white/80">
                  {validatedInputs.options.length > 1 
                    ? `${validatedInputs.options.length}` 
                    : `$${validatedInputs.strike}`
                  }
                </span>
              </div>
              <div className="bg-black/40 rounded-lg p-2">
                <span className="text-[10px] sm:text-xs text-white/60 block">Net Premium</span>
                <span className="text-xs sm:text-sm font-semibold text-white/80">
                  ${metrics.totalPremiumPaid}
                </span>
              </div>
              {(metrics.breakevenPrices || []).length > 0 && (
                <div className="bg-black/40 rounded-lg p-2">
                  <span className="text-[10px] sm:text-xs text-white/60 block">
                    {(metrics.breakevenPrices || []).length > 1 ? 'Breakevens' : 'Breakeven'}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-300">
                    {(metrics.breakevenPrices || []).length === 1 
                      ? `$${(metrics.breakevenPrices || [])[0]}` 
                      : `${(metrics.breakevenPrices || []).length} points`
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
}

// Export a memoized version for performance
export default React.memo(PnLChartInteractive)
