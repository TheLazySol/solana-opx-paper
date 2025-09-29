import { FC, useState, useCallback, useRef, useEffect } from 'react'
import { Button, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react'
import { RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/utils'
import { OptionChainTable } from './option-chain-table'
import { OptionChainUtils } from './option-chain-utils'
import { GreekFilters, loadFiltersFromStorage, loadGreekSymbolsFromStorage, DEFAULT_FILTERS } from './option-chain-user-settings'
import { SelectedOption, OptionContract } from './option-data'
import { useMouseGlow } from '@/hooks/useMouseGlow'


interface OptionChainControlsProps {
  assetId: string
  onOptionsChange?: (options: SelectedOption[]) => void
  selectedOptions?: SelectedOption[]
  onOrderPlaced?: () => void
  onSwitchToCreateOrder?: () => void
  onOptionChainDataChange?: (data: OptionContract[]) => void
}

export const OptionChainControls: FC<OptionChainControlsProps> = ({ 
  assetId,
  onOptionsChange,
  selectedOptions = [],
  onOrderPlaced,
  onSwitchToCreateOrder,
  onOptionChainDataChange
}) => {
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(null)
  const [greekFilters, setGreekFilters] = useState<GreekFilters>(DEFAULT_FILTERS)
  const [useGreekSymbols, setUseGreekSymbols] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [refreshExpirations, setRefreshExpirations] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const optionChainTableRef = useRef<{ refreshVolumes: () => void } | null>(null)
  const {isOpen: isClearModalOpen, onOpen: onClearModalOpen, onOpenChange: onClearModalOpenChange} = useDisclosure()
  const optionChainContainerRef = useMouseGlow()

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 200) // Small delay after chart loads
    
    return () => clearTimeout(timer)
  }, [])

  // Additional timer to ensure scrollbars only appear after all animations complete
  const [allowScrollbars, setAllowScrollbars] = useState(false)
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setAllowScrollbars(true)
      }, 1200) // Wait for all table animations to complete
      
      return () => clearTimeout(timer)
    } else {
      setAllowScrollbars(false)
    }
  }, [isVisible])

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
    <div 
      ref={optionChainContainerRef}
      className={`bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out rounded-xl p-4 space-y-4 transform transition-all duration-500 ease-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-4 opacity-0'
      }`}
      style={{
        background: `
          radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
            rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
            rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
            rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
            transparent 75%
          ),
          linear-gradient(to bottom right, 
            rgb(15 23 42 / 0.4), 
            rgb(30 41 59 / 0.3), 
            rgb(51 65 85 / 0.2)
          )
        `,
        transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
      }}
    >
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div className={`transform transition-all duration-400 ease-out delay-100 ${
            isVisible 
              ? 'translate-x-0 opacity-100' 
              : '-translate-x-4 opacity-0'
          }`}>
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
          </div>
          
          <div className={`flex items-center gap-2 transform transition-all duration-400 ease-out delay-200 ${
            isVisible 
              ? 'translate-x-0 opacity-100 scale-100' 
              : 'translate-x-4 opacity-0 scale-95'
          }`}>
            <Button
              variant="bordered"
              size="sm"
              isIconOnly
              color="default"
              onPress={handleRefresh}
              isLoading={isRefreshing}
              spinner={
                <Spinner 
                  size="sm" 
                  color="current"
                  classNames={{
                    circle1: "border-b-current",
                    circle2: "border-b-current",
                  }}
                />
              }
              aria-label={isRefreshing ? "Refreshing option chain data..." : "Refresh option chain data"}
              className="w-10 h-10 min-w-10 border-[0.5px] data-[hover=true]:scale-110 data-[pressed=true]:scale-95"
            >
              {!isRefreshing && <RefreshCw className="h-4 w-4 text-foreground-500" />}
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
      <div className={`w-full ${
        allowScrollbars 
          ? 'overflow-x-auto' 
          : 'overflow-hidden'
      }`}>
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
            isParentVisible={isVisible}
            onOptionChainDataChange={onOptionChainDataChange}
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