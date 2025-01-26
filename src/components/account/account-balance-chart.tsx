'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts'
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
    <div className="w-full mt-8 mb-4">
      <div className="h-[200px] relative">
        <div className="absolute top-0 left-0 text-gray-500 text-sm z-10">Last 30 Days</div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 30, right: 10, left: 10, bottom: 30 }}
          >
            <defs>
              <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4a85ff" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#4a85ff" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <ReferenceLine 
              y={0} 
              stroke="#333333"
              strokeDasharray="2 4"
              strokeWidth={1}
              isFront={false}
            />
            <XAxis 
              dataKey="timestamp" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 11 }}
              dy={10}
              tickMargin={15}
              interval="preserveEnd"
            />
            <YAxis 
              hide={true}
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            <Tooltip 
              contentStyle={{ 
                background: '#101010', 
                border: '1px solid rgba(74,133,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              labelStyle={{ color: '#666', marginBottom: '4px' }}
              itemStyle={{ color: '#fff', fontSize: '14px' }}
              formatter={(value: number) => [
                <span key="value" className={value >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {value >= 0 ? '+' : ''}{value.toFixed(2)}%
                </span>,
                'Change'
              ]}
              cursor={{ stroke: '#4a85ff', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="percentageChange"
              stroke="#4a85ff"
              strokeWidth={1.5}
              fill="url(#gradientArea)"
              dot={false}
              activeDot={{ 
                r: 4, 
                fill: '#4a85ff',
                stroke: '#101010',
                strokeWidth: 2
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 