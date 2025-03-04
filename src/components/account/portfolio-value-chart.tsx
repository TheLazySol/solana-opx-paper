'use client'

import { useState } from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Helper to generate dates
const generatePastDate = (daysAgo: number) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper to generate YTD dates for 2025
const generateYTDDate = (dayOffset: number) => {
  const startDate = new Date(2025, 0, 1) // Jan 1, 2025
  const date = new Date(startDate)
  date.setDate(startDate.getDate() + dayOffset)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Mock data for rolling 30 days
const thirtyDayData = Array.from({ length: 30 }, (_, i) => ({
  date: generatePastDate(29 - i),
  value: 500 + Math.random() * 100 + (i * 2)
})).map(item => ({
  ...item,
  value: Number(item.value.toFixed(2))
}))

// Mock data for 2025 YTD (daily values)
const getDaysInYTD = () => {
  const start = new Date(2025, 0, 1) // Jan 1, 2025
  const today = new Date()
  const millisecondsPerDay = 1000 * 60 * 60 * 24
  return Math.floor((today.getTime() - start.getTime()) / millisecondsPerDay)
}

const ytdData = Array.from({ length: getDaysInYTD() }, (_, i) => ({
  date: generateYTDDate(i),
  value: 500 + Math.random() * 100 + (i * 0.5) // Smaller daily increments for smoother line
})).map(item => ({
  ...item,
  value: Number(item.value.toFixed(2))
}))

type TimeRange = '30D' | 'YTD'

export function PortfolioValueChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30D')

  const data = timeRange === '30D' ? thirtyDayData : ytdData

  return (
    <Card className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">Portfolio Value</CardTitle>
        <div className="flex gap-2">
          <Button 
            variant={timeRange === '30D' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30D')}
            className="text-sm"
          >
            30D
          </Button>
          <Button 
            variant={timeRange === 'YTD' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('YTD')}
            className="text-sm"
          >
            YTD
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis 
                dataKey="date"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval={timeRange === 'YTD' ? 30 : 4}
                angle={-45}
                textAnchor="end"
                height={60}
                dy={16}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {payload[0].payload.date}
                          </span>
                          <span className="font-bold text-muted-foreground">
                            ${payload[0].value}
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4a85ff"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 