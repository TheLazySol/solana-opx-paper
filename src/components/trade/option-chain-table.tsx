import { FC } from 'react'

interface OptionContract {
  strike: number
  expiry: string | null
  type: 'call' | 'put' | null
  price: number
  volume: number
  openInterest: number
}

export const OptionChainTable: FC = () => {
  // This will be populated with real data later
  const mockData: OptionContract[] = [
    {
      strike: 0,
      expiry: null,
      type: null,
      price: 0,
      volume: 0,
      openInterest: 0,
    },
    // Add more mock data as needed
  ]

  return (
    <div className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
      transition-all duration-300 hover:bg-transparent overflow-hidden shadow-lg rounded-lg p-4">
      <div className="w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-2 text-left text-sm font-medium">Strike</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Expiry</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Type</th>
              <th className="px-4 py-2 text-right text-sm font-medium">Price</th>
              <th className="px-4 py-2 text-right text-sm font-medium">Volume</th>
              <th className="px-4 py-2 text-right text-sm font-medium">Open Interest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockData.map((option, index) => (
              <tr key={index} className="hover:bg-muted/30">
                <td className="px-4 py-2 text-sm">${option.strike}</td>
                <td className="px-4 py-2 text-sm">{option.expiry}</td>
                <td className="px-4 py-2 text-sm capitalize">{option.type}</td>
                <td className="px-4 py-2 text-sm text-right">${option.price.toFixed(2)}</td>
                <td className="px-4 py-2 text-sm text-right">{option.volume}</td>
                <td className="px-4 py-2 text-sm text-right">{option.openInterest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 