import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { SummaryContainer } from "./SummaryContainer"
import { OptionOrder } from "@/types/order"
import { X, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OrdersContainerProps {
  orders: OptionOrder[]
  onRemoveOrder: (publicKey: string) => void
  onUpdateQuantity: (publicKey: string, newSize: number) => void
  selectedAsset: string
}

export function OrdersContainer({ 
  orders, 
  onRemoveOrder, 
  onUpdateQuantity,
  selectedAsset 
}: OrdersContainerProps) {
  const maxLegs = 4
  const isMaxLegsReached = orders.length >= maxLegs

  const handleQuantityChange = (order: OptionOrder, increment: boolean) => {
    const newSize = increment ? (order.size || 1) + 1 : (order.size || 1) - 1
    
    // Remove order if quantity reaches 0
    if (newSize === 0) {
      onRemoveOrder(order.publicKey.toString())
      return
    }
    
    onUpdateQuantity(order.publicKey.toString(), newSize)
  }

  // Function to check if an order is a duplicate
  const isDuplicateOrder = (order: OptionOrder, index: number) => {
    return orders.findIndex(o => 
      o.strike === order.strike && 
      o.optionSide === order.optionSide && 
      o.type === order.type
    ) !== index
  }

  // Filter out duplicate orders
  const uniqueOrders = orders.filter((order, index) => !isDuplicateOrder(order, index))

  const formatOrderDescription = (order: OptionOrder) => {
    const direction = order.type === 'buy' ? 'Long' : 'Short'
    return (
      <div className="flex items-center gap-1">
        <span className={order.type === 'buy' 
          ? 'text-green-500' 
          : 'text-red-500'
        }>
          {direction}
        </span>
        <span>
          {selectedAsset} {order.optionSide.toUpperCase()} ${order.strike} Strike @ {order.price.toFixed(2)}
        </span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Main Orders Panel (3/4) */}
      <Card className="col-span-3 shadow-md dark:bg-card/20 bg-card/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Orders</CardTitle>
          {isMaxLegsReached && (
            <span className="text-sm text-[#4a85ff]">
              Maximum legs reached (4)
            </span>
          )}
        </CardHeader>
        <CardContent>
          {uniqueOrders.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No active orders. Select options above to create an order.
            </div>
          ) : (
            <div className="space-y-2">
              {uniqueOrders.map((order) => (
                <div
                  key={order.publicKey.toString()}
                  className="flex items-center justify-between py-1.5 px-2 border rounded-lg shadow-sm 
                    dark:bg-black bg-white hover:bg-zinc-50 dark:hover:bg-muted/20 
                    transition-colors border-border/50"
                >
                  <div className="flex items-center gap-4">
                    {formatOrderDescription(order)}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5 p-0"
                        onClick={() => handleQuantityChange(order, false)}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </Button>
                      <span className="min-w-[1.5rem] text-center text-sm">
                        {order.size || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5 p-0"
                        onClick={() => handleQuantityChange(order, true)}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 hover:bg-destructive/90 hover:text-destructive-foreground"
                      onClick={() => onRemoveOrder(order.publicKey.toString())}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Panel (1/4) */}
      <SummaryContainer />
    </div>
  )
} 