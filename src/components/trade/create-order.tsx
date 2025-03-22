import { FC } from 'react'
import { Button } from '@/components/ui/button'

interface CreateOrderProps {
  // We'll expand these props as needed when implementing the actual functionality
  selectedOptions?: any[] // This will be properly typed later
  onRemoveOption?: (index: number) => void
}

export const CreateOrder: FC<CreateOrderProps> = ({ 
  selectedOptions = [],
  onRemoveOption
}) => {
  return (
    <div className="w-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg rounded-lg p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create Order</h3>
          {selectedOptions.length > 0 && (
            <Button 
              variant="outline"
              className="text-sm"
            >
              Place Order
            </Button>
          )}
        </div>

        {selectedOptions.length === 0 ? (
          <div className="min-h-[100px] flex items-center justify-center text-muted-foreground">
            <p>Select options from the chain above to build your order</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Selected options will be listed here */}
            <div className="text-muted-foreground">Selected options will appear here</div>
          </div>
        )}
      </div>
    </div>
  )
} 