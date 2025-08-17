import { useCallback, useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

interface TrackingData {
  actionType: string
  actionName: string
  pagePath?: string
  metadata?: Record<string, any>
  walletId?: string
}

interface ErrorData {
  errorType: string
  message: string
  stack?: string
  metadata?: Record<string, any>
}

interface TrackingSession {
  sessionId: string | null
  isTracking: boolean
}

export function useTracking() {
  const { publicKey, connected } = useWallet()
  const [session, setSession] = useState<TrackingSession>({
    sessionId: null,
    isTracking: false,
  })
  const [isLoading, setIsLoading] = useState(false)

  // Initialize session on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('tracking_session_id')
    if (storedSessionId) {
      setSession(prev => ({ ...prev, sessionId: storedSessionId }))
    }
  }, [])

  const trackWalletConnection = useCallback(async (walletId: string) => {
    try {
      setSession(prev => ({ ...prev, isTracking: true }))
      
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId,
          actionType: 'wallet_connection',
          actionName: 'wallet_connected',
          pagePath: window.location.pathname,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setSession({
          sessionId: data.sessionId,
          isTracking: false,
        })
        localStorage.setItem('tracking_session_id', data.sessionId)
        console.log('Wallet connection tracked successfully')
      }
    } catch (error) {
      console.error('Failed to track wallet connection:', error)
      setSession(prev => ({ ...prev, isTracking: false }))
    }
  }, [])

  const trackWalletDisconnection = useCallback(async () => {
    try {
      if (!session.sessionId) return

      await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: 'disconnected',
          sessionId: session.sessionId,
          actionType: 'wallet_connection',
          actionName: 'wallet_disconnected',
          pagePath: window.location.pathname,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        }),
      })

      setSession({ sessionId: null, isTracking: false })
      localStorage.removeItem('tracking_session_id')
      console.log('Wallet disconnection tracked successfully')
    } catch (error) {
      console.error('Failed to track wallet disconnection:', error)
    }
  }, [session.sessionId])

  // Track wallet connection/disconnection
  useEffect(() => {
    if (connected && publicKey) {
      trackWalletConnection(publicKey.toString())
    } else if (!connected && session.sessionId) {
      trackWalletDisconnection()
    }
  }, [connected, publicKey, session.sessionId, trackWalletConnection, trackWalletDisconnection])

  const trackAction = useCallback(async (data: TrackingData) => {
    try {
      setIsLoading(true)
      
      const trackingData = {
        ...data,
        sessionId: session.sessionId,
        walletId: data.walletId || (connected ? publicKey?.toString() : undefined),
        pagePath: data.pagePath || window.location.pathname,
        metadata: {
          timestamp: new Date().toISOString(),
          ...data.metadata,
        },
      }

      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingData),
      })

      if (!response.ok) {
        throw new Error('Failed to track action')
      }

      const result = await response.json()
      
      // Store session ID if it's new
      if (result.sessionId && !session.sessionId) {
        setSession(prev => ({ ...prev, sessionId: result.sessionId }))
        localStorage.setItem('tracking_session_id', result.sessionId)
      }

      return result
    } catch (error) {
      console.error('Tracking error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [session.sessionId, connected, publicKey])

  const logError = useCallback(async (data: ErrorData) => {
    try {
      const errorData = {
        ...data,
        sessionId: session.sessionId,
        walletId: connected ? publicKey?.toString() : undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          ...data.metadata,
        },
      }

      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      })

      if (!response.ok) {
        throw new Error('Failed to log error')
      }

      return await response.json()
    } catch (error) {
      console.error('Error logging error:', error)
      throw error
    }
  }, [session.sessionId, connected, publicKey])

  const trackPageView = useCallback((pagePath?: string, metadata?: Record<string, any>) => {
    return trackAction({
      actionType: 'page_view',
      actionName: 'page_visited',
      pagePath: pagePath || window.location.pathname,
      metadata,
    })
  }, [trackAction])

  const trackButtonClick = useCallback((buttonName: string, metadata?: Record<string, any>) => {
    return trackAction({
      actionType: 'button_click',
      actionName: buttonName,
      metadata,
    })
  }, [trackAction])

  const trackFormSubmit = useCallback((formName: string, metadata?: Record<string, any>) => {
    return trackAction({
      actionType: 'form_submit',
      actionName: formName,
      metadata,
    })
  }, [trackAction])

  const trackTransaction = useCallback((txType: string, txSignature?: string, metadata?: Record<string, any>) => {
    if (!connected || !publicKey) {
      console.warn('Cannot track transaction: wallet not connected')
      return
    }

    return trackAction({
      actionType: 'transaction',
      actionName: txType,
      metadata: {
        txSignature,
        ...metadata,
      },
    })
  }, [trackAction, connected, publicKey])

  const trackError = useCallback((errorType: string, errorMessage: string, metadata?: Record<string, any>) => {
    return trackAction({
      actionType: 'error',
      actionName: errorType,
      metadata: {
        errorMessage,
        ...metadata,
      },
    })
  }, [trackAction])

  return {
    session,
    isLoading,
    trackAction,
    logError,
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
    trackTransaction,
    trackError,
    isConnected: connected,
    walletId: publicKey?.toString() || null,
  }
}

