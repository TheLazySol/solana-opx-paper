import React, { useMemo, useRef, useEffect, useState } from 'react'
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
  AreaChart,
  Area,
  Line
} from "recharts"
import { calculateLiquidationPrice } from '@/constants/option-lab/calculations'

interface OptionPosition {
  quantity: number
  strikePrice: string | number
  premium: string | number
  optionType: string
  asset: string
  expiryTimestamp?: number  // Optional expiry timestamp in seconds
  impliedVolatility?: number // Optional IV
}

interface MakerPnlChartProps {
  options: OptionPosition[]
  collateralProvided: number
  leverage: number
  riskFreeRate?: number // Optional risk-free rate for option calculations
  assetPrice?: number | null // Current asset price from AssetSelector
  liquidationPrices?: { upward: number | null, downward: number | null } // External liquidation prices
}

interface PnLDataPoint {
  name: string
  value: number
  price: number
  percentageValue: number // Capped percentage value for chart display
  actualPercentageValue: number | null // Uncapped percentage value for tooltip
}

// Add a custom tooltip component before the main component
const CustomTooltip = ({ active, payload, label, showExpiration }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const value = data.value; // Ensure this is the correct field from your data points
  const percentageValue = data.actualPercentageValue; // Use the uncapped percentage value

  // Format value for better readability
  const formattedValue = value >= 0
    ? `+$${value.toFixed(2)}`
    : `-$${Math.abs(value).toFixed(2)}`;

  // Format percentage value
  const formattedPercentage = percentageValue === null
    ? "N/A" // Handle case when percentage is undefined
    : percentageValue >= 0
      ? `+${percentageValue.toFixed(2)}%`
      : `-${Math.abs(percentageValue).toFixed(2)}%`;

  // Determine color based on value
  const valueColor = value >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="p-3 rounded-lg bg-black/90 backdrop-blur-md border border-white/20 shadow-2xl">
      <div className="text-xs text-white/60 mb-2 font-medium">
        {showExpiration ? 'Profit/Loss at Expiration' : 'Current Profit/Loss'}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-white/60">Asset Price:</span>
          <span className="text-xs text-white font-semibold">${data.price.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-white/60">PnL:</span>
          <span className={`text-xs font-bold ${valueColor}`}>{formattedValue}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-white/60">Return:</span>
          <span className={`text-xs font-bold ${valueColor}`}>{formattedPercentage}</span>
        </div>
      </div>
    </div>
  );
}

export function MakerPnlChart({ 
  options, 
  collateralProvided, 
  leverage,
  riskFreeRate = 0.05, // Default to 5% if not provided
  assetPrice = null, // Default to null if not provided
  liquidationPrices // External liquidation prices from props
}: MakerPnlChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  // Always use expiration view - no toggle needed
  const showExpiration = true
  
  // State to track if the chart is being viewed on a mobile device
  const [isMobile, setIsMobile] = useState(false)
  
  // Effect to detect mobile screen size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640) // 640px is the sm breakpoint in Tailwind
    }
    
    // Check on mount
    checkIfMobile()
    
    // Add event listener
    window.addEventListener('resize', checkIfMobile)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])
  
  // Calculate internal liquidation prices if not provided externally
  const computedLiquidationPrices = useMemo(() => {
    if (!assetPrice || assetPrice <= 0 || options.length === 0) {
      return { upward: null, downward: null };
    }
    return calculateLiquidationPrice(
      options,
      collateralProvided,
      leverage,
      assetPrice
    );
  }, [options, collateralProvided, leverage, assetPrice]);
  
  // Use provided liquidation prices if available, otherwise use calculated ones
  const displayedLiquidationPrices = liquidationPrices || computedLiquidationPrices;

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
    const priceRange = avgStrike * 0.3 // 30% range for better visualization
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
        const isCall = option.optionType.toLowerCase() === 'call'
        
        // At expiration, calculate intrinsic value directly for accurate slope representation
        // For calls: intrinsic value = max(0, spot - strike)
        // For puts: intrinsic value = max(0, strike - spot)
        const intrinsicValue = isCall 
          ? Math.max(0, price - strike)
          : Math.max(0, strike - price)
          
        // For maker/seller, we lose money as option goes ITM
        pnl -= quantity * intrinsicValue * contractSize
      })

      // Apply leverage effect on losses (but not on profits)
      if (pnl < 0) {
        pnl = pnl * leverage
      }

      // Apply a floor to PnL based on collateral
      if (pnl < -collateralProvided) {
        pnl = -collateralProvided
      }

      // Calculate percentage value relative to collateral
      let actualPercentageValue = 0
      let percentageValue = 0
      
      if (collateralProvided === 0) {
        // If collateral is zero, we can't calculate percentage return
        actualPercentageValue = NaN
        percentageValue = 0 // Use 0 for chart display purposes
      } else {
        // Calculate percentage based on collateral provided
        actualPercentageValue = (pnl / collateralProvided) * 100
        
        // Cap percentage values at -100% and +100% for chart display only
        percentageValue = Math.max(Math.min(actualPercentageValue, 100), -100)
      }

      return {
        price,
        name: `$${price.toFixed(2)}`,
        value: Number(pnl.toFixed(2)),
        percentageValue: Number(isNaN(percentageValue) ? 0 : percentageValue.toFixed(2)),
        actualPercentageValue: isNaN(actualPercentageValue) ? null : Number(actualPercentageValue.toFixed(2))
      }
    })

    return points
  }, [options, collateralProvided, leverage])

  // Calculate max profit - premium received
  const maxProfit = useMemo(() => {
    return options.reduce((acc, opt) => 
      acc + (Number(opt.premium) * Number(opt.quantity) * 100), 0)
  }, [options])

  // Calculate max profit percentage
  const maxProfitPercentage = useMemo(() => {
    if (collateralProvided === 0) return 0
    return Math.min((maxProfit / collateralProvided) * 100, 100) // Cap at 100%
  }, [maxProfit, collateralProvided])

  // Calculate max loss - which is collateral required
  const maxLoss = useMemo(() => {
    let totalRisk = 0
    
    options.forEach(option => {
      const quantity = Number(option.quantity)
      const strike = Number(option.strikePrice)
      const contractSize = 100
      
      // For call options, theoretical max loss is infinite, but we'll use a more realistic value
      // For put options, max loss is strike price * quantity * contract size
      if (option.optionType.toLowerCase() === 'put') {
        // For puts, max loss is when underlying goes to zero
        totalRisk += strike * quantity * contractSize
      } else {
        // For calls, max loss depends on how far the underlying could realistically go up
        // Use 2x the strike price as a conservative estimate for max upside move
        // This shows a clearer slope for the loss potential
        const maxUpside = strike * 2
        totalRisk += (maxUpside - strike) * quantity * contractSize
      }
    })
    
    // Apply leverage
    totalRisk = totalRisk * leverage
    
    // Limited by collateral
    return Math.min(totalRisk, collateralProvided)
  }, [options, collateralProvided, leverage])

  // Max loss is always 100% of collateral for percentage display
  const maxLossPercentage = 100

  // Determine if there are any short calls to adjust label positions
  const hasShortCalls = useMemo(() => {
    return options.some(option => option.optionType.toLowerCase() === 'call')
  }, [options])

  // Determine if there are any short puts to adjust label positions
  const hasShortPuts = useMemo(() => {
    return options.some(option => option.optionType.toLowerCase() === 'put')
  }, [options])

  // Determine label positions based on option types
  const maxProfitPosition = useMemo(() => {
    // For calls only, put max profit on left. For puts only or mixed, keep on right
    if (hasShortCalls && !hasShortPuts) {
      return isMobile ? "left" : "insideBottomLeft"
    }
    return isMobile ? "right" : "insideBottomRight"
  }, [hasShortCalls, hasShortPuts, isMobile])

  // Determine label positions based on option types
  const maxLossPosition = useMemo(() => {
    // For calls only, put max loss on right. For puts only or mixed, keep on left
    if (hasShortCalls && !hasShortPuts) {
      return isMobile ? "right" : "insideBottomRight"
    }
    return isMobile ? "left" : "insideBottomLeft"
  }, [hasShortCalls, hasShortPuts, isMobile])
  
  // Get market price from the first option (could be improved with a weighted average)
  const currentMarketPrice = useMemo(() => {
    if (assetPrice && assetPrice > 0) {
      return assetPrice
    }
    if (options.length > 0) {
      // Fallback to the strike price if assetPrice is not available
      return Number(options[0].strikePrice)
    }
    return null
  }, [options, assetPrice])

  // Format X axis ticks for price
  const formatXTick = (value: any) => {
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    
    // Format with K suffix for thousands
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`
    }
    
    // For mobile, show even fewer decimals
    if (isMobile) {
      return `$${num.toFixed(0)}`
    }
    
    // Don't show the $ for intermediate ticks to reduce clutter
    return `$${num.toFixed(0)}`
  }

  // Format Y axis ticks for profit/loss percentage
  const formatYTick = (value: any) => {
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    
    // Format with +/- sign and % symbol
    // For mobile, make it even shorter
    if (isMobile) {
      return num >= 0 ? `+${num}%` : `${num}%`
    }
    return num >= 0 ? `+${num.toFixed(0)}%` : `-${Math.abs(num).toFixed(0)}%`
  }

  // Fixed domain for Y axis from -100% to +100%
  const yAxisDomain = useMemo(() => {
    return [-100, 100];
  }, []);

  // Early return if no data yet
  if (calculatePnLPoints.length === 0) {
    return <div className="h-[300px] flex items-center justify-center text-sm text-white/60">
      No option data available for chart
    </div>
  }

  // Adjust chart margins based on device size
  const chartMargins = isMobile 
    ? { top: 30, right: 20, bottom: 30, left: 20 }  // More top and bottom margins on mobile
    : { top: 20, right: 20, bottom: 20, left: 20 }; // Original margins on desktop

  return (
    <div 
      className="w-full h-[300px]" 
      ref={chartRef}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={calculatePnLPoints}
          margin={chartMargins}
        >
          <defs>
            {/* Enhanced green gradient for profit region */}
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
            
            {/* Enhanced red gradient for loss region */}
            <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
              <stop offset="50%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          
          <XAxis
            dataKey="price"
            tickFormatter={formatXTick}
            tick={{ fontSize: isMobile ? 10 : 11, fill: '#ffffff80' }}
            tickLine={{ stroke: '#ffffff20' }}
            axisLine={{ stroke: '#ffffff20' }}
            domain={['dataMin', 'dataMax']}
            type="number"
            label={isMobile ? undefined : {
              value: 'Underlying Asset Price',
              position: 'insideBottom',
              offset: -5,
              style: { textAnchor: 'middle', fontSize: 12, fill: '#ffffff60' }
            }}
            // Reduce number of ticks on mobile
            interval={isMobile ? 'preserveStartEnd' : 0}
            tickCount={isMobile ? 3 : 5}
          />
          
          <YAxis
            tickFormatter={formatYTick}
            tick={{ fontSize: isMobile ? 10 : 11, fill: '#ffffff80' }}
            tickLine={{ stroke: '#ffffff20' }}
            axisLine={{ stroke: '#ffffff20' }}
            domain={yAxisDomain}
            label={isMobile ? undefined : {
              value: 'Return (%)', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 12, fill: '#ffffff60' }
            }}
            // Reduce number of ticks on mobile
            tickCount={isMobile ? 5 : 10}
            width={isMobile ? 35 : 40}
          />
          <Tooltip
            content={<CustomTooltip showExpiration={showExpiration} />}
            cursor={{
              stroke: '#ffffff30',
              strokeDasharray: '3 3',
              strokeWidth: 1
            }}
          />
          <ReferenceLine 
            y={maxProfitPercentage} 
            stroke="#10b981"
            strokeDasharray="3 3"
          >
            <Label
              value={isMobile ? `+${maxProfitPercentage.toFixed(0)}%` : `Max Profit: +${maxProfitPercentage.toFixed(0)}%`}
              fill="#10b981"
              fontSize={isMobile ? 12 : 11}
              position={maxProfitPosition}
              dy={isMobile ? -20 : undefined}
              dx={isMobile ? (maxProfitPosition === "left" ? 5 : -5) : 10}
            />
          </ReferenceLine>
          <ReferenceLine 
            y={-maxLossPercentage} 
            stroke="#ef4444"
            strokeDasharray="3 3"
          >
            <Label
              value={isMobile ? `-${maxLossPercentage.toFixed(0)}%` : `Max Loss: -${maxLossPercentage.toFixed(0)}%`}
              fill="#ef4444"
              fontSize={isMobile ? 12 : 11}
              position={maxLossPosition}
              dy={isMobile ? -20 : undefined}
              dx={isMobile ? (maxLossPosition === "left" ? 5 : -5) : 10}
            />
          </ReferenceLine>
          
          {/* Add a reference line at $0 PnL */}
          <ReferenceLine 
            y={0} 
            stroke="#ffffff40"
            strokeDasharray="5 5"
            strokeWidth={1}
          />
          
          {/* Current Price Reference Line - with label at top */}
          {currentMarketPrice && (
            <ReferenceLine
              x={currentMarketPrice}
              stroke="#60a5fa"
              strokeWidth={2}
              label={{
                value: isMobile ? `$${currentMarketPrice.toFixed(0)}` : `Current: $${currentMarketPrice.toFixed(2)}`,
                fill: '#60a5fa',
                fontSize: isMobile ? 12 : 11,
                position: isMobile ? "top" : "insideTopLeft",
                dy: isMobile ? -15 : 5,
                dx: isMobile ? 0 : 5
              }}
              isFront={true}
            />
          )}
          
          {/* Liquidation Price Reference Lines */}
          {displayedLiquidationPrices?.upward && (
            <ReferenceLine
              x={displayedLiquidationPrices.upward}
              stroke="#9CA3AF" // Lighter grey color (gray-400)
              strokeWidth={1}
              strokeDasharray="3 3"
              label={{
                value: `Liq: $${displayedLiquidationPrices.upward.toFixed(2)}`,
                fill: "#9CA3AF",
                fontSize: 10,
                position: "insideBottomLeft",
                dy: 0,
                dx: 0,
                angle: 0,
              }}
              isFront={true}
            />
          )}
          
          {displayedLiquidationPrices?.downward && (
            <ReferenceLine
              x={displayedLiquidationPrices.downward}
              stroke="#9CA3AF" // Lighter grey color (gray-400)
              strokeWidth={1}
              strokeDasharray="3 3"
              label={{
                value: `Liq: $${displayedLiquidationPrices.downward.toFixed(2)}`,
                fill: "#9CA3AF",
                fontSize: 10,
                position: "insideBottomLeft",
                dy: 0,
                dx: 0,
                angle: 0,
              }}
              isFront={true}
            />
          )}
          
          {/* Add reference lines for each strike price */}
          {options.map((option, index) => {
            const strike = Number(option.strikePrice)
            const isCall = option.optionType.toLowerCase() === 'call'
            
            // For mobile view, only show labels for first 2 strikes or alternate between calls and puts
            const shouldShowLabel = !isMobile || index === 0 || 
              (isMobile && options.length <= 2) || 
              (isMobile && index % 2 === 0 && options.length <= 4);
            
            // For mobile, calculate vertical positioning of label to avoid overlap
            // Offsetting each label by its position in array
            const labelOffset = isMobile ? (index * 15) % 60 : undefined;
            
            return (
              <ReferenceLine 
                key={`strike-${index}`}
                x={strike}
                stroke={isCall ? "#f97316" : "#06b6d4"} // Orange for calls, cyan for puts
                strokeDasharray="2 2"
                strokeWidth={1.5}
                strokeOpacity={0.7}
                label={shouldShowLabel ? { 
                  value: isMobile ? 
                    `${isCall ? "C" : "P"}:$${strike.toFixed(0)}` : 
                    `${isCall ? "Call" : "Put"} Strike: $${strike.toFixed(2)}`,
                  position: isMobile ? "bottom" : "insideBottomRight",
                  fontSize: isMobile ? 12 : 11,
                  fill: isCall ? "#f97316" : "#06b6d4",
                  dy: isMobile ? labelOffset : undefined
                } : undefined}
                isFront={false}
              />
            )
          })}
          
          <CartesianGrid strokeDasharray="3 3" opacity={0.05} stroke="#ffffff" />
          
          {/* Positive value line */}
          <Line
            type="monotone"
            dataKey={(dataPoint: PnLDataPoint) => (dataPoint.percentageValue >= 0 ? dataPoint.percentageValue : null)}
            dot={false}
            activeDot={{ 
              r: isMobile ? 4 : 4, 
              fill: "#10b981", 
              stroke: "#000000", 
              strokeWidth: isMobile ? 2 : 2 
            }}
            strokeWidth={isMobile ? 2 : 1.5}
            stroke="#10b981"
            isAnimationActive={false}
            connectNulls
          />
          
          {/* Negative value line */}
          <Line
            type="monotone"
            dataKey={(dataPoint: PnLDataPoint) => (dataPoint.percentageValue < 0 ? dataPoint.percentageValue : null)}
            dot={false}
            activeDot={{ 
              r: isMobile ? 4 : 4, 
              fill: "#ef4444", 
              stroke: "#000000", 
              strokeWidth: isMobile ? 2 : 2 
            }}
            strokeWidth={isMobile ? 2 : 1.5}
            stroke="#ef4444"
            isAnimationActive={false}
            connectNulls
          />
          
          {/* Profit Area (green, only shows above 0) */}
          <Area
            type="monotone"
            dataKey={(dataPoint: PnLDataPoint) => (dataPoint.percentageValue >= 0 ? dataPoint.percentageValue : 0)}
            stroke="none"
            fillOpacity={isMobile ? 0.3 : 0.4}
            fill="url(#profitGradient)"
            isAnimationActive={false}
            activeDot={false}
          />
          
          {/* Loss Area (red, only shows below 0) */}
          <Area
            type="monotone"
            dataKey={(dataPoint: PnLDataPoint) => (dataPoint.percentageValue < 0 ? dataPoint.percentageValue : 0)}
            stroke="none"
            fillOpacity={isMobile ? 0.3 : 0.4}
            fill="url(#lossGradient)"
            isAnimationActive={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}