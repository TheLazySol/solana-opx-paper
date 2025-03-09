import React, { useMemo, useState, useRef, useEffect } from 'react'
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from "recharts"
import { cn } from "@/lib/misc/utils"

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
}

interface PnLDataPoint {
  name: string
  value: number
}

// Add a custom tooltip component before the main component
const CustomTooltip = ({ active, payload, label, showExpiration }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const color = value >= 0 ? '#22c55e' : '#ef4444';
    
    return (
      <div 
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '4px', // Smaller border radius
          padding: '6px 8px', // Reduced padding
          color: 'white',
          fontSize: '0.8rem', // Smaller font size
          maxWidth: '180px', // Limit maximum width
        }}
      >
        <p style={{ margin: '0 0 3px' }}>Price: ${parseFloat(label).toFixed(2)}</p>
        <p style={{ margin: '0', color }}>
          PnL at Expiration: ${value.toFixed(2)}
        </p>
      </div>
    );
  }

  return null;
};

export function MakerPnlChart({ 
  options, 
  collateralProvided, 
  leverage,
  riskFreeRate = 0.05, // Default to 5% if not provided
  assetPrice = null // Default to null if not provided
}: MakerPnlChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  // Always use expiration view - no toggle needed
  const showExpiration = true
  
  // State to control tooltip display with delay
  const [tooltipDelay, setTooltipDelay] = useState<NodeJS.Timeout | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipOpacity, setTooltipOpacity] = useState(0)
  
  // Clean up timeout when component unmounts
  useEffect(() => {
    return () => {
      if (tooltipDelay) {
        clearTimeout(tooltipDelay)
      }
    }
  }, [tooltipDelay])

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

    // Get current timestamp in seconds
    const now = Math.floor(Date.now() / 1000)
    
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

  // Get market price from the first option (could be improved with a weighted average)
  const currentMarketPrice = useMemo(() => {
    if (options.length === 0) return 0
    
    const totalQuantity = options.reduce((acc, opt) => acc + Number(opt.quantity), 0)
    return options.reduce(
      (acc, opt) => acc + (Number(opt.strikePrice) * Number(opt.quantity)), 0
    ) / totalQuantity
  }, [options])

  // Create a more accurate current market price calculation
  // In a real app, you'd fetch this from an API
  const currentPrice = useMemo(() => {
    // If assetPrice is provided, use it
    if (assetPrice !== null && assetPrice > 0) {
      return assetPrice;
    }
    
    // Otherwise fall back to calculated price
    if (options.length === 0) return 0;
    
    // For demo purposes, we'll use a weighted average based on strikes
    const basePrice = options.reduce(
      (acc, opt) => acc + (Number(opt.strikePrice) * Number(opt.quantity)), 0
    ) / options.reduce((acc, opt) => acc + Number(opt.quantity), 0);
    
    // Adjust by a small random amount so it's not exactly at the strike
    return basePrice * (1 + (Math.random() * 0.1 - 0.05)); // +/- 5%
  }, [options, assetPrice]);

  const priceRange = currentMarketPrice * 0.20 // 20% range
  const minPrice = Math.max(currentMarketPrice - priceRange, 0)
  const maxPrice = currentMarketPrice + priceRange

  // Calculate chart domains for centering zero and adding headroom
  const chartDomains = useMemo(() => {
    const absMax = Math.max(Math.abs(maxLoss), maxProfit)
    // Add 10% headroom to both sides
    const yDomain = [-absMax * 1.1, absMax * 1.1]
    
    // For X domain, use the current price as center point and ensure all key prices are visible
    const allPrices = [
      currentPrice,
      ...options.map(opt => Number(opt.strikePrice))
    ]
    const lowestPrice = Math.min(...allPrices) * 0.9 // 10% below lowest
    const highestPrice = Math.max(...allPrices) * 1.1 // 10% above highest
    
    // Ensure the domain is at least 30% around the current price
    const minDomain = Math.min(lowestPrice, currentPrice * 0.7)
    const maxDomain = Math.max(highestPrice, currentPrice * 1.3)
    
    return { 
      xDomain: [Math.max(0, minDomain), maxDomain], 
      yDomain 
    }
  }, [maxLoss, maxProfit, currentPrice, options])


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
            onMouseMove={() => {
              // Clear any existing timeout when mouse moves
              if (tooltipDelay) {
                clearTimeout(tooltipDelay)
              }
              
              // Fade in tooltip immediately
              setTooltipOpacity(1)
              setShowTooltip(true)
              
              // Set a new timeout to hide tooltip after 1 second of no movement
              const timeout = setTimeout(() => {
                // Keep tooltip visible after mouse stops moving
                setShowTooltip(true)
              }, 1000) // 1 second as requested
              
              setTooltipDelay(timeout)
            }}
            onMouseLeave={() => {
              // Clear timeout when mouse leaves chart area
              if (tooltipDelay) {
                clearTimeout(tooltipDelay)
                setTooltipDelay(null)
              }
              setTooltipOpacity(0)
              setShowTooltip(false)
            }}
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
                    value: 'Underlying Price', 
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
                  content={<CustomTooltip showExpiration={showExpiration} />}
                  cursor={{
                    stroke: '#666',
                    strokeDasharray: '3 3',
                    strokeWidth: 1
                  }}
                  active={showTooltip}
                  wrapperStyle={{ 
                    opacity: tooltipOpacity,
                    transition: 'opacity 0.3s ease-in-out'
                  }}
                />
                <ReferenceLine 
                  y={maxProfit} 
                  stroke="#22c55e"
                  strokeDasharray="3 3"
                >
                  <Label
                    value={`Max Profit: $${maxProfit.toFixed(2)}`}
                    fill="#22c55e"
                    fontSize={11}
                    position="insideTopRight"
                    dx={10}
                  />
                </ReferenceLine>
                <ReferenceLine 
                  y={-maxLoss} 
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                >
                  <Label
                    value={`Max Loss: -$${maxLoss.toFixed(2)}`}
                    fill="#ef4444"
                    fontSize={11}
                    position="insideBottomRight"
                    dx={10}
                  />
                </ReferenceLine>
                <ReferenceLine 
                  y={0} 
                  stroke="#666"
                  strokeDasharray="3 3"
                />
                
                {/* Add reference lines for each strike price */}
                {options.map((option, index) => {
                  const strike = Number(option.strikePrice)
                  const isCall = option.optionType.toLowerCase() === 'call'
                  return (
                    <ReferenceLine 
                      key={`strike-${index}`}
                      x={strike}
                      stroke={isCall ? "#f97316" : "#06b6d4"} // Orange for calls, cyan for puts
                      strokeDasharray="2 2"
                      label={{ 
                        value: `${isCall ? "Call" : "Put"} Strike: $${strike.toFixed(2)}`,
                        position: 'insideBottomRight',
                        fontSize: 9,
                        fill: isCall ? "#f97316" : "#06b6d4"
                      }}
                    />
                  )
                })}
                
                {/* Add current price marker */}
                <ReferenceLine 
                  x={currentPrice}
                  stroke="#10b981" // Green color
                  strokeWidth={2}
                  label={{ 
                    value: `Current Price: $${currentPrice.toFixed(2)}`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: "#10b981",
                    fontWeight: 'bold'
                  }}
                />
                
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#4a85ff"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 6,
                    stroke: '#fff',
                    strokeWidth: 2,
                    fill: '#4a85ff'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
            
          </div>
        </div>
      )}
    </div>
  )
}