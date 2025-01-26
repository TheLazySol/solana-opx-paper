'use client'

import { AppHero } from '../ui/ui-layout'

const links: { label: string; href: string }[] = [
  { label: 'Solana Docs', href: 'https://docs.solana.com/' },
  { label: 'Solana Faucet', href: 'https://faucet.solana.com/' },
  { label: 'Solana Cookbook', href: 'https://solanacookbook.com/' },
  { label: 'Solana Stack Overflow', href: 'https://solana.stackexchange.com/' },
  { label: 'Solana Developers GitHub', href: 'https://github.com/solana-developers/' },
]

export default function DashboardFeature() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] px-4">
      {/* Main Content */}
      <div className="max-w-3xl w-full text-center space-y-12">
        {/* Header Section */}
        <div className="space-y-6">
          <h1 className="text-7xl font-bold tracking-tight">gm</h1>
          <p className="text-xl text-muted-foreground">
            Say hi to your new Solana dApp.
          </p>
        </div>

        {/* Links Section */}
        <div className="space-y-6">
          <h2 className="text-xl">
            Here are some helpful links to get you started.
          </h2>
          
          <div className="grid gap-4 max-w-md mx-auto">
            <a 
              href="https://docs.solana.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              Solana Docs
            </a>
            <a 
              href="https://faucet.solana.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              Solana Faucet
            </a>
            <a 
              href="https://cookbook.solana.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              Solana Cookbook
            </a>
            <a 
              href="https://stackoverflow.com/questions/tagged/solana" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              Solana Stack Overflow
            </a>
            <a 
              href="https://github.com/solana-developers" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              Solana Developers GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
