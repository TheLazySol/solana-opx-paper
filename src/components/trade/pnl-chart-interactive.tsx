'use client'

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { TrendingUp, TrendingDown, Target, Activity, DollarSign, Move } from 'lucide-react'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { motion } from 'framer-motion'
import * as echarts from 'echarts'

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

export const PnLChartInteractive: React.FC<PnLChartProps> = ({
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
  const chartRef = useRef<ReactECharts>(null)
  const [hoveredValue, setHoveredValue] = useState<{ price: number; pnl: number } | null>(null)

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

  // Calculate key metrics
  const metrics = useMemo(() => {
    const { breakeven, premium: prem, contracts: qty, multiplier, current } = validatedInputs
    const maxLoss = -prem * qty * multiplier
    const currentPnL = calculatePnL(current)
    
    return {
      maxLoss: Math.round(maxLoss * 100) / 100,
      breakeven: Math.round(breakeven * 100) / 100,
      currentPnL: Math.round(currentPnL * 100) / 100,
      maxProfit: 'Unlimited'
    }
  }, [validatedInputs, calculatePnL])

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
        bottom: 50,
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
          setHoveredValue({ price, pnl })
          
          return `
            <div style="padding: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="color: rgba(255,255,255,0.6); font-size: 12px;">Price at Expiration</span>
                <span style="color: #fff; font-weight: 600;">$${price.toFixed(2)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: rgba(255,255,255,0.6); font-size: 12px;">P/L</span>
                <span style="color: ${pnl >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
                  ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}
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
          formatter: (value: number) => `$${value}`
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255,255,255,0.05)'
          }
        }
      },
      dataZoom: [
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
          height: 20,
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
              // Strike price line
              {
                xAxis: validatedInputs.strike,
                lineStyle: { color: '#4a85ff', type: 'solid' },
                label: { 
                  formatter: `Strike: $${validatedInputs.strike}`,
                  color: '#4a85ff'
                }
              },
              // Current price line
              {
                xAxis: validatedInputs.current,
                lineStyle: { color: '#8b5cf6', type: 'dashed' },
                label: { 
                  formatter: `Current: $${validatedInputs.current.toFixed(2)}`,
                  color: '#8b5cf6'
                }
              },
              // Breakeven line
              {
                xAxis: validatedInputs.breakeven,
                lineStyle: { color: '#f59e0b', type: 'dashed' },
                label: { 
                  formatter: `B/E: $${validatedInputs.breakeven.toFixed(2)}`,
                  color: '#f59e0b'
                }
              }
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
  }, [chartData, profitData, lossData, validatedInputs, calculatePnL])


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
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-black/40 rounded-lg p-2">
                <span className="text-[10px] sm:text-xs text-white/60 block">Max Loss</span>
                <span className="text-xs sm:text-sm font-semibold text-red-400">${Math.abs(metrics.maxLoss)}</span>
              </div>
              <div className="bg-black/40 rounded-lg p-2">
                <span className="text-[10px] sm:text-xs text-white/60 block">Max Profit</span>
                <span className="text-xs sm:text-sm font-semibold text-green-400">{metrics.maxProfit}</span>
              </div>
              <div className="bg-black/40 rounded-lg p-2">
                <span className="text-[10px] sm:text-xs text-white/60 block">Strike</span>
                <span className="text-xs sm:text-sm font-semibold text-white/80">${validatedInputs.strike}</span>
              </div>
              <div className="bg-black/40 rounded-lg p-2">
                <span className="text-[10px] sm:text-xs text-white/60 block">Premium</span>
                <span className="text-xs sm:text-sm font-semibold text-white/80">${validatedInputs.premium}</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
}

// Export a memoized version for performance
export default React.memo(PnLChartInteractive)
