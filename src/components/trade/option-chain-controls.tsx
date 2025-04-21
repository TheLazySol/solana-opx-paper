import { FC, useState, useCallback } from 'react'
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
}

export const OptionChainControls: FC<OptionChainControlsProps> = ({ 
  assetId,
  onOptionsChange,
  selectedOptions = []
}) => {
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(null)
  const [greekFilters, setGreekFilters] = useState<GreekFilters>({
    delta: true,
    theta: true,
    gamma: false,
    vega: false,
    rho: false,
    oi: false,
    volume: true
  })
  const [useGreekSymbols, setUseGreekSymbols] = useState(false)

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
              {useGreekSymbols ? "Greek Symbols" : "Greek Names"}
            </Label>
          </div>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[800px]">
          <OptionChainTable 
            assetId={assetId}
            expirationDate={selectedExpiration}
            greekFilters={greekFilters}
            onOptionsChange={handleOptionsChange}
            initialSelectedOptions={selectedOptions}
            useGreekSymbols={useGreekSymbols}
          />
        </div>
      </div>
    </div>
  )
} 