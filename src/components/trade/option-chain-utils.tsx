import { FC, useState } from 'react'
import { ExpirationDateSelector } from './expiration-date'
import { FilterGreeks, GreekFilters } from './filter-greeks'
import { ExpirationDate } from '@/constants/constants'
import { Button } from '../ui/button'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTokenPrice } from '@/lib/api/getTokenPrice'
import { TOKENS } from '@/constants/token-list/token-list'

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Refresh prices for all tokens in parallel
      await Promise.all(
        Object.keys(TOKENS).map(symbol => getTokenPrice(symbol))
      );
    } catch (error) {
      console.error('Error refreshing token prices:', error);
    } finally {
      // Stop the refresh animation after all prices are fetched
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-start sm:justify-end items-start sm:items-center gap-2 mb-4">
      <ExpirationDateSelector
        selectedExpiration={selectedExpiration}
        onExpirationChange={onExpirationChange}
        expirationDates={expirationDates}
      />
      <FilterGreeks 
        filters={greekFilters}
        onFiltersChange={onGreekFiltersChange}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw
          className={cn(
            'h-4 w-4 text-muted-foreground',
            isRefreshing && 'animate-spin'
          )}
        />
      </Button>
    </div>
  )
} 