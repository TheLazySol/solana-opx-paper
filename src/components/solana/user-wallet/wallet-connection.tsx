'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from './wallet-connect'

export default function AccountListFeature() {
  const { publicKey } = useWallet()

  return (
    <div className="hero py-[64px]">
      <div className="hero-content text-center">
        <div className="flex flex-col items-center gap-4">
          {!publicKey ? (
            <>
              <h2 className="text-xl font-semibold">Connect your wallet</h2>
              <p className="text-muted-foreground mb-2">Connect your wallet to access your account</p>
              <WalletButton />
            </>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-semibold">Wallet connected</h2>
              <p className="text-muted-foreground">Your wallet is connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
