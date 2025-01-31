import { useState, useEffect } from 'react'

export function usePageVisibility() {
  // Initialize with true and update after mount
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Only access document after component mounts
    if (typeof document !== 'undefined') {
      setIsVisible(!document.hidden)

      const handleVisibilityChange = () => {
        setIsVisible(!document.hidden)
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [])

  return isVisible
} 