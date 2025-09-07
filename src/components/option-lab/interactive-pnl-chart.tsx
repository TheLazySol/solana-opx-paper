"use client"

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Chip, Slider, Button, cn } from '@heroui/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Dot
} from 'recharts';
import { Info, ZoomIn, ZoomOut, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumberWithCommas } from '@/utils/utils';

interface OptionPosition {
  quantity: number;
  strikePrice: string | number;
  premium: string | number;
  optionType: string;
  asset: string;
}

interface InteractivePnlChartProps {
  options: OptionPosition[];
  collateralProvided: number;
  leverage: number;
  assetPrice: number | null;
  proMode: boolean;
}

export function InteractivePnlChart({
  options,
  collateralProvided,
  leverage,
  assetPrice,
  proMode
}: InteractivePnlChartProps) {
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<'now' | 'expiry'>('expiry');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 200 });
  const chartRef = useRef<HTMLDivElement>(null);

  // Calculate P&L data points
  const pnlData = useMemo(() => {
    if (options.length === 0) return [];

    const option = options[0];
    const strike = Number(option.strikePrice);
    const premium = Number(option.premium);
    const quantity = Number(option.quantity);
    const isCall = option.optionType === 'call';
    
    // Dynamic price range based on zoom
    const center = assetPrice || strike;
    const range = (center * 0.5) / zoomLevel;
    const minPrice = Math.max(0, center - range);
    const maxPrice = center + range;
    const step = (maxPrice - minPrice) / 100;
    
    setPriceRange({ min: minPrice, max: maxPrice });
    
    const data = [];
    for (let price = minPrice; price <= maxPrice; price += step) {
      let pnlAtExpiry = 0;
      let pnlNow = 0;
      
      // Calculate P&L at expiry (for short position)
      if (isCall) {
        // Short call: profit when price < strike, loss when price > strike
        pnlAtExpiry = price <= strike 
          ? premium * quantity * 100 
          : (premium - (price - strike)) * quantity * 100;
      } else {
        // Short put: profit when price > strike, loss when price < strike
        pnlAtExpiry = price >= strike 
          ? premium * quantity * 100 
          : (premium - (strike - price)) * quantity * 100;
      }
      
      // Estimate current P&L (simplified - would use Black-Scholes in production)
      const timeDecay = 0.3; // 30% time decay for illustration
      if (isCall) {
        pnlNow = price <= strike 
          ? premium * quantity * 100 * timeDecay
          : (premium * timeDecay - Math.max(0, price - strike)) * quantity * 100;
      } else {
        pnlNow = price >= strike 
          ? premium * quantity * 100 * timeDecay
          : (premium * timeDecay - Math.max(0, strike - price)) * quantity * 100;
      }
      
      data.push({
        price: price,
        pnlAtExpiry: pnlAtExpiry,
        pnlNow: pnlNow,
        breakEven: 0,
        maxProfit: premium * quantity * 100,
        currentPrice: assetPrice
      });
    }
    
    return data;
  }, [options, assetPrice, zoomLevel]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
  const handleReset = () => setZoomLevel(1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const price = label;
      const pnl = selectedExpiry === 'expiry' ? payload[0].value : payload[1].value;
      const option = options[0];
      const isProfit = pnl > 0;
      
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-3 shadow-xl"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-white/60">Price:</span>
              <span className="text-sm font-medium text-white">${price.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-white/60">P&L:</span>
              <span className={cn(
                "text-sm font-bold",
                isProfit ? "text-green-400" : "text-red-400"
              )}>
                {isProfit ? '+' : ''} ${pnl.toFixed(2)}
              </span>
            </div>
            {proMode && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-white/60">ROI:</span>
                  <span className={cn(
                    "text-sm font-medium",
                    isProfit ? "text-green-400" : "text-red-400"
                  )}>
                    {collateralProvided > 0 
                      ? `${((pnl / collateralProvided) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-white/60">Status:</span>
                  <span className="text-xs font-medium text-white">
                    {option.optionType === 'call' 
                      ? price > Number(option.strikePrice) ? 'ITM' : price < Number(option.strikePrice) ? 'OTM' : 'ATM'
                      : price < Number(option.strikePrice) ? 'ITM' : price > Number(option.strikePrice) ? 'OTM' : 'ATM'}
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.price === assetPrice) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="#4a85ff" className="animate-pulse" />
          <circle cx={cx} cy={cy} r={3} fill="white" />
        </g>
      );
    }
    return null;
  };

  if (options.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white/5 rounded-lg border border-white/10">
        <p className="text-white/40">Configure your option to see P&L analysis</p>
      </div>
    );
  }

  const option = options[0];
  const strike = Number(option.strikePrice);
  const premium = Number(option.premium);
  const breakEven = option.optionType === 'call' 
    ? strike + premium 
    : strike - premium;

  return (
    <div className="space-y-4">
      {/* Chart Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={selectedExpiry === 'now' ? 'flat' : 'light'}
            onPress={() => setSelectedExpiry('now')}
            className={cn(
              "min-w-[80px]",
              selectedExpiry === 'now' 
                ? "bg-[#4a85ff]/20 text-[#4a85ff]" 
                : "text-white/60"
            )}
          >
            Current
          </Button>
          <Button
            size="sm"
            variant={selectedExpiry === 'expiry' ? 'flat' : 'light'}
            onPress={() => setSelectedExpiry('expiry')}
            className={cn(
              "min-w-[80px]",
              selectedExpiry === 'expiry' 
                ? "bg-[#5829f2]/20 text-[#5829f2]" 
                : "text-white/60"
            )}
          >
            At Expiry
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={handleZoomIn}
            className="text-white/60 hover:text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={handleZoomOut}
            className="text-white/60 hover:text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={handleReset}
            className="text-white/60 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Interactive Chart */}
      <div 
        ref={chartRef}
        className="relative h-[300px] md:h-[400px] w-full"
        onMouseMove={(e) => {
          if (chartRef.current) {
            const rect = chartRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            const price = priceRange.min + (priceRange.max - priceRange.min) * percentage;
            setHoveredPrice(price);
          }
        }}
        onMouseLeave={() => setHoveredPrice(null)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={pnlData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255,255,255,0.05)" 
              vertical={false}
            />
            
            <XAxis 
              dataKey="price"
              domain={[priceRange.min, priceRange.max]}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
            />
            
            <YAxis 
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Reference Lines */}
            <ReferenceLine 
              y={0} 
              stroke="rgba(255,255,255,0.2)" 
              strokeDasharray="5 5"
            />
            
            <ReferenceLine 
              x={strike} 
              stroke="#fbbf24" 
              strokeDasharray="5 5"
              label={{ value: "Strike", position: "top", fill: "#fbbf24", fontSize: 10 }}
            />
            
            <ReferenceLine 
              x={breakEven} 
              stroke="#8b5cf6" 
              strokeDasharray="5 5"
              label={{ value: "B/E", position: "top", fill: "#8b5cf6", fontSize: 10 }}
            />
            
            {assetPrice && (
              <ReferenceLine 
                x={assetPrice} 
                stroke="#4a85ff" 
                strokeWidth={2}
                label={{ value: "Current", position: "top", fill: "#4a85ff", fontSize: 10 }}
              />
            )}
            
            {/* P&L Lines */}
            {selectedExpiry === 'expiry' && (
              <>
                <Area
                  type="monotone"
                  dataKey="pnlAtExpiry"
                  stroke="transparent"
                  fillOpacity={1}
                  fill="url(#profitGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="pnlAtExpiry"
                  stroke="#5829f2"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: '#5829f2' }}
                />
              </>
            )}
            
            {selectedExpiry === 'now' && (
              <>
                <Area
                  type="monotone"
                  dataKey="pnlNow"
                  stroke="transparent"
                  fillOpacity={1}
                  fill="url(#profitGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="pnlNow"
                  stroke="#4a85ff"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: '#4a85ff' }}
                />
              </>
            )}
            
            {/* Current Price Indicator */}
            {assetPrice && <Dot cx={assetPrice} cy={0} r={8} fill="#4a85ff" />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#fbbf24]" />
          <span className="text-white/60">Strike: ${strike.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#8b5cf6]" />
          <span className="text-white/60">Break-Even: ${breakEven.toFixed(2)}</span>
        </div>
        {assetPrice && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-[#4a85ff] rounded-full animate-pulse" />
            <span className="text-white/60">Current: ${assetPrice.toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-green-400" />
          <span className="text-green-400">Max Profit: ${formatNumberWithCommas(premium * options[0].quantity * 100)}</span>
        </div>
      </div>

      {/* Interactive Price Slider (Pro Mode) */}
      {proMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60">Simulate Price Movement</span>
            {hoveredPrice && (
              <Chip size="sm" variant="flat" className="bg-[#4a85ff]/20 text-[#4a85ff]">
                ${hoveredPrice.toFixed(2)}
              </Chip>
            )}
          </div>
          <Slider
            value={hoveredPrice || assetPrice || strike}
            onChange={(value) => setHoveredPrice(value as number)}
            minValue={priceRange.min}
            maxValue={priceRange.max}
            step={(priceRange.max - priceRange.min) / 100}
            className="w-full"
            classNames={{
              track: "bg-white/10",
              filler: "bg-gradient-to-r from-[#4a85ff] to-[#5829f2]",
              thumb: "bg-white border-2 border-[#4a85ff]"
            }}
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>${priceRange.min.toFixed(0)}</span>
            <span>${((priceRange.min + priceRange.max) / 2).toFixed(0)}</span>
            <span>${priceRange.max.toFixed(0)}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
