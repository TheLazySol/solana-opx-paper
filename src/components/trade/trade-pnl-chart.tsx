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
import { Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react'
import { motion } from 'framer-motion'

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
  actualPercentageValue: number | null // Uncapped percentage value for tooltip, null when totalPremium is zero
}

// Custom tooltip component for displaying PnL data
import type { TooltipProps } from 'recharts';

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({
  active,
  payload
}) => {
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
  const formattedPercentage = percentageValue === null
    ? "N/A" // Handle case when percentage is undefined (totalPremium === 0)
    : percentageValue >= 0
      ? `+${percentageValue.toFixed(2)}%`
      : `-${Math.abs(percentageValue).toFixed(2)}%`;

  // Determine color based on value
  const valueColor = value >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="p-3 rounded-lg bg-black/90 backdrop-blur-md border border-white/20 shadow-2xl">
      <div className="text-xs text-white/60 mb-2 font-medium">
        P&L at Expiration
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-white/60">Asset Price:</span>
          <span className="text-xs text-white font-semibold">${data.price.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-white/60">Profit/Loss:</span>
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
      const premium = option.limitPrice ?? option.price;
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
      const price = option.limitPrice ?? option.price;
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
      let actualPercentageValue = 0
      let percentageValue = 0
      
      if (totalPremium === 0) {
        // If premium is exactly zero, we can't calculate percentage return
        // Set to NaN to indicate undefined percentage
        actualPercentageValue = NaN
        percentageValue = 0 // Use 0 for chart display purposes
      } else {
        // Calculate percentage normally when we have a non-zero premium
        const absPremium = Math.abs(totalPremium)
        actualPercentageValue = (pnl / absPremium) * 100
        
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
      <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
        <CardBody className="min-h-[400px] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-3"
          >
            <Activity className="w-12 h-12 text-white/30 mx-auto" />
            <div className="space-y-2">
              <p className="text-white/60">Select options from the chain above to visualize P&L</p>
              <p className="text-sm text-white/40">
                The chart will update automatically as you build your position
              </p>
            </div>
          </motion.div>
        </CardBody>
      </Card>
    )
  }

  // Early return if no PnL data calculated
  if (calculatePnLPoints.length === 0) {
    return (
      <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
        <CardBody className="min-h-[400px] flex items-center justify-center">
          <div className="text-white/60">Calculating P&L data...</div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Profit & Loss Analysis
          </h3>
          <div className="flex items-center gap-2">
            <Chip
              size="sm"
              variant="flat"
              className={maxProfit > Math.abs(maxLoss) ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
              startContent={maxProfit > Math.abs(maxLoss) ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            >
              Max: {maxProfit > Math.abs(maxLoss) 
                ? `+${maxProfitPercentage.toFixed(0)}%` 
                : `-${Math.abs(maxLossPercentage).toFixed(0)}%`}
            </Chip>
            {breakEvenPoints.length > 0 && (
              <Chip
                size="sm"
                variant="flat"
                className="bg-white/10 text-white/70"
                startContent={<Target className="w-3 h-3" />}
              >
                BE: ${breakEvenPoints[0].toFixed(2)}
              </Chip>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardBody>
        <div 
          className="w-full h-[350px]" 
          ref={chartRef}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={calculatePnLPoints}
              margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
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
                tick={{ fontSize: 11, fill: '#ffffff80' }}
                tickLine={{ stroke: '#ffffff20' }}
                axisLine={{ stroke: '#ffffff20' }}
                domain={['dataMin', 'dataMax']}
                type="number"
                label={{
                  value: 'Underlying Asset Price',
                  position: 'insideBottom',
                  offset: -5,
                  style: { textAnchor: 'middle', fontSize: 12, fill: '#ffffff60' }
                }}
              />
              
              <YAxis
                tickFormatter={formatYTick}
                tick={{ fontSize: 11, fill: '#ffffff80' }}
                tickLine={{ stroke: '#ffffff20' }}
                axisLine={{ stroke: '#ffffff20' }}
                domain={yAxisDomain}
                label={{
                  value: 'Return (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 12, fill: '#ffffff60' }
                }}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: '#ffffff30',
                  strokeDasharray: '3 3',
                  strokeWidth: 1
                }}
              />

              <CartesianGrid strokeDasharray="3 3" opacity={0.05} stroke="#ffffff" />
              
              {/* Profit Area (green, only shows above 0) */}
              <Area
                type="monotone"
                dataKey={(dataPoint: PnLDataPoint) => (dataPoint.percentageValue >= 0 ? dataPoint.percentageValue : 0)}
                stroke="none"
                fillOpacity={1}
                fill="url(#profitGradient)"
                isAnimationActive={false}
                activeDot={false}
              />
              
              {/* Loss Area (red, only shows below 0) */}
              <Area
                type="monotone"
                dataKey={(dataPoint: PnLDataPoint) => (dataPoint.percentageValue < 0 ? dataPoint.percentageValue : 0)}
                stroke="none"
                fillOpacity={1}
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
                  r: 5, 
                  fill: "#10b981", 
                  stroke: "#000000", 
                  strokeWidth: 2 
                }}
                strokeWidth={2}
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
                  r: 5, 
                  fill: "#ef4444", 
                  stroke: "#000000", 
                  strokeWidth: 2 
                }}
                strokeWidth={2}
                stroke="#ef4444"
                isAnimationActive={false}
                connectNulls
              />

              {/* Zero line */}
              <ReferenceLine 
                y={0} 
                stroke="#ffffff40"
                strokeDasharray="5 5"
                strokeWidth={1}
                isFront={true}
              />
              
              {/* Break-even points */}
              {breakEvenPoints.filter((price, index, self) => 
                // Only keep unique break-even points with a small tolerance
                self.findIndex(p => Math.abs(p - price) < 0.01) === index
              ).map((price, index) => (
                <ReferenceLine 
                  key={`breakeven-${index}`}
                  x={price}
                  stroke="#ffffff60"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  isFront={true}
                >
                  <Label
                    value={`BE: $${price.toFixed(2)}`}
                    fill="#ffffff80"
                    fontSize={11}
                    fontWeight={600}
                    position="top"
                    offset={5}
                  />
                </ReferenceLine>
              ))}
              
              {/* Current price reference line */}
              {currentMarketPrice && (
                <ReferenceLine
                  x={currentMarketPrice}
                  stroke="#60a5fa"
                  strokeWidth={2}
                  isFront={true}
                  label={{
                    value: `Current: $${currentMarketPrice.toFixed(2)}`,
                    fill: '#60a5fa',
                    fontSize: 11,
                    fontWeight: 600,
                    position: 'top',
                    offset: 20
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
                  ? "#10b981" // Green for long options
                  : "#ef4444" // Red for short options
                
                return (
                  <ReferenceLine 
                    key={`strike-${index}`}
                    x={strike}
                    stroke={color}
                    strokeDasharray="2 2"
                    strokeWidth={1}
                    strokeOpacity={0.5}
                    label={{ 
                      value: `${isBuy ? "+" : "-"}${isCall ? "C" : "P"} $${strike}`,
                      position: "bottom",
                      fontSize: 10,
                      fontWeight: 500,
                      fill: color,
                      offset: 5 + (index * 15)
                    }}
                    isFront={false}
                  />
                )
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}