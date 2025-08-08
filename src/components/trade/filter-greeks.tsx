import { FC, useState } from 'react'
import { Filter, Check } from 'lucide-react'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection } from '@heroui/react'

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
  
  const toggleFilter = (greek: keyof GreekFilters) => {
    onFiltersChange({
      ...filters,
      [greek]: !filters[greek]
    })
  }

  const greekItems = [
    { key: 'delta', label: 'Delta (Δ)', isSelected: filters.delta },
    { key: 'theta', label: 'Theta (θ)', isSelected: filters.theta },
    { key: 'gamma', label: 'Gamma (γ)', isSelected: filters.gamma },
    { key: 'vega', label: 'Vega (ν)', isSelected: filters.vega },
    { key: 'rho', label: 'Rho (ρ)', isSelected: filters.rho },
  ]

  const statsItems = [
    { key: 'volume', label: 'Volume', isSelected: filters.volume },
    { key: 'oa', label: 'Options Available', isSelected: filters.oa },
    { key: 'oi', label: 'Open Interest', isSelected: filters.oi },
  ]

  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <DropdownTrigger>
        <Button 
          variant="bordered" 
          size="sm" 
          isIconOnly
          className="w-10 p-0"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu 
        aria-label="Toggle Greeks & Stats"
        closeOnSelect={false}
        onAction={(key) => toggleFilter(key as keyof GreekFilters)}
        className="w-[200px]"
      >
        <DropdownSection title="Greeks" showDivider>
          {greekItems.map((item) => (
            <DropdownItem 
              key={item.key}
              endContent={item.isSelected ? <Check className="h-4 w-4" /> : null}
            >
              {item.label}
            </DropdownItem>
          ))}
        </DropdownSection>
        
        <DropdownSection title="Stats">
          {statsItems.map((item) => (
            <DropdownItem 
              key={item.key}
              endContent={item.isSelected ? <Check className="h-4 w-4" /> : null}
            >
              {item.label}
            </DropdownItem>
          ))}
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  )
} 