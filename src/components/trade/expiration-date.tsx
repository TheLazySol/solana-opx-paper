import { FC, useState, useCallback, memo } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  // Handle expiration date selection change
  const handleExpirationChange = useCallback((expiration: string) => {
    onExpirationChange(expiration)
  }, [onExpirationChange])

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[180px] justify-between">
            {selectedExpiration 
              ? formatOptionExpirationDate(selectedExpiration)
              : "Expiration Date"}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[180px]" align="end">
          {expirationDates.length > 0 ? (
            expirationDates.map((date) => (
              <DropdownMenuItem
                key={date.value}
                onClick={() => handleExpirationChange(date.value)}
                className="cursor-pointer"
              >
                {formatOptionExpirationDate(date.value)}
                {date.isMonthly && (
                  <span className="ml-1 text-xs text-muted-foreground">(Monthly)</span>
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>No dates available</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const ExpirationDateSelector = memo(ExpirationDateSelectorComponent)
ExpirationDateSelector.displayName = 'ExpirationDateSelector' 