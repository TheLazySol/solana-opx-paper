import { FC, useState, useCallback } from 'react'
import { OptionChainTable } from './option-chain-table'
import { OptionChainUtils } from './option-chain-utils'
import { GreekFilters } from './filter-greeks'

interface OptionChainControlsProps {
  assetId: string
}

export const OptionChainControls: FC<OptionChainControlsProps> = ({ 
  assetId
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

  // Handle expiration date selection change
  const handleExpirationChange = useCallback((expiration: string) => {
    setSelectedExpiration(expiration)
  }, [])

  // Handle greek filters change
  const handleGreekFiltersChange = useCallback((filters: GreekFilters) => {
    setGreekFilters(filters)
  }, [])

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="w-full">
        <OptionChainUtils
          selectedExpiration={selectedExpiration}
          onExpirationChange={handleExpirationChange}
          greekFilters={greekFilters}
          onGreekFiltersChange={handleGreekFiltersChange}
        />
      </div>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[800px]">
          <OptionChainTable 
            assetId={assetId}
            expirationDate={selectedExpiration}
            greekFilters={greekFilters}
          />
        </div>
      </div>
    </div>
  )
} 