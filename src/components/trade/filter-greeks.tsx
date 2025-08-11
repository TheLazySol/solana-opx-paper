import { FC, useState, useEffect } from 'react'
import { Filter, Check, Save } from 'lucide-react'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection } from '@heroui/react'
import { toast } from "@/hooks/useToast"

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

// Local storage key for saved preferences
const GREEK_FILTERS_STORAGE_KEY = 'optionChainGreekFilters'

// Default filter state
const DEFAULT_FILTERS: GreekFilters = {
  delta: true,
  theta: true,
  gamma: false,
  vega: false,
  rho: false,
  oa: false,
  oi: false,
  volume: true
}

// Helper functions for localStorage
const saveFiltersToStorage = (filters: GreekFilters): void => {
  try {
    localStorage.setItem(GREEK_FILTERS_STORAGE_KEY, JSON.stringify(filters))
  } catch (error) {
    console.error('Failed to save filter preferences:', error)
  }
}

const loadFiltersFromStorage = (): GreekFilters | null => {
  try {
    const saved = localStorage.getItem(GREEK_FILTERS_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load filter preferences:', error)
  }
  return null
}

// Export the helper functions for use in parent components
export { loadFiltersFromStorage, DEFAULT_FILTERS }

export const FilterGreeks: FC<FilterGreeksProps> = ({
  filters = DEFAULT_FILTERS,
  onFiltersChange
}) => {
  const [open, setOpen] = useState(false)
  
  const toggleFilter = (greek: keyof GreekFilters) => {
    onFiltersChange({
      ...filters,
      [greek]: !filters[greek]
    })
  }

  const handleSavePreferences = () => {
    saveFiltersToStorage(filters)
    toast({
      title: "Preferences saved",
      description: "Your filter preferences have been saved successfully.",
      variant: "default",
    })
    setOpen(false)
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
        
        <DropdownSection title="Stats" showDivider>
          {statsItems.map((item) => (
            <DropdownItem 
              key={item.key}
              endContent={item.isSelected ? <Check className="h-4 w-4" /> : null}
            >
              {item.label}
            </DropdownItem>
          ))}
        </DropdownSection>
        
        <DropdownSection title="Preferences">
          <DropdownItem 
            key="save-preferences"
            onPress={handleSavePreferences}
            startContent={<Save className="h-4 w-4" />}
            className="text-blue-400 hover:text-blue-300"
          >
            Save Current Settings
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  )
} 