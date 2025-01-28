"use client"

interface OptionsChainTableProps {
  parameters: { id: string; name: string; visible: boolean }[]
}

export function OptionsChainTable({ parameters }: OptionsChainTableProps) {
  // Mock data - replace with real data later
  const marketPrice = 25; // Example market price
  const strikes = Array.from({ length: 10 }, (_, i) => ({
    strike: 20 + i,
    isMarketPrice: 20 + i === Math.floor(marketPrice) || (20 + i < marketPrice && 21 + i > marketPrice),
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

  // Function to reorder Call side parameters
  const getCallParameters = (params: typeof parameters) => {
    const baseParams = params.filter(p => !['gamma', 'vega', 'rho'].includes(p.id));
    const greeks = params.filter(p => ['gamma', 'vega', 'rho'].includes(p.id));
    
    // Find index after OI and before Theta
    const oiIndex = baseParams.findIndex(p => p.id === 'oi');
    
    // Order: Rho, Vega, Gamma for Call side
    const orderedGreeks = greeks.sort((a, b) => {
      const order = { rho: 0, vega: 1, gamma: 2 };
      return order[a.id as keyof typeof order] - order[b.id as keyof typeof order];
    });

    return [
      ...baseParams.slice(0, oiIndex + 1),
      ...orderedGreeks,
      ...baseParams.slice(oiIndex + 1)
    ];
  };

  // Function to get Put side parameters with correct order and Bid/Ask flipped
  const getPutParameters = (params: typeof parameters) => {
    const baseParams = params.filter(p => !['gamma', 'vega', 'rho'].includes(p.id));
    const greeks = params.filter(p => ['gamma', 'vega', 'rho'].includes(p.id));
    
    // Find index after OI and before Theta
    const oiIndex = baseParams.findIndex(p => p.id === 'oi');
    
    // Order: Gamma, Vega, Rho for Put side
    const orderedGreeks = greeks.sort((a, b) => {
      const order = { gamma: 0, vega: 1, rho: 2 };
      return order[a.id as keyof typeof order] - order[b.id as keyof typeof order];
    });

    // Create the full ordered array
    const ordered = [
      ...baseParams.slice(0, oiIndex + 1),
      ...orderedGreeks,
      ...baseParams.slice(oiIndex + 1)
    ];

    // Flip bid/ask
    const result = [...ordered];
    const bidIndex = result.findIndex(p => p.id === 'bid');
    const askIndex = result.findIndex(p => p.id === 'ask');
    if (bidIndex !== -1 && askIndex !== -1) {
      [result[bidIndex], result[askIndex]] = [result[askIndex], result[bidIndex]];
    }
    
    return result.reverse();
  };

  return (
    <table className="w-full min-w-[800px]">
      <thead>
        <tr className="bg-muted/50">
          {/* Call Parameters */}
          {getCallParameters(parameters).map(param => (
            <th key={`call-${param.id}`} className="p-2 text-sm">
              {param.name}
            </th>
          ))}
          <th className="p-2 text-sm font-bold bg-muted/50 dark:bg-muted/50 bg-gray-100">Strike</th>
          {/* Put Parameters */}
          {getPutParameters(parameters).map(param => (
            <th key={`put-${param.id}`} className="p-2 text-sm">
              {param.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {strikes.map((row, i) => (
          <>
            <tr key={i} className="border-t hover:bg-muted/50">
              {/* Call Side */}
              {getCallParameters(parameters).map(param => (
                <td key={`call-${param.id}`} className="p-2 text-sm">
                  {row.call[param.id as keyof typeof row.call]?.toFixed(2)}
                </td>
              ))}
              {/* Strike Price */}
              <td className="p-2 text-sm font-bold text-center bg-muted/50 dark:bg-muted/50 bg-gray-100">
                ${row.strike.toFixed(2)}
              </td>
              {/* Put Side */}
              {getPutParameters(parameters).map(param => (
                <td key={`put-${param.id}`} className="p-2 text-sm">
                  {row.put[param.id as keyof typeof row.put]?.toFixed(2)}
                </td>
              ))}
            </tr>
            {row.isMarketPrice && (
              <tr className="market-price-row">
                <td colSpan={parameters.length * 2 + 1} className="p-0">
                  <div className="relative">
                    <div className="absolute w-full border-t-2 border-blue-500" />
                    <div className="absolute right-4 -top-3 bg-background px-2 text-xs text-blue-500">
                      Market Price: ${marketPrice}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </>
        ))}
      </tbody>
    </table>
  )
} 