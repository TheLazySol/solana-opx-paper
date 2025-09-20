'use client'

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { Card, CardBody } from '@heroui/react'
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
  const lastTooltipUpdate = useRef<number>(0)
  const lastTooltipContent = useRef<string>('')

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
        
        const legacyBreakevenAnchor = breakeven || validCurrent || 100
        const legacyIsMobile = typeof window !== 'undefined' && window.innerWidth < 768
        const legacyRangeMultiplier = legacyIsMobile ? 0.25 : 0.5
        const legacyXAxisMin = Math.max(0, legacyBreakevenAnchor * (1 - legacyRangeMultiplier))
        const legacyXAxisMax = legacyBreakevenAnchor * (1 + legacyRangeMultiplier)
        const legacyValidMax = maxPrice && maxPrice > legacyXAxisMax ? maxPrice : legacyXAxisMax
        
        return {
          options: [{
            strike: validStrike,
            premium: validPremium,
            contracts: validContracts, // validContracts is already validated to be at least 1
            side: 'call' as const,
            type: 'bid' as const,
            position: 'long' as const
          }],
          current: validCurrent,
          max: legacyValidMax,
          multiplier: validMultiplier,
          // Legacy compatibility
          strike: validStrike,
          premium: validPremium,
          contracts: validContracts,
          breakeven,
          breakevenAnchor: legacyBreakevenAnchor,
          xAxisMin: legacyXAxisMin,
          isMobile: legacyIsMobile
        }
      }
      
      // Return empty state
      const emptyAnchor = validCurrent || 100
      const emptyIsMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const emptyRangeMultiplier = emptyIsMobile ? 0.25 : 0.5
      const emptyXAxisMin = Math.max(0, emptyAnchor * (1 - emptyRangeMultiplier))
      const emptyXAxisMax = emptyAnchor * (1 + emptyRangeMultiplier)
      const emptyMax = maxPrice && maxPrice > emptyXAxisMax ? maxPrice : emptyXAxisMax
      
      return {
        options: [],
        current: validCurrent,
        max: emptyMax,
        multiplier: validMultiplier,
        strike: 0,
        premium: 0,
        contracts: 0,
        breakeven: 0,
        breakevenAnchor: emptyAnchor,
        xAxisMin: emptyXAxisMin,
        isMobile: emptyIsMobile
      }
    }
    
    // Process selected options - use actual quantities for accurate P&L calculations
    const processedOptions = selectedOptions.map(option => ({
      strike: Math.max(0, option.strike || 0),
      premium: Math.max(0, option.price || 0),
      contracts: Math.max(1, option.quantity || 1), // Use actual quantity for fractional options, default to 1 contract
      side: option.side,
      type: option.type,
      position: option.type === 'bid' ? 'long' as const : 'short' as const, // Buying = long, selling = short
      expiry: option.expiry,
      asset: option.asset,
      originalQuantity: option.quantity || 1 // Keep track of original selected quantity
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
    
    // Calculate X-axis range based on breakeven points with +/- 100% range (50% on mobile)
    // First, we need to calculate breakeven points properly for range calculation
    let breakevenAnchor = 0
    
    if (processedOptions.length === 1) {
      const option = processedOptions[0]
      if (option.side === 'call') {
        breakevenAnchor = option.strike + option.premium
      } else {
        breakevenAnchor = option.strike - option.premium
      }
    } else if (processedOptions.length > 1) {
      // For multi-leg strategies, we'll calculate a simple average of strikes as anchor
      // This is a simplified approach - more complex strategies would need specific calculations
      const strikes = processedOptions.map(opt => opt.strike).filter(s => s > 0)
      breakevenAnchor = strikes.length > 0 ? strikes.reduce((sum, strike) => sum + strike, 0) / strikes.length : validCurrent
    } else {
      breakevenAnchor = validCurrent
    }
    
    // Use window width to determine if mobile (simplified approach)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const rangeMultiplier = isMobile ? 0.25 : 0.5 // 25% for mobile, 50% for desktop
    
    // Ensure breakeven anchor is valid
    if (breakevenAnchor <= 0) {
      breakevenAnchor = validCurrent || 100
    }
    
    const xAxisMin = Math.max(0, breakevenAnchor * (1 - rangeMultiplier))
    const xAxisMax = breakevenAnchor * (1 + rangeMultiplier)
    
    // Only use maxPrice if it's explicitly provided and larger than our calculated range
    const validMax = maxPrice && maxPrice > xAxisMax ? maxPrice : xAxisMax
    
    return {
      options: processedOptions,
      current: validCurrent,
      max: validMax,
      multiplier: validMultiplier,
      // Legacy compatibility for single option
      strike: primaryOption?.strike || 0,
      premium: primaryOption?.premium || 0,
      contracts: primaryOption?.contracts || 0,
      breakeven: simpleBreakeven,
      breakevenAnchor,
      xAxisMin,
      isMobile
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

  // Pre-calculate total premium for performance optimization
  const totalPremiumPaid = useMemo(() => {
    const { options, multiplier } = validatedInputs
    
    if (!options || options.length === 0) return 0
    
    let total = 0
    options.forEach(option => {
      const { premium, contracts, position } = option
      if (position === 'long') {
        // Long positions: premium is paid (cost)
        total += premium * contracts * multiplier
      } else {
        // Short positions: premium is received (credit)
        total -= premium * contracts * multiplier
      }
    })
    
    return Math.abs(total)
  }, [validatedInputs])

  // Calculate percentage gain/loss for a given P&L (optimized for hover performance)
  const calculatePercentageGain = useCallback((pnl: number): number => {
    if (totalPremiumPaid === 0) return 0
    return (pnl / totalPremiumPaid) * 100
  }, [totalPremiumPaid])

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
    const startPrice = Math.max(0, validatedInputs.xAxisMin)
    const effectiveRange = Math.max(1e-6, testRange - startPrice)
    const testStep = effectiveRange / 2000 // Test 2000 points for precision
    
    // Guard against degenerate cases
    if (!isFinite(testStep) || testStep <= 0) return []
    
    let prevPnL = calculatePnL(startPrice)
    for (let price = startPrice + testStep; price <= startPrice + effectiveRange; price += testStep) {
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
    const { max, xAxisMin } = validatedInputs
    const points: ChartDataPoint[] = []
    
    // Higher resolution for smoother curves
    const numPoints = 500
    const range = max - xAxisMin
    const step = range / numPoints
    
    for (let price = xAxisMin; price <= max; price += step) {
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
      animationDuration: 600, // Even faster initial animation
      animationEasing: 'cubicOut',
      animationDurationUpdate: 0, // Disable animation on updates to prevent hover slowdown
      animationDelay: 0, // No delay for faster initial render
      hoverLayerThreshold: 3000, // Optimize hover performance for large datasets
      grid: {
          top: 10,
          right: 20, // Increased right padding to prevent number cutoff
          bottom: 10,
          left: 10,
          containLabel: true
        },
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove', // More responsive than default 'mousemove|click'
        showDelay: 0, // No delay for showing tooltip
        hideDelay: 100, // Small delay for hiding to prevent flickering
        enterable: false, // Prevent mouse from entering tooltip area
        axisPointer: {
          type: 'cross',
          animation: false, // Disable axis pointer animation to prevent slowdown
          label: {
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            shadowBlur: 0,
            formatter: (params: any) => {
              if (params.axisDimension === 'x') {
                return `$${params.value.toFixed(2)}`
              } else {
                return `$${params.value.toFixed(2)}`
              }
            }
          },
          crossStyle: {
            color: 'rgba(255,255,255,0.3)',
            width: 1,
            type: 'dashed'
          }
        },
        backgroundColor: 'rgba(8, 8, 8, 0.92)',
        borderColor: 'rgba(74, 133, 255, 0.2)',
        borderWidth: 0.5,
        borderRadius: 8,
        padding: 6,
        textStyle: {
          color: '#fff',
          fontSize: 10
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return ''
          
          // Throttle tooltip updates to improve performance during rapid mouse movements
          const now = Date.now()
          if (now - lastTooltipUpdate.current < 16) { // ~60fps throttling
            return lastTooltipContent.current // Return cached content
          }
          lastTooltipUpdate.current = now
          
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
          
          // Calculate total quantity for display
          const totalQuantity = validatedInputs.options.reduce((sum, option) => sum + (option.contracts || 0), 0);
          const showQuantityInfo = totalQuantity !== 1.0; // Show quantity info if not exactly 1 contract
          
          const tooltipContent = `
            <div style="padding: 4px 0; min-width: 140px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #fff; font-size: 11px; font-weight: 500;">Asset Price</span>
                <span style="color: #fff; font-weight: 600; font-size: 12px; text-align: right;">$${price.toFixed(2)}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: rgba(255,255,255,0.6); font-size: 11px; font-weight: 500;">P/L${showQuantityInfo ? ` (${totalQuantity.toFixed(2)} contracts)` : ''}</span>
                <span style="color: ${pnl >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600; font-size: 12px; text-align: right;">
                  ${pnl >= 0 ? '+' : ''}${formatPnL(pnl)}
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: rgba(255,255,255,0.6); font-size: 11px; font-weight: 500;">Gain/Loss</span>
                <span style="color: ${percentageGain >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600; font-size: 12px; text-align: right;">
                  ${percentageGain >= 0 ? '+' : ''}${percentageGain.toFixed(1)}%
                </span>
              </div>
            </div>
          `
          
          // Cache the content for performance
          lastTooltipContent.current = tooltipContent
          return tooltipContent
        }
      },
      xAxis: {
        type: 'value',
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
          formatter: (value: number) => `$${Math.round(value)}`
        },
        splitLine: {
          show: false
        },
        min: validatedInputs.xAxisMin,
        max: validatedInputs.max,
        interval: (validatedInputs.max - validatedInputs.xAxisMin) / 4, // Create 4 equal intervals for quartiles
        splitNumber: 5, // 5 tick marks: min, 25%, 50%, 75%, max
        axisPointer: {
          snap: true // Snap to tick marks for better precision
        }
      },
      yAxis: {
        type: 'value',
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
          fontSize: 11,
          rich: {
            positive: {
              color: '#4AFFBA'
            },
            negative: {
              color: '#ef4444'
            },
            neutral: {
              color: 'rgba(255,255,255,0.7)'
            }
          },
          formatter: (value: number) => {
            const percentage = calculatePercentageGain(value)
            if (Math.abs(percentage) < 0.1) {
              return `{neutral|0%}`
            }
            const color = percentage > 0 ? 'positive' : 'negative'
            return `{${color}|${percentage > 0 ? '+' : ''}${percentage.toFixed(0)}%}`
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255,255,255,0.05)'
          }
        },
        min: metrics.yAxisMin,
        max: metrics.yAxisMax,
        interval: metrics.yAxisMax / 4, // Create 4 intervals for 0%, ±25%, ±50%, ±75%, ±100%
        splitNumber: 9 // 9 splits for -100%, -75%, -50%, -25%, 0%, +25%, +50%, +75%, +100%
      },
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
            width: 2,
            shadowBlur: 10,
            shadowColor: 'rgba(74, 133, 255, 0.3)'
          },
          emphasis: {
            lineStyle: {
              width: 2 // Keep the same width as the normal state
            },
            animation: false // Disable emphasis animation to prevent hover slowdown
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
                label: { show: false }
              })),
              // Current price line
              {
                xAxis: validatedInputs.current,
                lineStyle: { color: '#8D4AFF', type: 'solid', width: 1, opacity: 0.70 },
                label: { 
                  show: true,
                  formatter: `Current: $${validatedInputs.current.toFixed(2)}`,
                  color: 'rgba(141, 74, 255, 0.5)',
                  fontSize: 10,
                  position: 'insideEndBottom'
                }
              },
              // Breakeven line(s) - supports multiple breakevens for multi-leg strategies
              ...(metrics.breakevenPrices || []).map((breakevenPrice, index) => ({
                xAxis: breakevenPrice,
                lineStyle: { color: '#FFBA4A', type: 'dashed', width: 1 },
                label: { show: false }
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
        {/* Removed header completely */}
        
        <CardBody className="p-2">
          <div className="relative">
            {/* Chart Container with responsive heights */}
            <div className="h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] w-full">
              <ReactECharts 
                ref={chartRef}
                option={getOption()}
                style={{ height: '100%', width: '100%' }}
                theme="dark"
                opts={{ 
                  renderer: 'canvas'
                }}
              />
            </div>
            
            {/* Simple metrics below chart */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-black/40 rounded-lg p-2">
                <span className="text-[10px] sm:text-xs text-white block">Max Loss</span>
                <span className="text-xs sm:text-sm font-semibold text-red-400">
                  {typeof metrics.maxLoss === 'string' ? metrics.maxLoss : `$${Math.abs(metrics.maxLoss)}`}
                </span>
              </div>
              <div className="bg-black/40 rounded-lg p-2">
                <span className="text-[10px] sm:text-xs text-white block">Max Profit</span>
                <span className="text-xs sm:text-sm font-semibold text-green-400">{metrics.maxProfit}</span>
              </div>
              
              {/* Strikes with hover for multiple strikes */}
              {validatedInputs.options.length > 1 ? (
                <div className="bg-black/40 rounded-lg p-2 relative group cursor-pointer">
                  <span className="text-[10px] sm:text-xs text-white block">Strikes</span>
                  <span className="text-xs sm:text-sm font-semibold text-white/80">
                    {validatedInputs.options.length}
                  </span>
                  {/* Hover tooltip for multiple strikes */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 border border-[#4a85ff]/20 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-lg" style={{ minWidth: '140px' }}>
                    {validatedInputs.options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between mb-1 last:mb-0" style={{ minWidth: '100%' }}>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${option.side === 'call' ? 'text-green-400' : 'text-red-400'}`}>
                            {option.side.toUpperCase()}
                          </span>
                          <span className="text-white/80 font-medium">${option.strike}</span>
                        </div>
                        {'expiry' in option && option.expiry && (
                          <span className="text-white/60 text-[10px] font-medium text-right">
                            {new Date(option.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : validatedInputs.options.length === 1 ? (
                <div className="bg-black/40 rounded-lg p-2 relative group cursor-pointer">
                  <span className="text-[10px] sm:text-xs text-white block">Strike Price</span>
                  <span className="text-xs sm:text-sm font-semibold text-white/80">
                    ${validatedInputs.strike}
                  </span>
                  {/* Hover tooltip for single strike */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 border border-[#4a85ff]/20 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-lg" style={{ minWidth: '140px' }}>
                    {validatedInputs.options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between mb-1 last:mb-0" style={{ minWidth: '100%' }}>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${option.side === 'call' ? 'text-green-400' : 'text-red-400'}`}>
                            {option.side.toUpperCase()}
                          </span>
                          <span className="text-white/80 font-medium">${option.strike}</span>
                        </div>
                        {'expiry' in option && option.expiry && (
                          <span className="text-white/60 text-[10px] font-medium text-right">
                            {new Date(option.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-black/40 rounded-lg p-2">
                  <span className="text-[10px] sm:text-xs text-white block">Strike Price</span>
                  <span className="text-xs sm:text-sm font-semibold text-white/80">
                    ${validatedInputs.strike}
                  </span>
                </div>
              )}
              
              
              {/* Breakeven with hover for multiple breakevens */}
              {(metrics.breakevenPrices || []).length > 0 && (
                <div className="bg-black/40 rounded-lg p-2 relative group cursor-pointer">
                  <span className="text-[10px] sm:text-xs text-white block">
                    {(metrics.breakevenPrices || []).length > 1 ? 'Breakevens' : 'Breakeven'}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#FFBA4A]">
                    {(metrics.breakevenPrices || []).length === 1 
                      ? `$${(metrics.breakevenPrices || [])[0]}` 
                      : `${(metrics.breakevenPrices || []).length} points`
                    }
                  </span>
                  {/* Hover tooltip for multiple breakevens */}
                  {(metrics.breakevenPrices || []).length > 1 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 border border-[#FFBA4A]/20 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-lg">
                      {(metrics.breakevenPrices || []).map((price, index) => (
                        <div key={index} className="flex items-center justify-between gap-4 py-0.5 min-w-[100px]">
                          <span className="text-white/60">B/E{index + 1}</span>
                          <span className="text-[#FFBA4A] font-semibold">${price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
