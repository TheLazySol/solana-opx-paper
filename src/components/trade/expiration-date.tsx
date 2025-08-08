import { FC, useState, useCallback, memo, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import { ExpirationDate, EMPTY_EXPIRATION_DATES, formatOptionExpirationDate } from '@/constants/constants'

interface ExpirationDateSelectorProps {
  selectedExpiration: string | null
  onExpirationChange: (expiration: string) => void
  expirationDates?: ExpirationDate[]
}

const ExpirationDateSelectorComponent: FC<ExpirationDateSelectorProps> = ({ 
  selectedExpiration, 
  onExpirationChange,
  expirationDates = EMPTY_EXPIRATION_DATES
}) => {
  // Add a state to track if hydration is complete
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Set hydration flag after component mounts (client-side only)
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  
  // Handle expiration date selection change
  const handleExpirationChange = useCallback((expiration: string) => {
    onExpirationChange(expiration)
  }, [onExpirationChange])
  
  // Default to the first available date only after hydration is complete
  useEffect(() => {
    if (isHydrated && expirationDates.length > 0 && !selectedExpiration) {
      // Use setTimeout to push this to the next event loop after hydration
      const timer = setTimeout(() => {
        handleExpirationChange(expirationDates[0].value)
      }, 0)
      
      return () => clearTimeout(timer)
    }
  }, [expirationDates, selectedExpiration, handleExpirationChange, isHydrated])

  return (
    <div className="flex items-center space-x-2">
      <Dropdown>
        <DropdownTrigger>
          <Button 
            variant="bordered" 
            className="w-[180px] justify-between"
            endContent={<ChevronDown className="h-4 w-4 shrink-0 opacity-50" />}
          >
            {selectedExpiration 
              ? formatOptionExpirationDate(selectedExpiration)
              : "Expiration Date"}
          </Button>
        </DropdownTrigger>
        <DropdownMenu 
          aria-label="Expiration date selection"
          onAction={(key) => handleExpirationChange(key as string)}
          className="w-[180px]"
        >
          {expirationDates.length > 0 ? (
            expirationDates.map((date) => (
              <DropdownItem key={date.value}>
                <div className="flex items-center justify-between w-full">
                  <span>{formatOptionExpirationDate(date.value)}</span>
                  {date.isMonthly && (
                    <span className="text-xs text-default-400">(Monthly)</span>
                  )}
                </div>
              </DropdownItem>
            ))
          ) : (
            <DropdownItem key="no-dates" isDisabled>
              No dates available
            </DropdownItem>
          )}
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

export const ExpirationDateSelector = memo(ExpirationDateSelectorComponent)
ExpirationDateSelector.displayName = 'ExpirationDateSelector' 