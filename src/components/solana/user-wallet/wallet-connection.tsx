'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from './wallet-connect'
import { useTracking } from '@/hooks/useTracking'
import { useEffect } from 'react'

export default function AccountListFeature() {
  const { publicKey } = useWallet()
  const { 
    session, 
    trackButtonClick, 
    trackPageView, 
    isConnected, 
    walletId 
  } = useTracking()

  // Track page view when component mounts
  useEffect(() => {
    trackPageView('/wallet-connection', {
      componentName: 'AccountListFeature',
      loadTime: new Date().toISOString(),
    }).catch(error => {
      console.warn('Failed to track page view:', error)
    })
  }, [trackPageView])

  // Handle wallet connect button click tracking
  const handleConnectClick = async () => {
    try {
      await trackButtonClick('connect_wallet_button', {
        buttonLocation: 'account_list_feature',
        userIntent: 'wallet_connection',
      })
    } catch (error) {
      console.warn('Failed to track connect wallet click:', error)
    }
  }

  return (
    <div className="hero py-[64px]">
      <div className="hero-content text-center">
        <div className="flex flex-col items-center gap-4">
          {!isConnected ? (
            <>
              <h2 className="text-xl font-semibold">Connect your wallet</h2>
              <p className="text-muted-foreground mb-2">Connect your wallet to access your account</p>
              <div onClick={handleConnectClick}>
                <WalletButton />
              </div>
              
              {/* Tracking Status Indicator */}
              <div className="text-xs text-muted-foreground mt-2">
                Tracking Status: {session.isTracking ? 'Recording...' : 'Ready'}
                {session.sessionId && (
                  <span className="ml-2 text-green-600">
                    Session: {session.sessionId.slice(-6)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">Wallet connected</h2>
              <p className="text-muted-foreground">
                Your wallet is connected: {walletId?.slice(0, 4)}...{walletId?.slice(-4)}
              </p>

              {/* Example tracking buttons for testing */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Test Tracking (click these!):</h3>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => trackButtonClick('airdrop_button', { amount: '1 SOL' }).catch(console.warn)}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                  >
                    Request Airdrop
                  </button>
                  <button
                    onClick={() => trackButtonClick('swap_button', { from: 'SOL', to: 'USDC' }).catch(console.warn)}
                    className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                  >
                    Swap Tokens
                  </button>
                  <button
                    onClick={() => trackButtonClick('settings_button', { section: 'rpc_settings' }).catch(console.warn)}
                    className="text-xs px-3 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                  >
                    Open Settings
                  </button>
                </div>
              </div>

              {/* Session Info */}
              <div className="text-xs text-muted-foreground mt-4 p-3 bg-gray-50 rounded">
                <div className="space-y-1">
                  <div><strong>Session ID:</strong> {session.sessionId?.slice(-8) || 'None'}</div>
                  <div><strong>Wallet ID:</strong> {walletId?.slice(0, 8)}...</div>
                  <div><strong>Status:</strong> {session.isTracking ? 'Tracking' : 'Idle'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
