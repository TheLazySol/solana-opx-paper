import { FC, useState, useCallback } from 'react'
import { ExpirationDateSelector } from './expiration-date-selector'
import { OptionChainTable } from './option-chain-table'

interface OptionChainControlsProps {
  assetId: string
}

export const OptionChainControls: FC<OptionChainControlsProps> = ({ 
  assetId
}) => {
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(null)

  // Handle expiration date selection change
  const handleExpirationChange = useCallback((expiration: string) => {
    setSelectedExpiration(expiration)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <ExpirationDateSelector
          selectedExpiration={selectedExpiration}
          onExpirationChange={handleExpirationChange}
        />
      </div>
      <OptionChainTable 
        assetId={assetId}
        expirationDate={selectedExpiration}
      />
    </div>
  )
} 