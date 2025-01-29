import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"

type OrderMode = "market" | "limit"

export function SummaryContainer() {
  const [mode, setMode] = useState<OrderMode>("market")

  return (
    <Card className="col-span-1 shadow-md dark:bg-card/20 bg-card/40">
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="text-lg font-semibold">Summary</CardTitle>
        <Tabs 
          value={mode} 
          onValueChange={(value) => setMode(value as OrderMode)}
          className="w-[140px]"
        >
          <TabsList className="h-7 bg-muted/50 dark:bg-muted/20 p-0.5">
            <TabsTrigger 
              value="market" 
              className="text-xs h-6 px-3 data-[state=active]:bg-background dark:data-[state=active]:bg-muted/60"
            >
              Market
            </TabsTrigger>
            <TabsTrigger 
              value="limit" 
              className="text-xs h-6 px-3 data-[state=active]:bg-background dark:data-[state=active]:bg-muted/60"
            >
              Limit
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {mode === "market" ? (
            "Market order summary will appear here."
          ) : (
            "Limit order summary will appear here."
          )}
        </div>
      </CardContent>
    </Card>
  )
} 