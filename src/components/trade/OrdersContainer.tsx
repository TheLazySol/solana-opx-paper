import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { SummaryContainer } from "./SetOrderContainer"
import { OptionOrder } from "@/types/options/orderTypes"
import { X, Plus, Minus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"
import { MarketPrices } from "@/types/market/marketTypes"
import { useWallet } from "@solana/wallet-adapter-react"

interface OrdersContainerProps {
  orders: OptionOrder[]
  onRemoveOrder: (publicKey: string) => void
  onUpdateQuantity: (publicKey: string, newSize: number) => void
  selectedAsset: string
  onUpdateLimitPrice: (publicKey: string, price: number) => void
  onRefresh?: () => void
  isRefreshing?: boolean
  currentMarketPrices?: MarketPrices
}

type PositionStatus = "pending" | "open" | "closed"

export function OrdersContainer({ 
  orders, 
  onRemoveOrder, 
  onUpdateQuantity,
  selectedAsset,
  onUpdateLimitPrice,
  onRefresh,
  isRefreshing = false,
  currentMarketPrices
}: OrdersContainerProps) {
  const { publicKey } = useWallet()
  const [status, setStatus] = useState<PositionStatus>("pending")
  const maxLegs = 4
  const isMaxLegsReached = orders.length >= maxLegs

  // Filter orders by wallet and status
  const getFilteredOrders = () => {
    const walletOrders = orders.filter(order => 
      order.owner.toString() === publicKey?.toString()
    )

    switch (status) {
      case "pending":
        // Only show orders from chain actions (bid/ask clicks)
        return walletOrders.filter(order => order.fromChainAction)
      case "open":
        // Show minted options (short positions)
        return walletOrders.filter(order => !order.fromChainAction)
      case "closed":
        return []
      default:
        return []
    }
  }

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
          <span className="text-muted-foreground ml-2">
            ({order.size || 1} contract{(order.size || 1) > 1 ? 's' : ''})
          </span>
        </span>
      </div>
    )
  }

  const renderContent = () => {
    const filteredOrders = getFilteredOrders()

    if (filteredOrders.length === 0) {
      return (
        <div className="text-sm text-muted-foreground">
          {status === "pending" && "No pending orders. Orders from the option chain will appear here."}
          {status === "open" && "No open positions. Mint an option to create a position."}
          {status === "closed" && "No closed positions. Positions that have been closed will appear here."}
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {filteredOrders.map((order) => (
          <div
            key={order.publicKey.toString()}
            className="flex items-center justify-between py-1.5 px-2 border rounded-lg shadow-sm 
              dark:bg-black bg-white hover:bg-zinc-50 dark:hover:bg-muted/20 
              transition-colors border-border/50"
          >
            <div className="flex items-center gap-4">
              {formatOrderDescription(order)}
            </div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs hover:bg-destructive/90 hover:text-destructive-foreground"
                onClick={() => onRemoveOrder(order.publicKey.toString())}
              >
                {status === "open" ? "Close" : "Cancel"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-5 gap-4">
      {/* Main Orders Panel (3/5) */}
      <Card className="col-span-3 shadow-md dark:bg-card/20 bg-card/40">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Positions</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-gray-100 transition-colors"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw 
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
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
          {renderContent()}
        </CardContent>
      </Card>

      {/* Summary Panel (2/5) */}
      <SummaryContainer 
        orders={orders} 
        selectedAsset={selectedAsset}
        className="col-span-2"
        onUpdateLimitPrice={onUpdateLimitPrice}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        currentMarketPrices={currentMarketPrices}
      />
    </div>
  )
} 