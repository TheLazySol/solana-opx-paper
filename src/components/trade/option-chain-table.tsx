import { FC } from 'react'
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
  callPrice: number
  callVolume: number
  callOpenInterest: number
  callGreeks: OptionGreeks
  // Put side
  putPrice: number
  putVolume: number
  putOpenInterest: number
  putGreeks: OptionGreeks
}

export const OptionChainTable: FC = () => {
  // This will be populated with real data later
  const mockData: OptionContract[] = [
    {
      strike: 0,
      expiry: "2024-12-31",
      callPrice: 0,
      callVolume: 0,
      callOpenInterest: 0,
      callGreeks: {
        delta: 0,
        theta: 0,
        gamma: 0,
        vega: 0,
        rho: 0
      },
      putPrice: 0,
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
            <TableHead className="text-center w-[85px]">Price</TableHead>
            
            {/* Strike price (center) */}
            <TableHead className="text-center font-bold bg-muted/20 w-[100px]">Strike</TableHead>
            
            {/* Put side */}
            <TableHead className="text-center w-[85px]">Price</TableHead>
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
              <TableCell className="text-center">{option.callGreeks.rho.toFixed(3)}</TableCell>
              <TableCell className="text-center">{option.callGreeks.vega.toFixed(3)}</TableCell>
              <TableCell className="text-center">{option.callGreeks.gamma.toFixed(3)}</TableCell>
              <TableCell className="text-center">{option.callGreeks.theta.toFixed(3)}</TableCell>
              <TableCell className="text-center">{option.callGreeks.delta.toFixed(2)}</TableCell>
              <TableCell className="text-center">{option.callOpenInterest}</TableCell>
              <TableCell className="text-center">{option.callVolume}</TableCell>
              <TableCell className="text-center font-medium">
                ${option.callPrice.toFixed(2)}
              </TableCell>
              
              {/* Strike price (center) */}
              <TableCell className="text-center font-bold bg-muted/20">
                ${option.strike}
              </TableCell>
              
              {/* Put side */}
              <TableCell className="text-center font-medium">
                ${option.putPrice.toFixed(2)}
              </TableCell>
              <TableCell className="text-center">{option.putVolume}</TableCell>
              <TableCell className="text-center">{option.putOpenInterest}</TableCell>
              <TableCell className="text-center">{option.putGreeks.delta.toFixed(2)}</TableCell>
              <TableCell className="text-center">{option.putGreeks.theta.toFixed(3)}</TableCell>
              <TableCell className="text-center">{option.putGreeks.gamma.toFixed(3)}</TableCell>
              <TableCell className="text-center">{option.putGreeks.vega.toFixed(3)}</TableCell>
              <TableCell className="text-center">{option.putGreeks.rho.toFixed(3)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 