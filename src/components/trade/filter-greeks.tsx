import { FC, useState } from 'react'
import { Filter, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface GreekFilters {
  delta: boolean
  theta: boolean
  gamma: boolean
  vega: boolean
  rho: boolean
  oa: boolean
  oi: boolean
  volume: boolean
}

interface FilterGreeksProps {
  filters: GreekFilters
  onFiltersChange: (filters: GreekFilters) => void
}

export const FilterGreeks: FC<FilterGreeksProps> = ({
  filters = {
    delta: true,
    theta: true,
    gamma: false,
    vega: false,
    rho: false,
    oa: false,
    oi: false,
    volume: true
  },
  onFiltersChange
}) => {
  const [open, setOpen] = useState(false)
  
  const toggleFilter = (greek: keyof GreekFilters, e: React.MouseEvent) => {
    e.preventDefault()
    onFiltersChange({
      ...filters,
      [greek]: !filters[greek]
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="w-10 p-0">
          <Filter className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Toggle Greeks & Stats</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={(e) => toggleFilter('delta', e)} 
          className="flex items-center justify-between cursor-pointer"
          onSelect={(e) => e.preventDefault()}
        >
          <span>Delta (Δ)</span>
          {filters.delta && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={(e) => toggleFilter('theta', e)} 
          className="flex items-center justify-between cursor-pointer"
          onSelect={(e) => e.preventDefault()}
        >
          <span>Theta (θ)</span>
          {filters.theta && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={(e) => toggleFilter('gamma', e)} 
          className="flex items-center justify-between cursor-pointer"
          onSelect={(e) => e.preventDefault()}
        >
          <span>Gamma (γ)</span>
          {filters.gamma && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={(e) => toggleFilter('vega', e)} 
          className="flex items-center justify-between cursor-pointer"
          onSelect={(e) => e.preventDefault()}
        >
          <span>Vega (ν)</span>
          {filters.vega && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={(e) => toggleFilter('rho', e)} 
          className="flex items-center justify-between cursor-pointer"
          onSelect={(e) => e.preventDefault()}
        >
          <span>Rho (ρ)</span>
          {filters.rho && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={(e) => toggleFilter('oa', e)} 
          className="flex items-center justify-between cursor-pointer"
          onSelect={(e) => e.preventDefault()}
        >
          <span>Options Available</span>
          {filters.oa && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={(e) => toggleFilter('volume', e)} 
          className="flex items-center justify-between cursor-pointer"
          onSelect={(e) => e.preventDefault()}
        >
          <span>Volume</span>
          {filters.volume && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={(e) => toggleFilter('oi', e)} 
          className="flex items-center justify-between cursor-pointer"
          onSelect={(e) => e.preventDefault()}
        >
          <span>Open Interest</span>
          {filters.oi && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 