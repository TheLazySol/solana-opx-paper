import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MakerSummaryProps } from "@/types/mint/optionTypes"


export function MakerSummary({ options, onRemoveOption }: MakerSummaryProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Maker Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            Add options to see them summarized here
          </span>
        ) : (
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center justify-between py-1.5 px-2 border rounded-lg">
                <div className="flex items-center gap-1">
                  <span className="text-red-500">SHORT</span>
                  <span>
                    {option.asset} {option.optionType.toUpperCase()} ${Number(option.strikePrice).toFixed(2)} Strike @ {Number(option.premium).toFixed(2)}
                    <span className="text-muted-foreground ml-2">
                      ({option.quantity} contract{option.quantity > 1 ? 's' : ''})
                    </span>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveOption(index)}
                  className="h-6 w-6 p-0 hover:bg-destructive/90 hover:text-destructive-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 