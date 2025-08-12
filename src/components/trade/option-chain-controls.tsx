import { FC, useState, useCallback, useRef, useEffect } from 'react'
import { Button, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react'
import { RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
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
  const {isOpen: isClearModalOpen, onOpen: onClearModalOpen, onOpenChange: onClearModalOpenChange} = useDisclosure()

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

  // Handle showing clear confirmation dialog
  const handleClearOptionData = useCallback(() => {
    onClearModalOpen()
  }, [onClearModalOpen])

  // Handle confirmed clearing of all option chain data
  const handleConfirmClear = useCallback(() => {
    try {
      // Clear all option-related localStorage data
      localStorage.removeItem('mintedOptions')
      localStorage.removeItem('openOrders')
      localStorage.removeItem('closedOrders')
      
      console.log('Cleared all option chain data from localStorage')
      
      // Trigger refresh for expirations and table data
      setRefreshExpirations(prev => prev + 1)
      setRefreshTrigger(prev => prev + 1)
      
      // Reset selected expiration to null to force re-selection
      setSelectedExpiration(null)
      
      // Dispatch events to notify all components
      window.dispatchEvent(new CustomEvent('mintedOptionsUpdated'))
      window.dispatchEvent(new CustomEvent('openOrdersUpdated'))
      
      // Close the modal
      onClearModalOpenChange()
      
    } catch (error) {
      console.error('Error clearing option data:', error)
    }
  }, [onClearModalOpenChange])

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
          
          <div className="flex items-center gap-2">
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
            
            <Button
              variant="bordered"
              size="sm"
              isIconOnly
              className="w-10 p-0 border-[0.5px] hover:opacity-80 hover:scale-105 active:scale-95 transition-all duration-200 hover:border-red-500/50 hover:text-red-400"
              onPress={handleClearOptionData}
              aria-label="Clear all option chain data"
            >
              <Trash2 className="h-4 w-4 text-foreground-500" />
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

      {/* Clear Data Confirmation Modal */}
      <Modal 
        isOpen={isClearModalOpen} 
        onOpenChange={onClearModalOpenChange}
        size="md"
        classNames={{
          base: "bg-black/90 backdrop-blur-md border border-red-500/20",
          header: "border-b border-red-500/20",
          body: "py-6",
          footer: "border-t border-red-500/20"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Clear All Option Data
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-white/90">
                    This action will permanently delete all option chain data including:
                  </p>
                  <ul className="space-y-2 text-white/70 ml-4">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                      All minted option contracts
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                      All open trading positions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                      All closed order history
                    </li>
                  </ul>
                  <p className="text-yellow-400 font-medium">
                    ⚠️ This action cannot be undone!
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button 
                  color="default" 
                  variant="bordered" 
                  onPress={onClose}
                  className="border-white/20"
                >
                  Cancel
                </Button>
                <Button 
                  color="danger" 
                  onPress={handleConfirmClear}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Clear All Data
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
} 