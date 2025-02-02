import { MintOptionForm } from "@/components/mint/MintOptionForm"

export default function MintPage() {
  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mint Option</h1>
        <p className="text-muted-foreground">
          Create a new option contract to list on the exchange.
        </p>
      </div>
      <MintOptionForm />
    </div>
  )
} 