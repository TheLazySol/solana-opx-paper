"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ChevronDown } from "lucide-react"
import { OptionsChainTable } from "./OptionsChainTable"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

interface OptionParameter {
  id: string
  name: string
  visible: boolean
  required?: boolean
}

const defaultParameters: OptionParameter[] = [
  { id: "bid", name: "Bid", visible: true, required: true },
  { id: "ask", name: "Ask", visible: true, required: true },
  { id: "volume", name: "Volume", visible: true, required: true },
  { id: "oi", name: "OI", visible: true },
  { id: "iv", name: "IV", visible: true },
  { id: "delta", name: "Delta", visible: true },
  { id: "theta", name: "Theta", visible: true },
  { id: "gamma", name: "Gamma", visible: false },
  { id: "vega", name: "Vega", visible: false },
  { id: "rho", name: "Rho", visible: false }
]

export function OptionsChain() {
  const [parameters, setParameters] = useState<OptionParameter[]>(defaultParameters)

  const toggleParameter = (id: string) => {
    const parameter = parameters.find(p => p.id === id)
    if (parameter?.required) return // Don't toggle if required

    setParameters(
      parameters.map(param =>
        param.id === id ? { ...param, visible: !param.visible } : param
      )
    )
  }

  const expirationDate = "February 2nd, 2025"

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl">Expiration: {expirationDate}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Parameters
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px] p-4">
            <div className="grid gap-3">
              {parameters.map(param => (
                <div 
                  key={param.id} 
                  className={`flex items-center space-x-2 ${param.required ? 'opacity-50' : ''}`}
                >
                  <Checkbox
                    id={param.id}
                    checked={param.visible}
                    disabled={param.required}
                    onCheckedChange={() => toggleParameter(param.id)}
                  />
                  <label
                    htmlFor={param.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {param.name}
                  </label>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative border rounded-md">
        <ScrollArea className="h-[600px] w-full">
          <div className="min-w-[800px]">
            <OptionsChainTable parameters={parameters.filter(p => p.visible)} />
          </div>
          <ScrollBar orientation="vertical" />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  )
} 