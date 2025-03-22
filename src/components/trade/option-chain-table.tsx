import { FC, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface OptionGreeks {
  delta: number
  theta: number
  gamma: number
  vega: number
  rho: number
}

interface OptionContract {
  strike: number
  expiry: string
  // Call side
  callBid: number
  callAsk: number
  callVolume: number
  callOpenInterest: number
  callGreeks: OptionGreeks
  // Put side
  putBid: number
  putAsk: number
  putVolume: number
  putOpenInterest: number
  putGreeks: OptionGreeks
}

interface SelectedOption {
  index: number
  side: 'call' | 'put'
  type: 'bid' | 'ask'
}

interface OptionChainTableProps {
  assetId?: string
  expirationDate?: string | null
}

export const OptionChainTable: FC<OptionChainTableProps> = ({ 
  assetId,
  expirationDate 
}) => {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([])
  const [hoveredPrice, setHoveredPrice] = useState<{index: number, side: 'call' | 'put', type: 'bid' | 'ask'} | null>(null)

  // This will be populated with real data later
  // In a real implementation, we would filter this data based on assetId and expirationDate
  const mockData: OptionContract[] = [
    {
      strike: 0,
      expiry: expirationDate || "2024-12-31",
      callBid: 0,
      callAsk: 0,
      callVolume: 0,
      callOpenInterest: 0,
      callGreeks: {
        delta: 0,
        theta: 0,
        gamma: 0,
        vega: 0,
        rho: 0
      },
      putBid: 0,
      putAsk: 0,
      putVolume: 0,
      putOpenInterest: 0,
      putGreeks: {
        delta: 0,
        theta: 0,
        gamma: 0,
        vega: 0,
        rho: 0
      }
    }
  ]

  const handlePriceClick = (index: number, side: 'call' | 'put', type: 'bid' | 'ask') => {
    const newOption = { index, side, type }
    
    setSelectedOptions(prev => {
      // Check if this option is already selected
      const existingIndex = prev.findIndex(
        opt => opt.index === index && opt.side === side && opt.type === type
      )
      
      if (existingIndex >= 0) {
        // Remove if already selected (toggle off)
        return prev.filter((_, i) => i !== existingIndex)
      } else {
        // First remove any other selection for the same index and side (different type)
        const filteredOptions = prev.filter(
          opt => !(opt.index === index && opt.side === side && opt.type !== type)
        )
        
        // Then add the new selection
        return [...filteredOptions, newOption]
      }
    })
  }

  const isOptionSelected = (index: number, side: 'call' | 'put', type: 'bid' | 'ask') => {
    return selectedOptions.some(
      opt => opt.index === index && opt.side === side && opt.type === type
    )
  }

  return (
    <div className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
      transition-all duration-300 hover:bg-transparent overflow-hidden shadow-lg rounded-lg p-4">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {/* Call side */}
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">ρ</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Rho - Sensitivity to interest rate changes
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">ν</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Vega - Sensitivity to volatility changes
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">γ</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Gamma - Rate of change in Delta
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">θ</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Theta - Time decay rate
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">Δ</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Delta - Price change sensitivity
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">OI</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Open Interest - Total open contracts
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">Vol</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Volume - Contracts traded today
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">Price</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    <div className="text-center">
                      <div className="text-green-500">Bid</div>
                      <div className="text-red-500">Ask</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            
            {/* Strike price (center) */}
            <TableHead className="text-center font-bold bg-muted/20 w-[100px]">Strike</TableHead>
            
            {/* Put side */}
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">Price</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    <div className="text-center">
                      <div className="text-green-500">Bid</div>
                      <div className="text-red-500">Ask</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">Vol</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Volume - Contracts traded today
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">OI</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Open Interest - Total open contracts
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">Δ</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Delta - Price change sensitivity
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">θ</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Theta - Time decay rate
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">γ</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Gamma - Rate of change in Delta
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">ν</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Vega - Sensitivity to volatility changes
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-center w-[85px]">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dotted decoration-neutral-400">ρ</TooltipTrigger>
                  <TooltipContent className="backdrop-blur-sm bg-white/10 dark:bg-black/50 border border-white/20 text-white">
                    Rho - Sensitivity to interest rate changes
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockData.map((option, index) => (
            <TableRow 
              key={index}
              className={cn(
                "hover:bg-muted/5 transition-colors",
                index % 2 === 0 ? "bg-transparent" : "bg-muted/5"
              )}
            >
              {/* Call side */}
              <TableCell className="text-center">
                {option.callGreeks.rho.toFixed(3)}
              </TableCell>
              <TableCell className="text-center">
                {option.callGreeks.vega.toFixed(3)}
              </TableCell>
              <TableCell className="text-center">
                {option.callGreeks.gamma.toFixed(3)}
              </TableCell>
              <TableCell className="text-center">
                {option.callGreeks.theta.toFixed(3)}
              </TableCell>
              <TableCell className="text-center">
                {option.callGreeks.delta.toFixed(2)}
              </TableCell>
              <TableCell className="text-center">
                {option.callOpenInterest}
              </TableCell>
              <TableCell className="text-center">
                {option.callVolume}
              </TableCell>
              <TableCell className="text-center font-medium">
                <div className="flex flex-col">
                  <button
                    onClick={() => handlePriceClick(index, 'call', 'bid')}
                    onMouseEnter={() => setHoveredPrice({ index, side: 'call', type: 'bid' })}
                    onMouseLeave={() => setHoveredPrice(null)}
                    className={cn(
                      "text-green-500 hover:text-green-400 transition-colors px-2 py-0.5 rounded",
                      (hoveredPrice?.index === index && 
                       hoveredPrice?.side === 'call' && 
                       hoveredPrice?.type === 'bid') && "bg-green-500/10",
                      isOptionSelected(index, 'call', 'bid') && "bg-green-500/20"
                    )}
                  >
                    {option.callBid.toFixed(2)}
                  </button>
                  <button
                    onClick={() => handlePriceClick(index, 'call', 'ask')}
                    onMouseEnter={() => setHoveredPrice({ index, side: 'call', type: 'ask' })}
                    onMouseLeave={() => setHoveredPrice(null)}
                    className={cn(
                      "text-red-500 hover:text-red-400 transition-colors px-2 py-0.5 rounded",
                      (hoveredPrice?.index === index && 
                       hoveredPrice?.side === 'call' && 
                       hoveredPrice?.type === 'ask') && "bg-red-500/10",
                      isOptionSelected(index, 'call', 'ask') && "bg-red-500/20"
                    )}
                  >
                    {option.callAsk.toFixed(2)}
                  </button>
                </div>
              </TableCell>
              
              {/* Strike price (center) */}
              <TableCell className="text-center font-bold bg-muted/20">
                ${option.strike}
              </TableCell>
              
              {/* Put side */}
              <TableCell className="text-center font-medium">
                <div className="flex flex-col">
                  <button
                    onClick={() => handlePriceClick(index, 'put', 'bid')}
                    onMouseEnter={() => setHoveredPrice({ index, side: 'put', type: 'bid' })}
                    onMouseLeave={() => setHoveredPrice(null)}
                    className={cn(
                      "text-green-500 hover:text-green-400 transition-colors px-2 py-0.5 rounded",
                      (hoveredPrice?.index === index && 
                       hoveredPrice?.side === 'put' && 
                       hoveredPrice?.type === 'bid') && "bg-green-500/10",
                      isOptionSelected(index, 'put', 'bid') && "bg-green-500/20"
                    )}
                  >
                    {option.putBid.toFixed(2)}
                  </button>
                  <button
                    onClick={() => handlePriceClick(index, 'put', 'ask')}
                    onMouseEnter={() => setHoveredPrice({ index, side: 'put', type: 'ask' })}
                    onMouseLeave={() => setHoveredPrice(null)}
                    className={cn(
                      "text-red-500 hover:text-red-400 transition-colors px-2 py-0.5 rounded",
                      (hoveredPrice?.index === index && 
                       hoveredPrice?.side === 'put' && 
                       hoveredPrice?.type === 'ask') && "bg-red-500/10",
                      isOptionSelected(index, 'put', 'ask') && "bg-red-500/20"
                    )}
                  >
                    {option.putAsk.toFixed(2)}
                  </button>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {option.putVolume}
              </TableCell>
              <TableCell className="text-center">
                {option.putOpenInterest}
              </TableCell>
              <TableCell className="text-center">
                {option.putGreeks.delta.toFixed(2)}
              </TableCell>
              <TableCell className="text-center">
                {option.putGreeks.theta.toFixed(3)}
              </TableCell>
              <TableCell className="text-center">
                {option.putGreeks.gamma.toFixed(3)}
              </TableCell>
              <TableCell className="text-center">
                {option.putGreeks.vega.toFixed(3)}
              </TableCell>
              <TableCell className="text-center">
                {option.putGreeks.rho.toFixed(3)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 