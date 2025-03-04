import { OptionLabForm } from "@/components/mint/OptionLabForm"

export default function MintOptionPage() {
  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Option Lab</h1>
        <p className="text-muted-foreground">
          Create a new option contract to list on the exchange.
        </p>
      </div>
      <OptionLabForm />
    </div>
  )
} 