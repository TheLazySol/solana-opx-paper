import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function SummaryContainer() {
  return (
    <Card className="col-span-1 shadow-md dark:bg-card/20 bg-card/40">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          Order summary will appear here.
        </div>
      </CardContent>
    </Card>
  )
} 