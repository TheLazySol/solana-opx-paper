import { FC, useState, useCallback, useRef } from 'react'
import { OptionChainTable } from './option-chain-table'
import { OptionChainUtils } from './option-chain-utils'
import { GreekFilters } from './filter-greeks'
import { SelectedOption } from './option-data'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface OptionChainControlsProps {
  assetId: string
  onOptionsChange?: (options: SelectedOption[]) => void
  selectedOptions?: SelectedOption[]
  onOrderPlaced?: () => void
}

export const OptionChainControls: FC<OptionChainControlsProps> = ({ 
  assetId,
  onOptionsChange,
  selectedOptions = [],
  onOrderPlaced
}) => {
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(null)
  const [greekFilters, setGreekFilters] = useState<GreekFilters>({
    delta: true,
    theta: true,
    gamma: false,
    vega: false,
    rho: false,
    oa: true,
    oi: true,
    volume: true
  })
  const [useGreekSymbols, setUseGreekSymbols] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const optionChainTableRef = useRef<{ refreshVolumes: () => void } | null>(null)

  // Handle expiration date selection change
  const handleExpirationChange = useCallback((expiration: string) => {
    setSelectedExpiration(expiration)
  }, [])

  // Handle greek filters change
  const handleGreekFiltersChange = useCallback((filters: GreekFilters) => {
    setGreekFilters(filters)
  }, [])

  // Handle selected options change
  const handleOptionsChange = useCallback((options: SelectedOption[]) => {
    if (onOptionsChange) {
      onOptionsChange(options)
    }
  }, [onOptionsChange])

  // Handle order placed event
  const handleOrderPlaced = useCallback(() => {
    // Increment refresh trigger to force chain table to regenerate data
    setRefreshTrigger(prev => prev + 1)
    
    // If the parent component needs to know about the order placement
    if (onOrderPlaced) {
      onOrderPlaced()
    }
  }, [onOrderPlaced])

  return (
    <div className="space-y-1">
      <div className="w-full">
        <div className="flex items-center justify-between">
          <OptionChainUtils
            selectedExpiration={selectedExpiration}
            onExpirationChange={handleExpirationChange}
            greekFilters={greekFilters}
            onGreekFiltersChange={handleGreekFiltersChange}
          />
          <div className="flex items-center space-x-2">
            <Switch
              id="greek-display-mode"
              checked={useGreekSymbols}
              onCheckedChange={setUseGreekSymbols}
            />
            <Label htmlFor="greek-display-mode" className="text-sm cursor-pointer">
              {useGreekSymbols ? "Greek Symbols" : "Greek Symbols"}
            </Label>
          </div>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[800px]">
          <OptionChainTable 
            key={`option-chain-${refreshTrigger}`} // Add key with refresh trigger to force remount
            assetId={assetId}
            expirationDate={selectedExpiration}
            greekFilters={greekFilters}
            onOptionsChange={handleOptionsChange}
            initialSelectedOptions={selectedOptions}
            useGreekSymbols={useGreekSymbols}
            onOrderPlaced={handleOrderPlaced}
          />
        </div>
      </div>
    </div>
  )
} 