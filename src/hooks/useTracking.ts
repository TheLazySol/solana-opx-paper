import { useCallback, useEffect, useState } from 'react'

interface TrackingData {
  actionType: string
  actionName: string
  pagePath?: string
  metadata?: Record<string, any>
}

interface ErrorData {
  errorType: string
  message: string
  stack?: string
  metadata?: Record<string, any>
}

export function useTracking() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize session on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('tracking_session_id')
    if (storedSessionId) {
      setSessionId(storedSessionId)
    }
  }, [])

  const trackAction = useCallback(async (data: TrackingData) => {
    try {
      setIsLoading(true)
      
      const trackingData = {
        ...data,
        sessionId,
        pagePath: data.pagePath || window.location.pathname,
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
      if (result.sessionId && !sessionId) {
        setSessionId(result.sessionId)
        localStorage.setItem('tracking_session_id', result.sessionId)
      }

      return result
    } catch (error) {
      console.error('Tracking error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  const logError = useCallback(async (data: ErrorData) => {
    try {
      const errorData = {
        ...data,
        sessionId,
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
  }, [sessionId])

  const trackPageView = useCallback((pagePath?: string) => {
    return trackAction({
      actionType: 'page_view',
      actionName: 'page_view',
      pagePath: pagePath || window.location.pathname,
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

  return {
    sessionId,
    isLoading,
    trackAction,
    logError,
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
  }
}

