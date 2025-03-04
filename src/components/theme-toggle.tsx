"use client"

import * as React from "react"
import { Moon } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  // Force dark theme on mount
  React.useEffect(() => {
    setTheme("dark")
  }, [setTheme])

  return (
    <button
      className="border rounded-md w-6 h-6 flex items-center justify-center cursor-default"
    >
      <Moon className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Dark theme</span>
    </button>
  )
} 