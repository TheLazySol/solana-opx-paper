"use client"

import { OptionsChain } from "@/components/trade/OptionsChain"

export default function TradePage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Options Trading</h1>
      <OptionsChain />
    </div>
  )
} 