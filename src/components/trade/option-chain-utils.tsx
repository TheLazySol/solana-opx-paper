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
      // Log the current options in localStorage
      const mintedOptionsStr = localStorage.getItem('mintedOptions');
      if (mintedOptionsStr) {
        const mintedOptions = JSON.parse(mintedOptionsStr);
        console.log('Current options in localStorage:', mintedOptions);
      }
      
      // Clean up options in localStorage
      cleanupPendingOptions();
      
      // Refresh prices for all tokens in parallel
      await Promise.all(
        Object.keys(TOKENS).map(symbol => getTokenPrice(symbol))
      );
      
      // Dispatch event to notify that options have been updated
      window.dispatchEvent(new CustomEvent('mintedOptionsUpdated'));
    } catch (error) {
      console.error('Error refreshing token prices:', error);
    } finally {
      // Stop the refresh animation after all prices are fetched
      setIsRefreshing(false);
    }
  };
  
  // Helper function to clean up pending options
  const cleanupPendingOptions = () => {
    try {
      const mintedOptionsStr = localStorage.getItem('mintedOptions');
      if (!mintedOptionsStr) return;
      
      const mintedOptions = JSON.parse(mintedOptionsStr);
      console.log('Before cleanup, total options:', mintedOptions.length);
      
      // Group options by expiry and strike
      const optionsByExpiryAndStrike: Record<string, Record<number, any[]>> = {};
      
      // Initialize the structure
      mintedOptions.forEach((option: any) => {
        if (!option.expiry || option.strike === undefined) return;
        
        if (!optionsByExpiryAndStrike[option.expiry]) {
          optionsByExpiryAndStrike[option.expiry] = {};
        }
        
        if (!optionsByExpiryAndStrike[option.expiry][option.strike]) {
          optionsByExpiryAndStrike[option.expiry][option.strike] = [];
        }
        
        optionsByExpiryAndStrike[option.expiry][option.strike].push(option);
      });
      
      // Check each strike for pending options
      let updatedOptions: any[] = [];
      
      Object.entries(optionsByExpiryAndStrike).forEach(([expiry, strikeMap]) => {
        Object.entries(strikeMap).forEach(([strike, options]) => {
          // Check if there are any pending options for this strike
          const hasPendingOptions = options.some(opt => opt.status === 'pending');
          
          if (hasPendingOptions) {
            // If there are pending options, keep all options for this strike
            updatedOptions = updatedOptions.concat(options);
            console.log(`Strike ${strike} (${expiry}): Keeping all options - has pending options`);
          } else {
            // If no pending options, only keep filled options
            const filledOptions = options.filter(opt => opt.status === 'filled');
            updatedOptions = updatedOptions.concat(filledOptions);
            
            if (filledOptions.length > 0) {
              console.log(`Strike ${strike} (${expiry}): Keeping ${filledOptions.length} filled options`);
            } else {
              console.log(`Strike ${strike} (${expiry}): Removing all options - no pending or filled`);
            }
          }
        });
      });
      
      console.log('After cleanup, total options:', updatedOptions.length);
      
      // Update localStorage with the cleaned options
      localStorage.setItem('mintedOptions', JSON.stringify(updatedOptions));
      
    } catch (error) {
      console.error('Error cleaning up pending options:', error);
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