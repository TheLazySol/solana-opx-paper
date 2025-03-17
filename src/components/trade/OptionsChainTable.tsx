"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { OptionOrder, OptionSide, OrderType } from "@/types/options/orderTypes"

// Interface representing a single option with call and put data
interface Option {
  strike: number
  call: {
    iv: number // Implied volatility
    volume: number // Trading volume
    oi: number // Open interest
    theta: number // Time decay
    delta: number // Price sensitivity to underlying
    bid: number // Highest buy price
    ask: number // Lowest sell price
  }
  put: {
    iv: number
    volume: number 
    oi: number
    theta: number
    delta: number
    bid: number
    ask: number
  }
}

// Props for the OptionsChainTable component
interface OptionsChainTableProps {
  parameters: { id: string; name: string; visible: boolean }[] // Column configuration
  onOrderCreate: (order: Omit<OptionOrder, 'publicKey' | 'timestamp' | 'owner' | 'status'>) => void // Callback when order created
  marketPrice: number // Current market price of underlying asset
  options: Option[] // Array of option data
  assetType: 'SOL' | 'LABS' // Type of underlying asset
  selectedExpiry: string // Selected expiration date
}

export function OptionsChainTable({ 
  parameters, 
  onOrderCreate, 
  marketPrice = 24.54,
  options = [], 
  assetType = 'SOL',
  selectedExpiry
}: OptionsChainTableProps) {
  // Determines if a market price line should be shown between strike prices
  const shouldShowMarketPriceLine = (strike: number, marketPrice: number, options: Option[]) => {
    const allStrikes = options.map(o => o.strike).sort((a, b) => a - b)
    
    if (allStrikes.length === 0) return false
    
    // Find the strike price that's just below the market price
    return strike === Math.max(...allStrikes.filter(s => s < marketPrice))
  }

  // Sort strikes and add market price line flag
  const strikes = [...options]
    .sort((a, b) => a.strike - b.strike)
    .map(option => ({
      ...option,
      isMarketPrice: shouldShowMarketPriceLine(option.strike, marketPrice, options)
    }))

  // Show empty state if no options available
  if (strikes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-muted-foreground">
        No options available. Mint an option to get started.
      </div>
    )
  }

  // Helper functions to determine if options are in-the-money
  const isCallITM = (strike: number) => strike < marketPrice;
  const isPutITM = (strike: number) => strike > marketPrice;

  // Function to reorder Call side parameters in specific order
  const getCallParameters = (params: typeof parameters) => {
    const orderMap = {
      'iv': 0,
      'volume': 1,
      'oi': 2,
      'rho': 3,
      'vega': 4,
      'gamma': 5,
      'theta': 6,
      'delta': 7,
      'bid': 8,
      'ask': 9
    };

    return [...params].sort((a, b) => 
      (orderMap[a.id as keyof typeof orderMap] ?? 0) - 
      (orderMap[b.id as keyof typeof orderMap] ?? 0)
    );
  };

  // Function to reorder Put side parameters in specific order
  const getPutParameters = (params: typeof parameters) => {
    const orderMap = {
      'bid': 0,
      'ask': 1,
      'delta': 2,
      'theta': 3,
      'gamma': 4,
      'vega': 5,
      'rho': 6,
      'oi': 7,
      'volume': 8,
      'iv': 9
    };

    return [...params].sort((a, b) => 
      (orderMap[a.id as keyof typeof orderMap] ?? 0) - 
      (orderMap[b.id as keyof typeof orderMap] ?? 0)
    );
  };

  // Returns tooltip content for each column header
  const getColumnHeader = (param: { id: string; name: string }) => {
    switch (param.id) {
      case 'iv':
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger className="text-sm border-b border-dotted border-muted-foreground hover:border-primary cursor-help">
                {param.name}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Implied Volatility: The expected change in value +/- of the option by exp date.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'volume':
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger className="text-sm border-b border-dotted border-muted-foreground hover:border-primary cursor-help">
                {param.name}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Amount of contracts traded per the associated strike price.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'oi':
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger className="text-sm border-b border-dotted border-muted-foreground hover:border-primary cursor-help">
                {param.name}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Open Interest: The amount of options that are in a current position and have not been exercised yet.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'theta':
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger className="text-sm border-b border-dotted border-muted-foreground hover:border-primary cursor-help">
                {param.name}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Time Decay: How much value the option contract loses every 24 hours.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'delta':
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger className="text-sm border-b border-dotted border-muted-foreground hover:border-primary cursor-help">
                {param.name}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Amount an option&apos;s price changes for a $1 change in the underlying asset.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'rho':
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger className="text-sm border-b border-dotted border-muted-foreground hover:border-primary cursor-help">
                {param.name}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Interest Rate Sensitivity: How much the option&apos;s price changes for a 1% change in interest rates.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'vega':
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger className="text-sm border-b border-dotted border-muted-foreground hover:border-primary cursor-help">
                {param.name}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Volatility Sensitivity: How much the option&apos;s price changes for a 1% change in implied volatility.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'gamma':
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger className="text-sm border-b border-dotted border-muted-foreground hover:border-primary cursor-help">
                {param.name}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Delta Sensitivity: How much the option&apos;s delta changes for a $1 change in the underlying asset.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'bid':
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger className="text-sm border-b border-dotted border-muted-foreground hover:border-primary cursor-help">
                {param.name}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  The highest a buyer is willing to pay for an option contract.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'ask':
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger className="text-sm border-b border-dotted border-muted-foreground hover:border-primary cursor-help">
                {param.name}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  The lowest a seller is willing to sell an option contract.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return param.name;
    }
  };

  // Handles click on bid/ask prices to create orders
  const handlePriceClick = (
    price: number,
    strike: number,
    orderType: OrderType,
    optionSide: OptionSide
  ) => {
    onOrderCreate({
      strike,
      price,
      type: orderType,
      optionSide,
      size: 1,
      bidPrice: price * 0.95, // Set bid 5% below price
      askPrice: price * 1.05, // Set ask 5% above price
      expirationDate: selectedExpiry
    })
  }

  // Formats numeric values for display
  const formatValue = (value: number | undefined, isVolume = false) => {
    if (typeof value !== 'number' || value === 0) return "-"
    // Format volume as whole number, other values with 2 decimal places
    return isVolume ? Math.round(value).toString() : value.toFixed(2)
  }

  return (
    <table className="w-full">
      <thead>
        {/* Parameters Row */}
        <tr className="bg-muted/50">
          {/* Call Parameters */}
          {getCallParameters(parameters).map(param => (
            <th key={`call-${param.id}`} className="p-2 text-sm">
              {getColumnHeader(param)}
            </th>
          ))}
          <th className="p-2 text-sm font-bold bg-muted/50 dark:bg-muted/50 bg-gray-100">Strike</th>
          {/* Put Parameters */}
          {getPutParameters(parameters).map(param => (
            <th key={`put-${param.id}`} className="p-2 text-sm">
              {getColumnHeader(param)}
            </th>
          ))}
        </tr>
        
        {/* Calls/Puts Label Row */}
        <tr className="bg-muted/50 border-t border-border/50">
          {/* Calls Label */}
          <th 
            colSpan={getCallParameters(parameters).length} 
            className="py-1 px-2 text-xs font-medium text-center text-[#4a85ff]"
          >
            Calls
          </th>
          {/* Strike Column */}
          <th className="py-1 bg-gray-300 dark:bg-muted/80" />
          {/* Puts Label */}
          <th 
            colSpan={getPutParameters(parameters).length} 
            className="py-1 px-2 text-xs font-medium text-center text-[#4a85ff]"
          >
            Puts
          </th>
        </tr>
      </thead>
      <tbody>
        {strikes.map((row, i) => (
          <>
            <tr key={i} className="border-t dark:hover:bg-muted/70 hover:bg-gray-100">
              {/* Call Side */}
              {getCallParameters(parameters).map(param => (
                <td 
                  key={`call-${param.id}`} 
                  className={`p-2 text-sm ${
                    isCallITM(row.strike) 
                      ? 'dark:bg-muted/55 bg-gray-200/90' 
                      : ''
                  } ${
                    param.id === 'bid'
                      ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400' 
                      : param.id === 'ask'
                      ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 text-rose-600 dark:text-rose-400'
                      : ''
                  }`}
                  onClick={() => {
                    if (param.id === 'bid') {
                      handlePriceClick(row.call.bid, row.strike, 'buy', 'call')
                    } else if (param.id === 'ask') {
                      handlePriceClick(row.call.ask, row.strike, 'sell', 'call')
                    }
                  }}
                >
                  {param.id === 'iv' 
                    ? formatValue(row.call.iv) + '%' 
                    : param.id === 'volume'
                    ? formatValue(row.call.volume, true)
                    : formatValue(row.call[param.id as keyof typeof row.call])
                  }
                </td>
              ))}
              {/* Strike Price */}
              <td className="p-2 text-sm font-bold text-center dark:bg-muted/80 bg-gray-300">
                ${row.strike.toFixed(2)}
              </td>
              {/* Put Side */}
              {getPutParameters(parameters).map(param => (
                <td 
                  key={`put-${param.id}`} 
                  className={`p-2 text-sm ${
                    isPutITM(row.strike) 
                      ? 'dark:bg-muted/55 bg-gray-200/90' 
                      : ''
                  } ${
                    param.id === 'bid'
                      ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400' 
                      : param.id === 'ask'
                      ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 text-rose-600 dark:text-rose-400'
                      : ''
                  }`}
                  onClick={() => {
                    if (param.id === 'bid') {
                      handlePriceClick(row.put.bid, row.strike, 'buy', 'put')
                    } else if (param.id === 'ask') {
                      handlePriceClick(row.put.ask, row.strike, 'sell', 'put')
                    }
                  }}
                >
                  {param.id === 'iv' 
                    ? formatValue(row.put.iv) + '%' 
                    : param.id === 'volume'
                    ? formatValue(row.put.volume, true)
                    : formatValue(row.put[param.id as keyof typeof row.put])
                  }
                </td>
              ))}
            </tr>
            {/* Market Price Line */}
            {row.isMarketPrice && (
              <tr className="market-price-row">
                <td colSpan={parameters.length * 2 + 1} className="p-0">
                  <div className="relative h-[1px]">
                    <div 
                      className="absolute w-full border-t-2 border-blue-500" 
                    />
                    <div 
                      className="absolute right-4 bg-background px-2 text-xs text-blue-500"
                      style={{ top: '-10px' }}
                    >
                      Market Price: ${marketPrice.toFixed(2)}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </>
        ))}
      </tbody>
    </table>
  )
} 