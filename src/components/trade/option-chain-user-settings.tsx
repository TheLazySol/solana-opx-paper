import { FC, useState, useEffect } from 'react'
import { Check, Save } from 'lucide-react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection, Switch } from '@heroui/react'
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
  useGreekSymbols?: boolean
  onGreekSymbolsChange?: (useSymbols: boolean) => void
}

// Local storage keys for saved preferences
const GREEK_FILTERS_STORAGE_KEY = 'optionChainGreekFilters'
const GREEK_SYMBOLS_STORAGE_KEY = 'optionChainGreekSymbols'

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
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      return
    }
    localStorage.setItem(GREEK_FILTERS_STORAGE_KEY, JSON.stringify(filters))
  } catch (error) {
    console.error('Failed to save filter preferences:', error)
  }
}

const loadFiltersFromStorage = (): GreekFilters | null => {
  try {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      return null
    }
    const saved = localStorage.getItem(GREEK_FILTERS_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load filter preferences:', error)
  }
  return null
}

const saveGreekSymbolsToStorage = (showSymbols: boolean): void => {
  try {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      return
    }
    localStorage.setItem(GREEK_SYMBOLS_STORAGE_KEY, JSON.stringify(showSymbols))
  } catch (error) {
    console.error('Failed to save Greek symbols preference:', error)
  }
}

const loadGreekSymbolsFromStorage = (): boolean => {
  try {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      return true // Default to showing symbols
    }
    const saved = localStorage.getItem(GREEK_SYMBOLS_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load Greek symbols preference:', error)
  }
  return true // Default to showing symbols
}

// Export the helper functions for use in parent components
export { loadFiltersFromStorage, DEFAULT_FILTERS }

export const FilterGreeks: FC<FilterGreeksProps> = ({
  filters = DEFAULT_FILTERS,
  onFiltersChange,
  useGreekSymbols,
  onGreekSymbolsChange
}) => {
  const [open, setOpen] = useState(false)
  const [internalShowGreekSymbols, setInternalShowGreekSymbols] = useState(true)

  // Use external state if provided, otherwise use internal state
  const showGreekSymbols = useGreekSymbols !== undefined ? useGreekSymbols : internalShowGreekSymbols
  const setShowGreekSymbols = onGreekSymbolsChange || setInternalShowGreekSymbols

  // Load Greek symbols preference on mount (only for internal state)
  useEffect(() => {
    if (useGreekSymbols === undefined) {
      const savedPreference = loadGreekSymbolsFromStorage()
      setInternalShowGreekSymbols(savedPreference)
    }
  }, [useGreekSymbols])

  // Save Greek symbols preference when it changes (only for internal state)
  useEffect(() => {
    if (useGreekSymbols === undefined) {
      saveGreekSymbolsToStorage(internalShowGreekSymbols)
    }
  }, [internalShowGreekSymbols, useGreekSymbols])
  
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
    { key: 'delta', label: showGreekSymbols ? 'Delta (Δ)' : 'Delta', isSelected: filters.delta },
    { key: 'theta', label: showGreekSymbols ? 'Theta (θ)' : 'Theta', isSelected: filters.theta },
    { key: 'gamma', label: showGreekSymbols ? 'Gamma (γ)' : 'Gamma', isSelected: filters.gamma },
    { key: 'vega', label: showGreekSymbols ? 'Vega (ν)' : 'Vega', isSelected: filters.vega },
    { key: 'rho', label: showGreekSymbols ? 'Rho (ρ)' : 'Rho', isSelected: filters.rho },
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
          aria-label="Settings for Greeks and Statistics"
        >
          <Cog6ToothIcon className="h-4 w-4" />
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
        
        <DropdownSection title="Display Options" showDivider>
          <DropdownItem 
            key="greek-symbols-toggle"
            textValue="Greek Symbols"
            className="cursor-default"
          >
            <div className="flex items-center justify-between w-full">
              <span>Greek Symbols</span>
              <Switch
                size="sm"
                isSelected={showGreekSymbols}
                onValueChange={setShowGreekSymbols}
                aria-label="Toggle Greek symbols display"
              />
            </div>
          </DropdownItem>
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