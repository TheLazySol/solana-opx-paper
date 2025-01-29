import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"
import { OptionOrder } from "@/types/order"

interface SummaryContainerProps {
  orders: OptionOrder[]
  selectedAsset: string
  className?: string
}

type OrderMode = "market" | "limit"

export function SummaryContainer({ 
  orders, 
  selectedAsset,
  className = "" 
}: SummaryContainerProps) {
  const [mode, setMode] = useState<OrderMode>("market")

  const calculateLegTotal = (order: OptionOrder) => {
    const contractSize = 100
    const quantity = order.size || 1
    const total = order.price * quantity * contractSize
    return order.type === 'buy' ? total : -total
  }

  const formatTotal = (total: number) => {
    const absoluteTotal = Math.abs(total)
    const formattedTotal = absoluteTotal.toFixed(2)
    const suffix = total >= 0 ? (
      <span className="text-green-500 ml-1">db</span>
    ) : (
      <span className="text-red-500 ml-1">cr</span>
    )
    
    return (
      <div className="flex items-center">
        <span>${formattedTotal}</span>
        {suffix}
      </div>
    )
  }

  const renderOrderSummary = (order: OptionOrder) => {
    const direction = order.type === 'buy' ? 'Long' : 'Short'
    const total = calculateLegTotal(order)
    
    return (
      <div key={order.publicKey.toString()} className="flex justify-between items-center py-1">
        <div className="text-sm">
          <span className={order.type === 'buy' ? 'text-green-500' : 'text-red-500'}>
            {direction}
          </span>
          {' '}
          {selectedAsset} {order.optionSide.toUpperCase()} ${order.strike} Strike @ {order.price.toFixed(2)}
          {' '}
          <span className="text-muted-foreground">
            ({order.size || 1})
          </span>
        </div>
        <div className="text-sm font-medium">
          {formatTotal(total)}
        </div>
      </div>
    )
  }

  const calculateGrandTotal = (orders: OptionOrder[]) => {
    return orders.reduce((sum, order) => sum + calculateLegTotal(order), 0)
  }

  return (
    <Card className={`shadow-md dark:bg-card/20 bg-card/40 ${className}`}>
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="text-lg font-semibold">Order Summary</CardTitle>
        <Tabs 
          value={mode} 
          onValueChange={(value) => setMode(value as OrderMode)}
          className="w-[140px]"
        >
          <TabsList className="h-7 bg-muted/50 dark:bg-muted/20 p-0.5 grid grid-cols-2">
            <TabsTrigger 
              value="market" 
              className="text-xs h-6 data-[state=active]:bg-background dark:data-[state=active]:bg-muted/60"
            >
              Market
            </TabsTrigger>
            <TabsTrigger 
              value="limit" 
              className="text-xs h-6 data-[state=active]:bg-background dark:data-[state=active]:bg-muted/60"
            >
              Limit
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {mode === "market" ? (
          orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map(renderOrderSummary)}
              <div className="pt-2 mt-2 border-t flex justify-between items-center">
                <span className="text-sm font-medium">Total</span>
                <span className="text-sm font-medium">
                  {formatTotal(calculateGrandTotal(orders))}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No orders selected.
            </div>
          )
        ) : (
          <div className="text-sm text-muted-foreground">
            Limit order summary will appear here.
          </div>
        )}
      </CardContent>
    </Card>
  )
} 