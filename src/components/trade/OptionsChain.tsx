"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FilterIcon } from "lucide-react"
import { OptionsChainTable } from "./OptionsChainTable"
import { ParameterFilter } from "./ParameterFilter"

interface OptionParameter {
  id: string
  name: string
  visible: boolean
}

const defaultParameters: OptionParameter[] = [
  { id: "iv", name: "IV", visible: true },
  { id: "volume", name: "Volume", visible: true },
  { id: "oi", name: "OI", visible: true },
  { id: "theta", name: "Theta", visible: true },
  { id: "delta", name: "Delta", visible: true },
  { id: "bid", name: "Bid", visible: true },
  { id: "ask", name: "Ask", visible: true },
  { id: "gamma", name: "Gamma", visible: false },
  { id: "vega", name: "Vega", visible: false },
  { id: "rho", name: "Rho", visible: false }
]

export function OptionsChain() {
  const [parameters, setParameters] = useState<OptionParameter[]>(defaultParameters)
  const [showFilters, setShowFilters] = useState(false)

  const expirationDate = "February 2nd, 2025"

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl">Expiration: {expirationDate}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FilterIcon className="h-4 w-4 mr-2" />
          Parameters
        </Button>
      </div>

      {showFilters && (
        <ParameterFilter
          parameters={parameters}
          setParameters={setParameters}
        />
      )}

      <ScrollArea className="h-[600px] rounded-md border">
        <div className="overflow-x-auto">
          <OptionsChainTable
            parameters={parameters.filter(p => p.visible)}
          />
        </div>
      </ScrollArea>
    </div>
  )
} 