'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'

// Function to generate last 30 days of mock data
const generateMockData = () => {
  const data = []
  const baseValue = 3.83665 // Current value
  const today = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // Generate some random fluctuation (-5% to +5%)
    const randomChange = (Math.random() - 0.5) * 0.1
    const value = baseValue * (1 + randomChange)
    const percentageChange = ((value - baseValue) / baseValue) * 100

    data.push({
      timestamp: format(date, 'MMM dd'),
      value,
      percentageChange,
      usdValue: value * 100 // Assuming 1 SOL = $100 USD for this example
    })
  }
  return data
}

const data = generateMockData()

export function AccountBalanceChart() {
  return (
    <div className="w-full h-[200px] mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4a85ff" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#4a85ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#4a85ff"
            fillOpacity={1}
            fill="url(#colorValue)"
            strokeWidth={2}
          />
          <XAxis 
            dataKey="timestamp" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#666', fontSize: 12 }}
          />
          <YAxis 
            hide={true}
            domain={['dataMin - 0.1', 'dataMax + 0.1']}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1a1a1a',
              border: 'none',
              borderRadius: '8px',
              padding: '12px'
            }}
            labelStyle={{ color: '#666' }}
            itemStyle={{ color: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
} 