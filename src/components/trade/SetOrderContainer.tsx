import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useState } from "react"
import { OptionOrder } from "@/types/options/orderTypes"

interface SummaryContainerProps {
  orders: OptionOrder[]
  selectedAsset: string
  className?: string
  onUpdateLimitPrice?: (publicKey: string, price: number) => void
  onRefresh?: () => void
  isRefreshing?: boolean
  currentMarketPrices?: MarketPrices
}

type OrderMode = "market" | "limit"

interface MarketPrices {
  [key: string]: {
    bid: number;
    ask: number;
  }
}

export function SummaryContainer({ 
  orders, 
  selectedAsset,
  className = "",
  onUpdateLimitPrice,
  onRefresh,
  isRefreshing = false,
  currentMarketPrices
}: SummaryContainerProps) {
  const [mode, setMode] = useState<OrderMode>("market")
  const [limitPrices, setLimitPrices] = useState<Record<string, string>>({})
  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({})

  const calculateLegTotal = (order: OptionOrder) => {
    const contractSize = 100
    const quantity = order.size || 1
    const price = mode === "limit" 
      ? Number(limitPrices[order.publicKey.toString()] || order.price)
      : order.price
    const total = price * quantity * contractSize
    return order.type === 'buy' ? total : -total
  }

  const validateLimitPrice = (order: OptionOrder, price: number): string => {
    const orderKey = `${order.optionSide}-${order.strike}`
    const latestPrices = currentMarketPrices?.[orderKey]

    if (order.type === 'buy') {
      const currentAsk = latestPrices?.ask ?? order.askPrice
      if (price > currentAsk) {
        return `Cannot exceed current Ask Price of ${currentAsk.toFixed(2)}`
      }
    } else { // sell order
      const currentBid = latestPrices?.bid ?? order.bidPrice
      if (price < currentBid) {
        return `Cannot be below current Bid Price of ${currentBid.toFixed(2)}`
      }
    }
    return ''
  }

  const handleLimitPriceChange = (publicKey: string, value: string) => {
    // Allow empty string or numbers with decimals
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return

    setLimitPrices(prev => ({
      ...prev,
      [publicKey]: value
    }))

    // Only validate and update parent if we have a number value
    if (value !== '') {
      const numValue = Number(value)
      if (!isNaN(numValue)) {
        const order = orders.find(o => o.publicKey.toString() === publicKey)
        if (!order) return

        const error = validateLimitPrice(order, numValue)
        setPriceErrors(prev => ({
          ...prev,
          [publicKey]: error
        }))

        // Only update parent if there's no error
        if (!error && onUpdateLimitPrice) {
          onUpdateLimitPrice(publicKey, numValue)
        }
      }
    } else {
      // Clear error when input is empty
      setPriceErrors(prev => ({
        ...prev,
        [publicKey]: ''
      }))
    }
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
    const publicKey = order.publicKey.toString()
    const hasError = !!priceErrors[publicKey]
    
    return (
      <div key={publicKey} className="flex flex-col gap-1">
        <div className="flex justify-between items-center py-1">
          <div className="text-sm flex items-center">
            <span className={`${order.type === 'buy' ? 'text-green-500' : 'text-red-500'} mr-1`}>
              {direction}
            </span>
            <span>{selectedAsset} {order.optionSide.toUpperCase()} ${order.strike} Strike</span>
            <span className="mx-1">@</span>
            {mode === "limit" ? (
              <div className="inline-flex flex-col">
                <Input
                  type="text"
                  value={limitPrices[publicKey] !== undefined ? limitPrices[publicKey] : order.price.toFixed(2)}
                  onChange={(e) => handleLimitPriceChange(publicKey, e.target.value)}
                  className={`w-20 h-6 px-1.5 text-sm ${hasError ? 'border-red-500' : ''}`}
                  placeholder={order.price.toFixed(2)}
                />
              </div>
            ) : (
              <span>{order.price.toFixed(2)}</span>
            )}
          </div>
          <div className="text-sm font-medium">
            {formatTotal(total)}
          </div>
        </div>
        {hasError && (
          <div className="text-xs text-red-500 pl-20">
            {priceErrors[publicKey]}
          </div>
        )}
      </div>
    )
  }

  const calculateGrandTotal = (orders: OptionOrder[]) => {
    return orders.reduce((sum, order) => sum + calculateLegTotal(order), 0)
  }

  return (
    <Card className={`shadow-md dark:bg-card/20 bg-card/40 ${className}`}>
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Order Summary</CardTitle>
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
        {orders.length > 0 ? (
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
        )}
      </CardContent>
    </Card>
  )
} 