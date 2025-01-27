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
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] gap-8">
      <h1 className="text-7xl font-light tracking-wide text-center
        [text-shadow:_0_0_30px_rgba(255,255,255,0.5),_0_0_60px_rgba(255,255,255,0.2)]
        transition-all duration-300 hover:[text-shadow:_0_0_40px_rgba(255,255,255,0.6),_0_0_80px_rgba(255,255,255,0.3)]">
        Epicentral DOEX
      </h1>
      <p className="text-xl text-muted-foreground">
        The first decentralized options exchange on Solana
      </p>

      <Button 
        className="bg-background hover:bg-background text-foreground border-2 
          hover:border-[#4a85ff] hover:shadow-[0_0_15px_rgba(74,133,255,0.3)] 
          transition-all duration-300"
        size="lg"
      >
        Trade Now
      </Button>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
        {resources.map((resource) => (
          <Card 
            key={resource.title}
            className="border border-gray-200 dark:border-0 dark:bg-gradient-to-b dark:from-[#101010] dark:to-[#000000]"
          >
            <CardHeader>
              <CardTitle className="text-xl font-semibold">{resource.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {resource.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Resources */}
      <div className="flex flex-col items-center gap-4 mt-16">
        <h2 className="text-2xl font-semibold">Additional Resources</h2>
        <div className="flex gap-4">
          {additionalResources.map((resource) => (
            <a
              key={resource.title}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-md border border-gray-200 dark:border-gray-800 hover:border-[#4a85ff] hover:shadow-[0_0_15px_rgba(74,133,255,0.3)] transition-all duration-300"
            >
              {resource.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
