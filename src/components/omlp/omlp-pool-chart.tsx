'use client'

import { 
  Dialog, 
  DialogContent as ShadcnDialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogClose,
  DialogPortal,
  DialogOverlay
} from '@/components/ui/dialog'
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { cn } from '@/lib/misc/utils'
import React from 'react'

// Custom DialogContent without the default close button
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className='bg-black/40'/>
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-6 shadow-lg duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 transition-all rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

interface OmlpChartProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  poolData: {
    token: string
    supply: number
    supplyApy: number
    borrowed: number
    borrowApy: number
    utilization: number
  }
}

export function OmlpChart({ open, onOpenChange, poolData }: OmlpChartProps) {
  // Static historical data with more data points for smoother lines
  const staticData = [
    {
      name: 'Jan',
      supplyApy: 16.2,
      borrowApy: 22.5,
      utilization: 75.2
    },
    {
      name: 'Feb',
      supplyApy: 14.2,
      borrowApy: 19.5,
      utilization: 73.6
    },
    {
      name: 'Mar',
      supplyApy: 17.8,
      borrowApy: 24.8,
      utilization: 76.4
    },
    {
      name: 'Apr',
      supplyApy: 17.0,
      borrowApy: 23.3,
      utilization: 75.5
    },
    {
      name: 'May',
      supplyApy: 18.5,
      borrowApy: 25.6,
      utilization: 77.9
    },
    {
      name: 'Jun',
      supplyApy: 28.0,
      borrowApy: 35.0,
      utilization: 95.0 // Dramatic increase for visual effect
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 rounded-lg shadow">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {poolData.token} Pool Performance
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription>
            Historical APY and utilization rates for the {poolData.token} pool
          </DialogDescription>
        </DialogHeader>
        
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={staticData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 30,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey="name" 
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                orientation="left"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#111', 
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value) => [`${value}%`, '']}
              />
              <Legend />
              <Line 
                type="monotone"
                dataKey="supplyApy" 
                name="Supply APY" 
                stroke="#4ade80" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone"
                dataKey="borrowApy" 
                name="Borrow APY" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone"
                dataKey="utilization" 
                name="Utilization" 
                stroke="#4a85ff" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-black/20 p-4 text-center">
            <div className="text-sm text-muted-foreground">Current Supply APY</div>
            <div className="text-xl font-semibold text-green-500">28.0%</div>
          </div>
          <div className="rounded-lg bg-black/20 p-4 text-center">
            <div className="text-sm text-muted-foreground">Current Borrow APY</div>
            <div className="text-xl font-semibold text-red-500">35.0%</div>
          </div>
          <div className="rounded-lg bg-black/20 p-4 text-center">
            <div className="text-sm text-muted-foreground">Current Utilization</div>
            <div className="text-xl font-semibold text-blue-500">95.0%</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 