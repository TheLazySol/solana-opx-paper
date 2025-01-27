'use client'

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Button } from '../ui/button'

export function WalletButton() {
  return (
    <WalletMultiButton
      className="wallet-adapter-button-trigger"
    />
  )
} 