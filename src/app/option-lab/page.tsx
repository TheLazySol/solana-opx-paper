import { OptionLabForm } from "@/components/option-lab/option-lab-form"

export default function MintOptionPage() {
  return (
    <div className="container py-6 md:py-10 max-w-full">
      <div className="mb-6 md:mb-8 text-center px-4">
        <h1 className="text-3xl md:text-4xl font-thin mb-2">Option Lab</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Create, visualize, and mint option contracts to list on Solana OPX.
        </p>
      </div>
      <OptionLabForm />
    </div>
  )
} 