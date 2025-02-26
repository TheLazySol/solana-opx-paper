import { useState, useEffect } from 'react'
/**
 * Custom hook to detect page visibility.
 * 
 * This hook listens for the visibility state of the page and provides
 * a boolean value indicating whether the page is currently visible.
 * 
 * @returns {boolean} - `true` if the page is visible, `false` otherwise.
 * 
 * @example
 * const isPageVisible = usePageVisibility();
 * console.log(isPageVisible); // true or false based on visibility
 */
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