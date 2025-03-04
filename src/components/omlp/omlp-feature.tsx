'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../wallet/wallet-button'
import { MyLendingPositions } from './my-lending-positions'
import { LendingPools } from './lending-pools'

export function OMLPFeature() {
  const { publicKey } = useWallet()

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <div className="flex flex-col items-center gap-6">
          <p className="text-lg text-muted-foreground">
            Connect wallet to access Option Margin Lending Pool
          </p>
          <div className="flex justify-center">
            <WalletButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-center">
          Option Margin Lending Pool
        </h1>
        <p className="text-center text-muted-foreground mt-2">
          Lend tokens to provide liquidity for option market makers.
        </p>
      </div>
      
      <MyLendingPositions />
      <LendingPools />
    </div>
  )
} 