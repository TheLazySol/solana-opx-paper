'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from './wallet-connect'
import { address } from 'gill'
import { useGetBalance } from '../../../solana/utils/commonHooks'

export function WalletStatus() {
  const { publicKey } = useWallet()

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-xl font-semibold">Connect your wallet</h2>
        <p className="text-muted-foreground mb-2">Connect your wallet to access your account</p>
        <WalletButton />
      </div>
    )
  }

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold">Wallet connected</h2>
      <p className="text-muted-foreground">
        {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
      </p>
    </div>
  )
}

export function WalletBalance() {
  const { publicKey } = useWallet()
  const balance = useGetBalance({ 
    address: publicKey || address("11111111111111111111111111111111") 
  })
  
  if (!publicKey) return null
  if (balance.isLoading) return <span>Loading...</span>
  if (balance.isError) return <span>Error loading balance</span>
  
  return (
    <span>
      {((balance.data ?? 0) / 1000000000).toFixed(4)} SOL
    </span>
  )
}

export function WalletRequiredWrapper({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWallet()

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <div className="flex flex-col items-center gap-6">
          <p className="text-lg text-muted-foreground">
            Connect wallet to view content
          </p>
          <div className="flex justify-center">
            <WalletButton />
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 