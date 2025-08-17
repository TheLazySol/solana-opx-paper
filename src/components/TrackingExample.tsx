'use client'

import { useTracking } from '@/hooks/useTracking'
import { useEffect } from 'react'

export function TrackingExample() {
  const { trackButtonClick, trackPageView, logError, isLoading } = useTracking()

  useEffect(() => {
    // Track page view when component mounts
    trackPageView()
  }, [trackPageView])

  const handleTradeClick = async () => {
    try {
      await trackButtonClick('trade_button', {
        action: 'buy',
        amount: 100,
        token: 'SOL',
      })
      console.log('Trade action tracked successfully')
    } catch (error) {
      console.error('Failed to track trade action:', error)
    }
  }

  const handleWalletConnect = async () => {
    try {
      await trackButtonClick('connect_wallet', {
        walletType: 'phantom',
        timestamp: new Date().toISOString(),
      })
      console.log('Wallet connect action tracked successfully')
    } catch (error) {
      console.error('Failed to track wallet connect:', error)
    }
  }

  const handleErrorExample = async () => {
    try {
      // Simulate an error
      throw new Error('Example error for testing')
    } catch (error) {
      await logError({
        errorType: 'example_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        metadata: {
          component: 'TrackingExample',
          timestamp: new Date().toISOString(),
        },
      })
      console.log('Error logged successfully')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">Tracking Example</h2>
      <p className="text-gray-600">
        This component demonstrates how to use the tracking functionality.
        Check the browser console and database for tracked actions.
      </p>
      
      <div className="space-y-2">
        <button
          onClick={handleTradeClick}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Tracking...' : 'Track Trade Action'}
        </button>
        
        <button
          onClick={handleWalletConnect}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-2"
        >
          {isLoading ? 'Tracking...' : 'Track Wallet Connect'}
        </button>
        
        <button
          onClick={handleErrorExample}
          disabled={isLoading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 ml-2"
        >
          {isLoading ? 'Logging...' : 'Log Example Error'}
        </button>
      </div>
      
      <div className="text-sm text-gray-500">
        <p>API Endpoints:</p>
        <ul className="list-disc list-inside ml-4">
          <li>POST /api/tracking - Track user actions</li>
          <li>GET /api/tracking - Get tracking statistics</li>
          <li>POST /api/errors - Log errors</li>
          <li>GET /api/errors - Get error statistics</li>
        </ul>
      </div>
    </div>
  )
}

