"use client"

interface OptionsChainTableProps {
  parameters: { id: string; name: string; visible: boolean }[]
}

export function OptionsChainTable({ parameters }: OptionsChainTableProps) {
  // Mock data - replace with real data later
  const marketPrice = 24.54; // Changed from 25 to 24.54
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

  const isCallITM = (strike: number) => strike < marketPrice;
  const isPutITM = (strike: number) => strike > marketPrice;

  // Function to reorder Call side parameters
  const getCallParameters = (params: typeof parameters) => {
    const orderMap = {
      'iv': 0,
      'volume': 1,
      'oi': 2,
      'rho': 3,
      'vega': 4,
      'gamma': 5,
      'theta': 6,
      'delta': 7,
      'bid': 8,
      'ask': 9
    };

    return [...params].sort((a, b) => 
      (orderMap[a.id as keyof typeof orderMap] ?? 0) - 
      (orderMap[b.id as keyof typeof orderMap] ?? 0)
    );
  };

  // Function to get Put side parameters
  const getPutParameters = (params: typeof parameters) => {
    const orderMap = {
      'bid': 0,
      'ask': 1,
      'delta': 2,
      'theta': 3,
      'gamma': 4,
      'vega': 5,
      'rho': 6,
      'oi': 7,
      'volume': 8,
      'iv': 9
    };

    return [...params].sort((a, b) => 
      (orderMap[a.id as keyof typeof orderMap] ?? 0) - 
      (orderMap[b.id as keyof typeof orderMap] ?? 0)
    );
  };

  return (
    <table className="w-full">
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
            <tr key={i} className="border-t dark:hover:bg-muted/70 hover:bg-gray-100">
              {/* Call Side */}
              {getCallParameters(parameters).map(param => (
                <td 
                  key={`call-${param.id}`} 
                  className={`p-2 text-sm ${
                    isCallITM(row.strike) 
                      ? 'dark:bg-muted/55 bg-gray-200/90' 
                      : ''
                  }`}
                >
                  {row.call[param.id as keyof typeof row.call]?.toFixed(2)}
                </td>
              ))}
              {/* Strike Price */}
              <td className="p-2 text-sm font-bold text-center dark:bg-muted/80 bg-gray-300">
                ${row.strike.toFixed(2)}
              </td>
              {/* Put Side */}
              {getPutParameters(parameters).map(param => (
                <td 
                  key={`put-${param.id}`} 
                  className={`p-2 text-sm ${
                    isPutITM(row.strike) 
                      ? 'dark:bg-muted/55 bg-gray-200/90' 
                      : ''
                  }`}
                >
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