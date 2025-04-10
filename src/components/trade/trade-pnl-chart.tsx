import React, { useMemo, useRef } from 'react'
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
import type { SelectedOption } from './option-data'
import { STANDARD_CONTRACT_SIZE } from '@/constants/constants'
import { useAssetPriceInfo } from '@/context/asset-price-provider'

// Extend the base SelectedOption interface with order-specific fields
interface TradePnLOption extends SelectedOption {
  orderType?: 'MKT' | 'LMT'
  limitPrice?: number
}

interface TradePnLChartProps {
  selectedOptions: TradePnLOption[]
}

interface PnLDataPoint {
  name: string
  value: number
  price: number
  percentageValue: number // Capped percentage value for chart display
  actualPercentageValue: number // Uncapped percentage value for tooltip
}

// Custom tooltip component for displaying PnL data
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const value = data.value;
  const percentageValue = data.actualPercentageValue; // Use the uncapped percentage value

  // Format value for better readability
  const formattedValue = value >= 0
    ? `+$${value.toFixed(2)}`
    : `-$${Math.abs(value).toFixed(2)}`;

  // Format percentage value
  const formattedPercentage = percentageValue >= 0
    ? `+${percentageValue.toFixed(2)}%`
    : `-${Math.abs(percentageValue).toFixed(2)}%`;

  // Determine color based on value
  const valueColor = value >= 0 ? 'text-green-500' : 'text-red-500';

  return (
    <div className="w-fit p-2 rounded-lg 
      bg-opacity-80 backdrop-blur-sm bg-black/70 dark:bg-black/90 
      shadow-lg border border-white/10 dark:border-white/5">
      <div className="text-xs text-gray-300 mb-1">
        Profit/Loss at Expiration
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-300 min-w-[70px]">Asset Price:</span>
          <span className="text-xs text-white font-medium">${data.price.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-300 min-w-[70px]">PnL:</span>
          <span className={`text-xs font-medium ${valueColor}`}>{formattedValue}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-300 min-w-[70px]">Return:</span>
          <span className={`text-xs font-medium ${valueColor}`}>{formattedPercentage}</span>
        </div>
      </div>
    </div>
  );
}

export const TradePnLChart: React.FC<TradePnLChartProps> = ({ selectedOptions = [] }) => {
  const chartRef = useRef<HTMLDivElement>(null)
  
  // Get the current asset price from the asset price provider
  const asset = selectedOptions.length > 0 ? selectedOptions[0]?.asset : ''
  const { price: currentMarketPrice } = useAssetPriceInfo(asset)
  
  // Calculate PnL points for the chart
  const calculatePnLPoints = useMemo(() => {
    if (selectedOptions.length === 0) return []

    // Get the asset from the first option
    const asset = selectedOptions[0]?.asset || ''
    
    // Calculate weighted average of strike prices to determine chart center
    const totalQuantity = selectedOptions.reduce((acc, opt) => acc + Number(opt.quantity), 0)
    const avgStrike = selectedOptions.reduce(
      (acc, opt) => acc + (Number(opt.strike) * Number(opt.quantity)), 0
    ) / (totalQuantity || 1) // Prevent division by zero

    // Calculate breakeven points for each option
    const breakEvenPoints = selectedOptions.map(option => {
      const strike = Number(option.strike);
      // Use limitPrice if it exists, otherwise use market price
      const premium = (option as any).limitPrice !== undefined 
        ? (option as any).limitPrice 
        : option.price;
      const isCall = option.side === 'call';
      const isBuy = option.type === 'bid';
      
      // For calls: 
      // - When buying: strike + premium
      // - When selling: strike - premium
      // For puts:
      // - When buying: strike - premium
      // - When selling: strike + premium
      if (isCall) {
        return isBuy ? strike + premium : strike - premium;
      } else {
        return isBuy ? strike - premium : strike + premium;
      }
    });

    // Calculate total premium paid/received
    let totalPremium = 0;
    selectedOptions.forEach(option => {
      const price = (option as any).limitPrice !== undefined 
        ? (option as any).limitPrice 
        : option.price;
      const quantity = Number(option.quantity);
      const contractSize = STANDARD_CONTRACT_SIZE;
      const premiumEffect = option.type === 'bid' ? -1 : 1;
      totalPremium += premiumEffect * price * quantity * contractSize;
    });

    // Calculate the center point as average of breakeven points
    const avgBreakEven = breakEvenPoints.reduce((sum, point) => sum + point, 0) / breakEvenPoints.length;
    
    // Find the min and max values including both strikes and breakeven points
    const allPricePoints = [
      ...selectedOptions.map(opt => Number(opt.strike)),
      ...breakEvenPoints
    ];
    const minPrice = Math.min(...allPricePoints);
    const maxPrice = Math.max(...allPricePoints);
    
    // Calculate initial range as 10% of the center point
    let priceRange = avgBreakEven * 0.10;
    
    // Calculate the minimum range needed to show all points
    const requiredRange = maxPrice - minPrice;
    
    // Use the larger of the two ranges and add 20% padding
    priceRange = Math.max(priceRange, requiredRange) * 1.2;
    
    // Calculate the final min and max prices, centered on avgBreakEven
    // but expanded if necessary to include all strikes and breakeven points
    const halfRange = priceRange / 2;
    const centeredMin = avgBreakEven - halfRange;
    const centeredMax = avgBreakEven + halfRange;
    
    // Ensure the range includes all points
    const finalMinPrice = Math.max(Math.min(centeredMin, minPrice - priceRange * 0.1), 0);
    const finalMaxPrice = Math.max(centeredMax, maxPrice + priceRange * 0.1);
    
    const steps = 100; // Higher resolution for smoother curve
    const priceStep = (finalMaxPrice - finalMinPrice) / steps;

    // Create points array
    const points = Array.from({ length: steps + 1 }, (_, i) => {
      const price = finalMinPrice + (i * priceStep)
      
      // Start with the premium paid/received
      let pnl = totalPremium

      // Calculate PnL contribution from each option
      selectedOptions.forEach(option => {
        const quantity = Number(option.quantity)
        const strike = Number(option.strike)
        const contractSize = STANDARD_CONTRACT_SIZE
        const isCall = option.side === 'call'
        const isBuy = option.type === 'bid'
        
        // Calculate intrinsic value at expiration
        const intrinsicValue = isCall 
          ? Math.max(0, price - strike)
          : Math.max(0, strike - price)
        
        // PnL effect depends on whether we're buying or selling
        // For buys: we gain the intrinsic value
        // For sells: we lose the intrinsic value
        const positionEffect = isBuy ? 1 : -1
        
        // Add intrinsic value to PnL
        pnl += positionEffect * intrinsicValue * quantity * contractSize
      })

      // Calculate percentage value relative to premium
      // If premium is 0, use a small number to avoid division by zero
      const absPremium = Math.abs(totalPremium) || 0.01
      const actualPercentageValue = (pnl / absPremium) * 100
      
      // Cap percentage values at -100% and +100% for chart display only
      const percentageValue = Math.max(Math.min(actualPercentageValue, 100), -100)

      return {
        price,
        name: `$${price.toFixed(2)}`,
        value: Number(pnl.toFixed(2)),
        percentageValue: Number(percentageValue.toFixed(2)),
        actualPercentageValue: Number(actualPercentageValue.toFixed(2))
      }
    })

    return points
  }, [selectedOptions])

  // Calculate max profit and loss for reference lines
  const { maxProfit, maxLoss, breakEvenPoints, displayMaxProfit, maxProfitPercentage, maxLossPercentage } = useMemo(() => {
    if (calculatePnLPoints.length === 0) {
      return { 
        maxProfit: 0, 
        maxLoss: 0, 
        breakEvenPoints: [], 
        displayMaxProfit: 0,
        maxProfitPercentage: 0,
        maxLossPercentage: 0
      }
    }
    
    let maxProfit = Number.MIN_SAFE_INTEGER
    let maxLoss = Number.MAX_SAFE_INTEGER
    let maxProfitPercentage = 0
    let maxLossPercentage = 0
    const breakEvenPoints: number[] = []
    
    // Find max profit and max loss
    calculatePnLPoints.forEach((point, index) => {
      if (point.value > maxProfit) {
        maxProfit = point.value
        maxProfitPercentage = point.percentageValue
      }
      if (point.value < maxLoss) {
        maxLoss = point.value
        maxLossPercentage = point.percentageValue
      }
      
      // Detect break-even points
      if (index > 0) {
        const prevPoint = calculatePnLPoints[index - 1]
        // If the PnL crosses zero between these points
        if ((prevPoint.value <= 0 && point.value >= 0) || 
            (prevPoint.value >= 0 && point.value <= 0)) {
          // Linear interpolation to find more precise break-even point
          const zeroPoint = prevPoint.price + 
            (point.price - prevPoint.price) * 
            (0 - prevPoint.value) / (point.value - prevPoint.value)
          
          breakEvenPoints.push(zeroPoint)
        }
      }
    })
    
    // For display purposes, if profit exceeds 1000, we'll show "Unlimited"
    const displayMaxProfit = maxProfit > 1000 ? maxProfit : maxProfit
    
    return { 
      maxProfit, // Keep original maxProfit for calculations
      maxLoss: Math.abs(maxLoss),
      breakEvenPoints,
      displayMaxProfit,
      maxProfitPercentage,
      maxLossPercentage
    }
  }, [calculatePnLPoints])

  // Format X axis ticks for price
  const formatXTick = (value: any) => {
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    
    // Format with K suffix for thousands
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`
    }
    
    return `$${num.toFixed(0)}`
  }

  // Format Y axis ticks for profit/loss
  const formatYTick = (value: any) => {
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    
    // Format with +/- sign and % symbol
    return num >= 0 ? `+${num.toFixed(0)}%` : `-${Math.abs(num).toFixed(0)}%`
  }

  // Calculate the domain for Y axis to ensure $0 is in the middle and proper scaling
  const yAxisDomain = useMemo(() => {
    // Use fixed domain from -100% to +100% for consistent scaling
    return [-100, 100];
  }, []);

  // Early return if no options selected
  if (selectedOptions.length === 0) {
    return (
      <div className="w-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
        border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
        hover:bg-transparent shadow-lg rounded-lg p-4">
        <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p>Select options from the chain above to visualize potential P&L</p>
            <p className="text-sm text-muted-foreground mt-2">
              The chart will update automatically as you build your position
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Early return if no PnL data calculated
  if (calculatePnLPoints.length === 0) {
    return (
      <div className="w-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
        border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
        hover:bg-transparent shadow-lg rounded-lg p-4">
        <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">
          <div>Calculating PnL data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg rounded-lg p-4">
      <div 
        className="w-full h-[300px]" 
        ref={chartRef}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={calculatePnLPoints}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <defs>
              {/* Green gradient for profit region */}
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.4} />
              </linearGradient>
              
              {/* Red gradient for loss region */}
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.9} />
              </linearGradient>
            </defs>
            
            <XAxis
              dataKey="price"
              tickFormatter={formatXTick}
              tick={{ fontSize: 11, fill: '#ffffff' }}
              tickLine={{ stroke: '#ffffff' }}
              axisLine={{ stroke: '#ffffff' }}
              domain={['dataMin', 'dataMax']}
              type="number"
              label={{
                value: 'Underlying Asset',
                position: 'insideBottom',
                offset: -10,
                style: { textAnchor: 'middle' },
                fontSize: 11,
                fill: '#ffffff'
              }}
            />
            
            <YAxis
              tickFormatter={formatYTick}
              tick={{ fontSize: 11, fill: '#ffffff' }}
              tickLine={{ stroke: '#ffffff' }}
              axisLine={{ stroke: '#ffffff' }}
              domain={yAxisDomain}
              label={{
                value: 'Return (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' },
                fontSize: 11,
                fill: '#ffffff'
              }}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: '#666',
                strokeDasharray: '3 3',
                strokeWidth: 1
              }}
            />

            <CartesianGrid strokeDasharray="2 2" opacity={0.1} />
            
            {/* Profit Area (green, only shows above 0) */}
            <Area
              type="monotone"
              dataKey={(dataPoint: PnLDataPoint) => (dataPoint.percentageValue >= 0 ? dataPoint.percentageValue : 0)}
              stroke="none"
              fillOpacity={0.4}
              fill="url(#profitGradient)"
              isAnimationActive={false}
              activeDot={false}
            />
            
            {/* Loss Area (red, only shows below 0) */}
            <Area
              type="monotone"
              dataKey={(dataPoint: PnLDataPoint) => (dataPoint.percentageValue < 0 ? dataPoint.percentageValue : 0)}
              stroke="none"
              fillOpacity={0.4}
              fill="url(#lossGradient)"
              isAnimationActive={false}
              activeDot={false}
            />

            {/* Positive value line */}
            <Line
              type="monotone"
              dataKey={(dataPoint: PnLDataPoint) => (dataPoint.percentageValue >= 0 ? dataPoint.percentageValue : null)}
              dot={false}
              activeDot={{ 
                r: 4, 
                fill: "#22c55e", 
                stroke: "white", 
                strokeWidth: 2 
              }}
              strokeWidth={1.5}
              stroke="#22c55e"
              isAnimationActive={false}
              connectNulls
            />
            
            {/* Negative value line */}
            <Line
              type="monotone"
              dataKey={(dataPoint: PnLDataPoint) => (dataPoint.percentageValue < 0 ? dataPoint.percentageValue : null)}
              dot={false}
              activeDot={{ 
                r: 4, 
                fill: "#ef4444", 
                stroke: "white", 
                strokeWidth: 2 
              }}
              strokeWidth={1.5}
              stroke="#ef4444"
              isAnimationActive={false}
              connectNulls
            />

            {/* Zero line */}
            <ReferenceLine 
              y={0} 
              stroke="#666"
              strokeDasharray="3 3"
              isFront={true}
            />
            
            {/* Break-even points */}
            {breakEvenPoints.filter((price, index, self) => 
              // Only keep unique break-even points
              self.indexOf(price) === index
            ).map((price, index) => (
              <ReferenceLine 
                key={`breakeven-${index}`}
                x={price}
                stroke="#9ca3af"
                strokeWidth={1.5}
                isFront={true}
              >
                <Label
                  value={`BE: $${price.toFixed(2)}`}
                  fill="#9ca3af"
                  fontSize={11}
                  fontWeight={600}
                  position="right"
                  offset={5}
                  dy={(index * 20) - 20} // Move up by 20px
                />
              </ReferenceLine>
            ))}
            
            {/* Current price reference line */}
            {currentMarketPrice && (
              <ReferenceLine
                x={currentMarketPrice}
                stroke="#4a85ff"
                strokeWidth={1.5}
                isFront={true}
                label={{
                  value: `Current Price: $${currentMarketPrice.toFixed(2)}`,
                  fill: '#4a85ff',
                  fontSize: 11,
                  fontWeight: 600,
                  position: 'insideBottomLeft',
                  dy: -5,
                  dx: 5
                }}
              />
            )}
            
            {/* Strike price reference lines */}
            {selectedOptions.map((option, index) => {
              const strike = Number(option.strike)
              const isCall = option.side === 'call'
              const isBuy = option.type === 'bid'
              
              // Color based on option type and direction
              const color = isBuy 
                ? "#22c55e" // Green for long options
                : "#ef4444" // Red for short options
              
              return (
                <ReferenceLine 
                  key={`strike-${index}`}
                  x={strike}
                  stroke={color}
                  strokeDasharray="2 2"
                  strokeWidth={1.5}
                  label={{ 
                    value: `${isBuy ? "+" : "-"}${isCall ? "C" : "P"} $${strike.toFixed(2)}`,
                    position: "right",
                    fontSize: 11,
                    fontWeight: 600,
                    fill: color,
                    offset: 5,
                    dy: (index * 20) + 40 // Start after breakeven labels
                  }}
                  isFront={true}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 