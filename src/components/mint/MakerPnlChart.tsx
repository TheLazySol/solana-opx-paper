import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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
  // Add state for chart panning and zooming
  const [chartDomain, setChartDomain] = useState<{ left: number; right: number } | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ x: number, chartX: number } | null>(null)
  
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
    const priceRange = avgStrike * 0.5 // 50% range for better visualization
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

        // At expiration, calculate intrinsic value
        if (option.optionType.toLowerCase() === 'call') {
          // For call options at expiration
          const intrinsicValue = Math.max(0, price - strike)
          pnl -= quantity * intrinsicValue * contractSize
        } else {
          // For put options at expiration
          const intrinsicValue = Math.max(0, strike - price)
          pnl -= quantity * intrinsicValue * contractSize
        }
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
      
      // For call options, theoretical max loss is infinite, but limited by collateral
      // For put options, max loss is strike price * quantity * contract size
      if (option.optionType.toLowerCase() === 'put') {
        totalRisk += strike * quantity * contractSize
      } else {
        // For calls, use a high multiple of strike as theoretical max
        totalRisk += strike * quantity * contractSize * 2 // Arbitrary multiplier
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

  const priceRange = currentMarketPrice * 0.15 // 15% range
  const minPrice = Math.max(currentMarketPrice - priceRange, 0)
  const maxPrice = currentMarketPrice + priceRange

  // Calculate chart domains for centering zero and adding headroom
  const chartDomains = useMemo(() => {
    const absMax = Math.max(Math.abs(maxLoss), maxProfit)
    // Add 20% headroom to both sides
    const yDomain = [-absMax * 1.2, absMax * 1.2]
    
    // For X domain, use the market price +/- range
    const defaultXDomain = [minPrice, maxPrice]
    
    const xDomain = chartDomain ? 
      [chartDomain.left, chartDomain.right] : 
      defaultXDomain

    return { xDomain, yDomain }
  }, [maxLoss, maxProfit, chartDomain, minPrice, maxPrice])

  // Initialize chart interactions on container
  useEffect(() => {
    const chartContainer = chartRef.current;
    if (!chartContainer) return;

    // Direct event handlers for the chart container
    const handleContainerMouseDown = (e: MouseEvent) => {
      if (!chartDomains.xDomain) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const rect = chartContainer.getBoundingClientRect();
      const chartX = e.clientX - rect.left;
      
      dragStart.current = { x: chartX, chartX };
      setIsDragging(true);
      
      document.body.style.cursor = 'grabbing';
    };

    // Add mouse down listener directly to the container
    chartContainer.addEventListener('mousedown', handleContainerMouseDown);
    
    return () => {
      chartContainer.removeEventListener('mousedown', handleContainerMouseDown);
    };
  }, [chartDomains.xDomain]);

  // Add wheel event listener using passive: false to ensure preventDefault works
  useEffect(() => {
    const chartContainer = chartRef.current;
    if (!chartContainer) return;

    const handleWheelEvent = (e: WheelEvent) => {
      // First, try to prevent default scroll behavior
      try {
        e.preventDefault();
      } catch (err) {
        // Some browsers might not allow preventDefault on wheel events
        console.log('Could not prevent default wheel behavior');
      }

      if (!chartDomains.xDomain) return;

      // Get mouse position relative to chart for zoom centering
      const rect = chartContainer.getBoundingClientRect();
      
      // Mouse position as a fraction of chart width (0 to 1)
      const mouseXPosition = (e.clientX - rect.left) / rect.width;
      
      // Calculate current domain range 
      const currentRange = chartDomains.xDomain[1] - chartDomains.xDomain[0];
      
      // Determine zoom direction and factor (use smaller values for smoother zoom)
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const newRange = currentRange * zoomFactor;
      
      // Calculate new domain while keeping the mouse position fixed
      const mouseValPosition = chartDomains.xDomain[0] + mouseXPosition * currentRange;
      const newLeft = mouseValPosition - (mouseXPosition * newRange);
      const newRight = newLeft + newRange;
      
      // Update the chart domain
      setChartDomain({
        left: newLeft,
        right: newRight
      });
      
      // Update zoom level for display
      setZoomLevel(prevZoom => prevZoom * (e.deltaY > 0 ? 0.9 : 1.1));
    };

    // Add with capture: true and passive: false to ensure we get the event first
    chartContainer.addEventListener('wheel', handleWheelEvent, { 
      passive: false,
      capture: true 
    });
    
    return () => {
      chartContainer.removeEventListener('wheel', handleWheelEvent, { 
        capture: true 
      });
    };
  }, [chartDomains.xDomain]);

  // Add button handlers for zoom in/out
  const handleZoomIn = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!chartDomains.xDomain) return
    
    const currentRange = chartDomains.xDomain[1] - chartDomains.xDomain[0]
    const centerPoint = (chartDomains.xDomain[0] + chartDomains.xDomain[1]) / 2
    const newRange = currentRange * 0.7  // More aggressive zoom in
    
    setChartDomain({
      left: centerPoint - newRange / 2,
      right: centerPoint + newRange / 2
    })
    
    setZoomLevel(prevZoom => prevZoom * 1.4)
  }

  const handleZoomOut = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!chartDomains.xDomain) return
    
    const currentRange = chartDomains.xDomain[1] - chartDomains.xDomain[0]
    const centerPoint = (chartDomains.xDomain[0] + chartDomains.xDomain[1]) / 2
    const newRange = currentRange * 1.4  // More aggressive zoom out
    
    setChartDomain({
      left: centerPoint - newRange / 2,
      right: centerPoint + newRange / 2
    })
    
    setZoomLevel(prevZoom => prevZoom * 0.7)
  }

  const handleResetZoom = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setChartDomain(null)
    setZoomLevel(1)
  }

  // Handle mouse move and up events for panning
  useEffect(() => {
    if (!isDragging || !dragStart.current) return;

    const startPosition = { ...dragStart.current }; // Create a local copy to avoid null reference

    const handleMouseMove = (e: MouseEvent) => {
      if (!chartDomains.xDomain) return;

      const chartContainer = chartRef.current;
      if (!chartContainer) return;

      const rect = chartContainer.getBoundingClientRect();
      const chartX = e.clientX - rect.left;
      const deltaX = (chartX - startPosition.x) * ((chartDomains.xDomain[1] - chartDomains.xDomain[0]) / rect.width);

      setChartDomain({
        left: chartDomains.xDomain[0] - deltaX,
        right: chartDomains.xDomain[1] - deltaX
      });

      // Update the local copy
      startPosition.x = chartX;
      startPosition.chartX = chartX;
      
      // Also update the ref if it exists
      if (dragStart.current) {
        dragStart.current = { x: chartX, chartX };
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStart.current = null;
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, chartDomains.xDomain]);

  // Add the LineChart props for the Recharts component
  const lineChartProps = {
    data: calculatePnLPoints,
    margin: {
      top: 20,
      right: 30,
      left: 10,
      bottom: 25,
    },
    // We don't need onMouseDown here anymore since we handle it on the container
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
        // Form protection wrapper to prevent the chart buttons from triggering form submission
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
          <div className="flex justify-end gap-2">
            <button 
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-xs rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#e5e5e5]"
              title="Zoom In"
              form=""
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>
            <button 
              type="button"
              onClick={handleZoomOut}
              className="p-1 text-xs rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#e5e5e5]"
              title="Zoom Out"
              form=""
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>
            <button 
              type="button"
              onClick={handleResetZoom}
              className="p-1 text-xs rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#e5e5e5]"
              title="Reset View"
              form=""
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v6h6"></path>
                <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
                <path d="M21 22v-6h-6"></path>
                <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
              </svg>
            </button>
          </div>
          <div 
            className="h-[400px] w-full relative" 
            ref={chartRef}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
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
                    value: 'Underlying Price at Expiration', 
                    position: 'bottom',
                    offset: 10,
                    fontSize: 12,
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
                    fontSize: 12,
                    fill: '#666'
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                  }}
                  formatter={(value: number) => {
                    const color = value >= 0 ? '#22c55e' : '#ef4444'; // Green for positive, red for negative
                    return [<span key="pnl-value" style={{ color }}>{`$${value.toFixed(2)}`}</span>, 'PnL at Expiration'];
                  }}
                  labelFormatter={(label) => `Price: $${label}`}
                />
                <ReferenceLine 
                  y={maxProfit} 
                  stroke="#22c55e"
                  strokeDasharray="3 3"
                  label={{ 
                    value: `Max Profit: $${maxProfit.toFixed(2)}`,
                    fill: '#22c55e',
                    fontSize: 11,
                    position: 'top'
                  }}
                />
                <ReferenceLine 
                  y={-maxLoss} 
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ 
                    value: `Max Loss: -$${maxLoss.toFixed(2)}`,
                    fill: '#ef4444',
                    fontSize: 11,
                    position: 'top'
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
          <div className="text-xs text-center text-[#666] mt-1">
            Scroll to zoom, click and drag to pan • Zoom level: {zoomLevel.toFixed(1)}x
          </div>
        </div>
      )}
    </div>
  )
}