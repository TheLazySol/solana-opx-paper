import { FC, useState, useEffect } from 'react'
import { ExpirationDateSelector } from './expiration-date'
import { FilterGreeks, GreekFilters } from './option-chain-user-settings'
import { ExpirationDate, EMPTY_EXPIRATION_DATES, formatOptionExpirationDate } from '@/constants/constants'
import { Button, Spinner } from '@heroui/react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/utils/utils'


interface OptionChainUtilsProps {
  selectedExpiration: string | null
  onExpirationChange: (expiration: string) => void
  expirationDates?: ExpirationDate[]
  greekFilters: GreekFilters
  onGreekFiltersChange: (filters: GreekFilters) => void
  useGreekSymbols?: boolean
  onGreekSymbolsChange?: (useSymbols: boolean) => void
  refreshExpirations?: number
  onSettingsSaved?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export const OptionChainUtils: FC<OptionChainUtilsProps> = ({
  selectedExpiration,
  onExpirationChange,
  expirationDates: propExpirationDates,
  greekFilters,
  onGreekFiltersChange,
  useGreekSymbols,
  onGreekSymbolsChange,
  refreshExpirations = 0,
  onSettingsSaved
}) => {
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
          // Parse dates using Date.UTC to avoid timezone issues
          const [yearA, monthA, dayA] = a.value.split('-').map(Number);
          const [yearB, monthB, dayB] = b.value.split('-').map(Number);
          
          const dateATime = Date.UTC(yearA, monthA - 1, dayA);
          const dateBTime = Date.UTC(yearB, monthB - 1, dayB);
          
          return dateATime - dateBTime;
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
        useGreekSymbols={useGreekSymbols}
        onGreekSymbolsChange={onGreekSymbolsChange}
        onSettingsSaved={onSettingsSaved}
      />
    </div>
  )
} 