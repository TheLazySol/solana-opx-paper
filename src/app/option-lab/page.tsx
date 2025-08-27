import { OptionLabFormWizard } from "@/components/option-lab/option-lab-form-wizard"

export default function MintOptionPage() {
  return (
    <div className="py-4 md:py-8 min-h-screen">
      <div className="mb-4 md:mb-6 text-center px-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-thin mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
          Option Lab
        </h1>
        <p className="text-sm md:text-base text-white/60 max-w-2xl mx-auto">
          Create, visualize, and mint option contracts to list on Solana OPX
        </p>
      </div>
      <OptionLabFormWizard />
    </div>
  )
} 