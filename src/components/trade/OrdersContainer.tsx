import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { SummaryContainer } from "./SummaryContainer"

export function OrdersContainer() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Main Orders Panel (3/4) */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No active orders. Select options above to create an order.
          </div>
        </CardContent>
      </Card>

      {/* Summary Panel (1/4) */}
      <SummaryContainer />
    </div>
  )
} 