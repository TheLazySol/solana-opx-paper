import * as React from "react"

import { cn } from "@/utils/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg bg-white/5 backdrop-blur-sm px-4 py-3 text-sm transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-white/40",
          "border border-transparent",
          "hover:bg-white/8 hover:border-white/10",
          "focus:outline-none focus:bg-white/10 focus:ring-0 focus:ring-offset-0 focus:border-transparent focus:shadow-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
