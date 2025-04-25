import { FC, useState, useEffect } from 'react'
import { ExpirationDateSelector } from './expiration-date'
import { FilterGreeks, GreekFilters } from './filter-greeks'
import { ExpirationDate, EMPTY_EXPIRATION_DATES, formatOptionExpirationDate } from '@/constants/constants'
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
  refreshExpirations?: number
}

export const OptionChainUtils: FC<OptionChainUtilsProps> = ({
  selectedExpiration,
  onExpirationChange,
  expirationDates: propExpirationDates,
  greekFilters,
  onGreekFiltersChange,
  refreshExpirations = 0
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allExpirationDates, setAllExpirationDates] = useState<ExpirationDate[]>(propExpirationDates || EMPTY_EXPIRATION_DATES);

  // Function to get expiration dates from minted options
  useEffect(() => {
    const getMintedOptionExpirations = () => {
      try {
        // Get minted options from localStorage
        const mintedOptionsStr = localStorage.getItem('mintedOptions');
        if (!mintedOptionsStr) return propExpirationDates || EMPTY_EXPIRATION_DATES;
        
        const mintedOptions = JSON.parse(mintedOptionsStr);
        
        // Extract unique expiration dates
        const uniqueDates = new Set<string>();
        
        // Add dates from prop expiration dates
        if (propExpirationDates) {
          propExpirationDates.forEach(date => uniqueDates.add(date.value));
        } else {
          EMPTY_EXPIRATION_DATES.forEach(date => uniqueDates.add(date.value));
        }
        
        // Add dates from minted options
        mintedOptions.forEach((option: any) => {
          if (option.expiry) {
            uniqueDates.add(option.expiry);
          }
        });
        
        // Convert to ExpirationDate format
        const expiryDates = Array.from(uniqueDates).map(date => ({
          value: date,
          label: formatOptionExpirationDate(date),
          isMonthly: false // We don't know if it's monthly, so default to false
        }));
        
        // Sort by date (earliest first)
        expiryDates.sort((a, b) => {
          const dateA = new Date(a.value);
          const dateB = new Date(b.value);
          return dateA.getTime() - dateB.getTime();
        });
        
        return expiryDates;
      } catch (error) {
        console.error('Error getting minted option expirations:', error);
        return propExpirationDates || EMPTY_EXPIRATION_DATES;
      }
    };
    
    // Update expiration dates
    const updatedDates = getMintedOptionExpirations();
    setAllExpirationDates(updatedDates);
    
    // If no date is selected and we have dates, select the first one
    if (!selectedExpiration && updatedDates.length > 0) {
      onExpirationChange(updatedDates[0].value);
    }
  }, [propExpirationDates, selectedExpiration, onExpirationChange, refreshExpirations]);

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
        expirationDates={allExpirationDates}
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