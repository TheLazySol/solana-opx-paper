import { FC, useState, useCallback, useRef, useEffect } from 'react'
import { Button, Spinner } from '@heroui/react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/utils/utils'
import { OptionChainTable } from './option-chain-table'
import { OptionChainUtils } from './option-chain-utils'
import { GreekFilters, loadFiltersFromStorage, loadGreekSymbolsFromStorage, DEFAULT_FILTERS } from './option-chain-user-settings'
import { SelectedOption } from './option-data'


interface OptionChainControlsProps {
  assetId: string
  onOptionsChange?: (options: SelectedOption[]) => void
  selectedOptions?: SelectedOption[]
  onOrderPlaced?: () => void
  onSwitchToCreateOrder?: () => void
}

export const OptionChainControls: FC<OptionChainControlsProps> = ({ 
  assetId,
  onOptionsChange,
  selectedOptions = [],
  onOrderPlaced,
  onSwitchToCreateOrder
}) => {
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(null)
  const [greekFilters, setGreekFilters] = useState<GreekFilters>(DEFAULT_FILTERS)
  const [useGreekSymbols, setUseGreekSymbols] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [refreshExpirations, setRefreshExpirations] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const optionChainTableRef = useRef<{ refreshVolumes: () => void } | null>(null)

  // Load saved preferences after component mounts to avoid hydration mismatch
  useEffect(() => {
    const savedFilters = loadFiltersFromStorage()
    if (savedFilters) {
      setGreekFilters(savedFilters)
    }
    
    // Load saved Greek symbols preference
    const savedSymbols = loadGreekSymbolsFromStorage()
    setUseGreekSymbols(savedSymbols)
  }, [])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mintedOptions') {
        // Only refresh expiration data without triggering a full table refresh
        setRefreshExpirations(prev => prev + 1)
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    const handleLocalUpdate = () => {
      // Only refresh expiration data without triggering a full table refresh
      setRefreshExpirations(prev => prev + 1)
    }
    
    window.addEventListener('mintedOptionsUpdated', handleLocalUpdate)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('mintedOptionsUpdated', handleLocalUpdate)
    }
  }, [])

  // Handle expiration date selection change
  const handleExpirationChange = useCallback((expiration: string) => {
    setSelectedExpiration(expiration)
  }, [])

  // Handle greek filters change
  const handleGreekFiltersChange = useCallback((filters: GreekFilters) => {
    setGreekFilters(filters)
  }, [])

  // Handle Greek symbols toggle change
  const handleGreekSymbolsChange = useCallback((useSymbols: boolean) => {
    setUseGreekSymbols(useSymbols)
  }, [])

  // Handle settings saved - reload preferences from localStorage
  const handleSettingsSaved = useCallback(() => {
    const savedFilters = loadFiltersFromStorage()
    if (savedFilters) {
      setGreekFilters(savedFilters)
    }
    
    const savedSymbols = loadGreekSymbolsFromStorage()
    setUseGreekSymbols(savedSymbols)
  }, [])

  // Handle selected options change
  const handleOptionsChange = useCallback((options: SelectedOption[]) => {
    if (onOptionsChange) {
      onOptionsChange(options)
    }
  }, [onOptionsChange])

  // Handle refresh button click
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      // Visual feedback - simulate refresh process
      console.log('Refresh button clicked - visual feedback only');
      
      // TODO: Implement server-side data refresh when database is ready
      // For now, just provide visual feedback with a realistic delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      // Stop the refresh animation
      setIsRefreshing(false);
    }
  }, []);

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
            useGreekSymbols={useGreekSymbols}
            onGreekSymbolsChange={handleGreekSymbolsChange}
            refreshExpirations={refreshExpirations}
            onSettingsSaved={handleSettingsSaved}
          />
          
          <div className="flex items-center">
            <Button
              variant="bordered"
              size="sm"
              isIconOnly
              className={cn(
                "w-10 p-0 border-[0.5px]",
                isRefreshing 
                  ? "cursor-not-allowed opacity-80" 
                  : "hover:opacity-80 hover:scale-105 active:scale-95 transition-all duration-200"
              )}
              onPress={handleRefresh}
              isDisabled={isRefreshing}
              aria-label={isRefreshing ? "Refreshing option chain data..." : "Refresh option chain data"}
            >
              {isRefreshing ? (
                <Spinner 
                  size="sm" 
                  color="primary"
                  className="h-4 w-4"
                  classNames={{
                    circle1: "border-b-primary",
                    circle2: "border-b-primary",
                  }}
                />
              ) : (
                <RefreshCw className="h-4 w-4 text-foreground-500" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[800px]">
          <OptionChainTable 
            key={`option-chain-${refreshTrigger}`}
            assetId={assetId}
            expirationDate={selectedExpiration}
            greekFilters={greekFilters}
            onOptionsChange={handleOptionsChange}
            initialSelectedOptions={selectedOptions}
            useGreekSymbols={useGreekSymbols}
            onOrderPlaced={handleOrderPlaced}
            onSwitchToCreateOrder={onSwitchToCreateOrder}
          />
        </div>
      </div>
    </div>
  )
} 