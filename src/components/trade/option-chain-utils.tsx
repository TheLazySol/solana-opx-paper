import { FC, useState } from 'react'
import { ExpirationDateSelector } from './expiration-date-selector'
import { FilterGreeks, GreekFilters } from './filter-greeks'
import { ExpirationDate } from '@/constants/constants'

interface OptionChainUtilsProps {
  selectedExpiration: string | null
  onExpirationChange: (expiration: string) => void
  expirationDates?: ExpirationDate[]
  greekFilters: GreekFilters
  onGreekFiltersChange: (filters: GreekFilters) => void
}

export const OptionChainUtils: FC<OptionChainUtilsProps> = ({
  selectedExpiration,
  onExpirationChange,
  expirationDates,
  greekFilters,
  onGreekFiltersChange
}) => {
  return (
    <div className="flex justify-end items-center space-x-2 mb-4">
      <ExpirationDateSelector
        selectedExpiration={selectedExpiration}
        onExpirationChange={onExpirationChange}
        expirationDates={expirationDates}
      />
      <FilterGreeks 
        filters={greekFilters}
        onFiltersChange={onGreekFiltersChange}
      />
    </div>
  )
} 