'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../wallet/wallet-button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

export function OMLPFeature() {
  const { publicKey } = useWallet()

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <div className="flex flex-col items-center gap-6">
          <p className="text-lg text-muted-foreground">
            Connect wallet to access Option Margin Liquidity Pool
          </p>
          <div className="flex justify-center">
            <WalletButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Option Margin Liquidity Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Content will go here */}
        </CardContent>
      </Card>
    </div>
  )
} 