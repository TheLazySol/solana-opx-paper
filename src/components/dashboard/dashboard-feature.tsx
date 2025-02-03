'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink } from 'lucide-react'

const resources = [
  {
    title: "Trade More for Less",
    description: "One contract represents 100 of the underlying asset, without borrowing.",
  },
  {
    title: "Hedging Strategies",
    description: "Allow for more strategic hedging opportunities to help mitigate risks.",
  },
  {
    title: "Market Making",
    description: "Short sell options and earn premiums every 400ms.",
  },
  {
    title: "Lending",
    description: "Provide liquidity to the Option Margin Liquidity Pool (OMLP), earn yield.",
  },
]

const additionalResources = [
  {
    title: "Docs",
    href: "https://docs.epicentrallabs.com/"
  },
  {
    title: "GitHub",
    href: "https://github.com/EpicentralLabs"
  },
  {
    title: "Discord",
    href: "https://discord.gg/5asAuY2sR8"
  }
]

export default function DashboardFeature() {
  const cards = [
    {
      title: "Trade More for Less",
      description: "One contract represents 100 of the underlying asset, without borrowing.",
      buttonText: "Trade Now"
    },
    {
      title: "Hedging Strategies",
      description: "Allow for more strategic hedging opportunities to help mitigate risks.",
      buttonText: "Learn Options"
    },
    {
      title: "Market Making",
      description: "Short-sell options on margin and collect premiums every 400ms.",
      buttonText: "Mint Options"
    },
    {
      title: "Earn Yield",
      description: "Provide liquidity to the Option Margin Liquidity Pool (OMLP), earn yield.",
      buttonText: "Provide Liquidity"
    }
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] gap-8">
      <div className="relative">
        <div className="absolute inset-0 -z-10 
          bg-[radial-gradient(circle_at_center,rgba(74,133,255,0.2)_0%,transparent_70%)] 
          blur-xl scale-150">
        </div>
        <h1 className="text-8xl font-light tracking-wide text-center
          [text-shadow:_0_0_30px_rgba(255,255,255,0.5),_0_0_60px_rgba(255,255,255,0.2)]
          transition-all duration-300 hover:[text-shadow:_0_0_40px_rgba(255,255,255,0.6),_0_0_80px_rgba(255,255,255,0.3)]">
          Solana OPX
        </h1>
      </div>
      <p className="text-xl text-muted-foreground">
        The first decentralized options exchange on Solana
      </p>

      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
        <div className="absolute inset-0 -z-10 
          bg-[radial-gradient(circle_at_center,rgba(74,133,255,0.15)_0%,transparent_70%)] 
          blur-lg scale-150">
        </div>
        {cards.map((card, index) => (
          <div
            key={index}
            className="p-6 rounded-xl backdrop-blur-sm
              bg-white/5 dark:bg-gradient-to-b dark:from-[#101010] dark:to-[#000000]
              transition-all duration-300
              border border-[#e5e5e5] dark:border-background
              hover:border-[#4a85ff]/40 dark:hover:border-[#4a85ff]/40
              hover:bg-[#4a85ff]/5 dark:hover:bg-gradient-to-b dark:hover:from-[#101010]/95 dark:hover:to-[#000000]/95
              hover:[box-shadow:_0_0_30px_rgba(74,133,255,0.2)]"
          >
            <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{card.description}</p>
            <Button 
              variant="outline"
              className="w-full bg-transparent border border-[#4a85ff]/20
                hover:border-[#4a85ff] hover:bg-[#4a85ff]/10 hover:text-[#4a85ff] 
                transition-all duration-300 hover:shadow-[0_0_15px_rgba(74,133,255,0.2)]"
            >
              {card.buttonText}
            </Button>
          </div>
        ))}
      </div>

      {/* Additional Resources */}
      <div className="flex flex-col items-center gap-4 mt-32">
        <h2 className="text-xl font-medium opacity-50">Additional Resources</h2>
        <div className="flex gap-4">
          {additionalResources.map((resource) => (
            <a
              key={resource.title}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm rounded-md 
                backdrop-blur-sm bg-white/5 dark:bg-black/20
                border border-[#4a85ff]/20 
                hover:border-[#4a85ff]/40
                hover:bg-[#4a85ff]/5
                transition-all duration-300
                hover:shadow-[0_0_15px_rgba(74,133,255,0.2)]"
            >
              {resource.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
