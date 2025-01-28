"use client"

interface OptionsChainTableProps {
  parameters: { id: string; name: string; visible: boolean }[]
}

export function OptionsChainTable({ parameters }: OptionsChainTableProps) {
  // Mock data - replace with real data later
  const strikes = Array.from({ length: 10 }, (_, i) => ({
    strike: 20 + i,
    call: {
      iv: Math.random() * 100,
      volume: Math.floor(Math.random() * 1000),
      oi: Math.floor(Math.random() * 5000),
      theta: -(Math.random() * 0.1),
      delta: Math.random(),
      bid: 1.5 + Math.random(),
      ask: 1.7 + Math.random(),
    },
    put: {
      iv: Math.random() * 100,
      volume: Math.floor(Math.random() * 1000),
      oi: Math.floor(Math.random() * 5000),
      theta: -(Math.random() * 0.1),
      delta: -Math.random(),
      bid: 1.5 + Math.random(),
      ask: 1.7 + Math.random(),
    }
  }))

  return (
    <table className="w-full min-w-[800px]">
      <thead>
        <tr className="bg-muted/50">
          {/* Call Parameters */}
          {parameters.map(param => (
            <th key={`call-${param.id}`} className="p-2 text-sm">
              {param.name}
            </th>
          ))}
          <th className="p-2 text-sm font-bold">Strike</th>
          {/* Put Parameters */}
          {parameters.map(param => (
            <th key={`put-${param.id}`} className="p-2 text-sm">
              {param.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {strikes.map((row, i) => (
          <tr key={i} className="border-t hover:bg-muted/50">
            {/* Call Side */}
            {parameters.map(param => (
              <td key={`call-${param.id}`} className="p-2 text-sm">
                {row.call[param.id as keyof typeof row.call]?.toFixed(2)}
              </td>
            ))}
            {/* Strike Price */}
            <td className="p-2 text-sm font-bold text-center">
              ${row.strike.toFixed(2)}
            </td>
            {/* Put Side */}
            {parameters.map(param => (
              <td key={`put-${param.id}`} className="p-2 text-sm">
                {row.put[param.id as keyof typeof row.put]?.toFixed(2)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
} 