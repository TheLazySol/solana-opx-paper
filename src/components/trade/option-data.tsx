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

// Import Black-Scholes model and constants
import { calculateOption } from '@/lib/option-pricing-model/black-scholes-model'
import { 
  SOL_PH_VOLATILITY, 
  SOL_PH_RISK_FREE_RATE,
  OPTION_SPREAD_PERCENTAGE,
  DEFAULT_OPTION_VOLUME,
  DEFAULT_OPTION_OPEN_INTEREST,
  OPTION_STRIKE_PRICES
} from '@/constants/constants'

// Helper function to calculate time until expiry in seconds
/**
 * Calculates the time remaining until option expiry in seconds.
 * 
 * @param expiryDate - The expiration date string for the option
 * @returns The number of seconds until expiry, with a minimum of 0 seconds
 * 
 * This function:
 * 1. Converts the expiry date string to a Date object
 * 2. Gets the current time
 * 3. Calculates difference in milliseconds and converts to seconds
 * 4. Returns max of 0 or the calculated time to prevent negative values
 */
function calculateTimeUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const now = new Date()
  return Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000))
}

// Helper function to calculate option data for a given strike
function calculateOptionData(strike: number, expiryDate: string, spotPrice: number): OptionContract {
  const timeUntilExpiry = calculateTimeUntilExpiry(expiryDate)
  
  // Calculate call option
  const callOption = calculateOption({
    isCall: true,
    strikePrice: strike,
    spotPrice: spotPrice,
    timeUntilExpirySeconds: timeUntilExpiry,
    volatility: SOL_PH_VOLATILITY,
    riskFreeRate: SOL_PH_RISK_FREE_RATE
  })

  // Calculate put option
  const putOption = calculateOption({
    isCall: false,
    strikePrice: strike,
    spotPrice: spotPrice,
    timeUntilExpirySeconds: timeUntilExpiry,
    volatility: SOL_PH_VOLATILITY,
    riskFreeRate: SOL_PH_RISK_FREE_RATE
  })

  // Calculate bid-ask spread (1% spread)
  const callMidPrice = callOption.price
  const putMidPrice = putOption.price
  
  const callBid = callMidPrice * (1 - OPTION_SPREAD_PERCENTAGE / 2)
  const callAsk = callMidPrice * (1 + OPTION_SPREAD_PERCENTAGE / 2)
  const putBid = putMidPrice * (1 - OPTION_SPREAD_PERCENTAGE / 2)
  const putAsk = putMidPrice * (1 + OPTION_SPREAD_PERCENTAGE / 2)

  return {
    strike,
    expiry: expiryDate,
    // Call side
    callBid,
    callAsk,
    callVolume: DEFAULT_OPTION_VOLUME,
    callOpenInterest: DEFAULT_OPTION_OPEN_INTEREST,
    callGreeks: callOption.greeks,
    // Put side
    putBid,
    putAsk,
    putVolume: DEFAULT_OPTION_VOLUME,
    putOpenInterest: DEFAULT_OPTION_OPEN_INTEREST,
    putGreeks: putOption.greeks
  }
}

// Mock data generator function
export const generateMockOptionData = (expirationDate: string | null, spotPrice: number): OptionContract[] => {
  // If no spot price is available, return empty array
  if (!spotPrice) {
    return []
  }

  const expiry = expirationDate || "2024-12-31"

  // Generate option data for each strike
  return OPTION_STRIKE_PRICES.map(strike => calculateOptionData(strike, expiry, spotPrice))
}

// Selected option type
export interface SelectedOption {
  index: number
  asset: string
  strike: number
  expiry: string
  type: 'bid' | 'ask'
  side: 'call' | 'put'
  price: number
  quantity: number
  limitPrice?: number
} 