// Types for option data
export interface OptionGreeks {
  delta: number
  theta: number
  gamma: number
  vega: number
  rho: number
}

export interface OptionContract {
  strike: number
  expiry: string
  // Call side
  callBid: number
  callAsk: number
  callVolume: number
  callOpenInterest: number
  callGreeks: OptionGreeks
  // Put side
  putBid: number
  putAsk: number
  putVolume: number
  putOpenInterest: number
  putGreeks: OptionGreeks
}

// Mock data generator function
export const generateMockOptionData = (expirationDate: string | null): OptionContract[] => {
  // For now, return a single mock contract
  // In the future, we can expand this to generate more realistic data
  return [
    {
      strike: 0,
      expiry: expirationDate || "2024-12-31",
      callBid: 0,
      callAsk: 0,
      callVolume: 0,
      callOpenInterest: 0,
      callGreeks: {
        delta: 0,
        theta: 0,
        gamma: 0,
        vega: 0,
        rho: 0
      },
      putBid: 0,
      putAsk: 0,
      putVolume: 0,
      putOpenInterest: 0,
      putGreeks: {
        delta: 0,
        theta: 0,
        gamma: 0,
        vega: 0,
        rho: 0
      }
    }
  ]
}

// Selected option type
export interface SelectedOption {
  index: number
  side: 'call' | 'put'
  type: 'bid' | 'ask'
} 