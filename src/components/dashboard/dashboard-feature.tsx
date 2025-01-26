'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink } from 'lucide-react'

const resources = [
  {
    title: 'Documentation',
    description: 'Official Solana documentation and guides',
    href: 'https://docs.solana.com',
  },
  {
    title: 'Developer Resources',
    description: 'Tools and resources for Solana developers',
    href: 'https://solana.com/developers',
  },
  {
    title: 'Cookbook',
    description: 'Code recipes and best practices',
    href: 'https://solanacookbook.com',
  },
]

export default function DashboardFeature() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] px-4">
      {/* Hero Section */}
      <div className="max-w-4xl w-full text-center space-y-12 mb-16">
        <div className="space-y-6">
          <h1 className="text-7xl font-bold tracking-tight">
            Epicentral DOEX
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A decentralized options exchange created by Epicentral Labs
          </p>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
        {resources.map((resource) => (
          <Card key={resource.title} className="hover:shadow-[0_0_15px_rgba(74,133,255,0.3)] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {resource.title}
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="ghost" 
                className="w-full justify-start hover:bg-[#4a85ff]/10"
                onClick={() => window.open(resource.href, '_blank')}
              >
                Learn more
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Resources */}
      <div className="mt-12 text-center">
        <h2 className="text-xl font-semibold mb-6">Additional Resources</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => window.open('https://faucet.solana.com', '_blank')}
            className="hover:bg-[#4a85ff]/10 hover:border-[#4a85ff]"
          >
            Solana Faucet
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open('https://solana.stackexchange.com', '_blank')}
            className="hover:bg-[#4a85ff]/10 hover:border-[#4a85ff]"
          >
            Stack Overflow
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open('https://github.com/solana-developers', '_blank')}
            className="hover:bg-[#4a85ff]/10 hover:border-[#4a85ff]"
          >
            GitHub
          </Button>
        </div>
      </div>
    </div>
  )
}
