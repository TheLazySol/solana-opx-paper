'use client'

import { Button } from '../ui/button'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/misc/utils'

type Position = {
  token: string
  amount: number
  apy: number
  earned: number
}

const mockPositions: Position[] = [
  {
    token: 'SOL',
    amount: 231.29,
    apy: 30.21,
    earned: 0.11,
  },
]

export function MyLendingPositions() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold">My Lendings / Collateral</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: '#4a85ff' }}>
            TVL: ${mockPositions.reduce((acc, pos) => acc + pos.amount, 0).toFixed(2)}
          </span>
          <span className="text-sm" style={{ color: '#4a85ff' }}>
            Total earned: ${mockPositions.reduce((acc, pos) => acc + pos.earned, 0).toFixed(2)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={handleRefresh}
          >
            <RefreshCw
              className={cn(
                'h-4 w-4 text-muted-foreground',
                isRefreshing && 'animate-spin'
              )}
            />
          </Button>
        </div>
      </div>
      
      <div className="border-t">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4">Pool</th>
              <th className="text-right p-4">Amount</th>
              <th className="text-right p-4">APY</th>
              <th className="text-right p-4">Earned</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {mockPositions.map((position, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-4">{position.token}</td>
                <td className="text-right p-4">${position.amount.toFixed(2)}</td>
                <td className="text-right p-4">{position.apy.toFixed(2)}%</td>
                <td className="text-right p-4 text-green-500">${position.earned.toFixed(2)}</td>
                <td className="p-4 flex justify-end gap-2">
                  <Button variant="outline">Withdraw</Button>
                  <Button>Deposit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 