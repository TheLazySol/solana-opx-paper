import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { SummaryContainer } from "./SummaryContainer"
import { OptionOrder } from "@/types/order"
import { X, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"

interface OrdersContainerProps {
  orders: OptionOrder[]
  onRemoveOrder: (publicKey: string) => void
  onUpdateQuantity: (publicKey: string, newSize: number) => void
  selectedAsset: string
}

type PositionStatus = "pending" | "open" | "closed"

export function OrdersContainer({ 
  orders, 
  onRemoveOrder, 
  onUpdateQuantity,
  selectedAsset 
}: OrdersContainerProps) {
  const [status, setStatus] = useState<PositionStatus>("pending")
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
    <div className="grid grid-cols-5 gap-4">
      {/* Main Orders Panel (3/5) */}
      <Card className="col-span-3 shadow-md dark:bg-card/20 bg-card/40">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Positions</CardTitle>
            {isMaxLegsReached && (
              <span className="text-sm text-[#4a85ff]">
                Maximum legs reached (4)
              </span>
            )}
          </div>
          <Tabs 
            value={status} 
            onValueChange={(value) => setStatus(value as PositionStatus)}
            className="w-[210px]"
          >
            <TabsList className="h-7 bg-muted/50 dark:bg-muted/20 p-0.5 grid grid-cols-3">
              <TabsTrigger 
                value="pending" 
                className="text-xs h-6 data-[state=active]:bg-background dark:data-[state=active]:bg-muted/60"
              >
                Pending
              </TabsTrigger>
              <TabsTrigger 
                value="open" 
                className="text-xs h-6 data-[state=active]:bg-background dark:data-[state=active]:bg-muted/60"
              >
                Open
              </TabsTrigger>
              <TabsTrigger 
                value="closed" 
                className="text-xs h-6 data-[state=active]:bg-background dark:data-[state=active]:bg-muted/60"
              >
                Closed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {uniqueOrders.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No {status} positions. {status === 'pending' && 'Select options above to create a position.'}
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

      {/* Summary Panel (2/5) */}
      <SummaryContainer 
        orders={uniqueOrders} 
        selectedAsset={selectedAsset}
        className="col-span-2"
      />
    </div>
  )
} 