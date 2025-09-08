/**
 * A constant object storing token details, including their blockchain address and decimals.
 * 
 * Each token symbol maps to an object containing:
 * - `address`: The Solana blockchain address of the token.
 * - `decimals`: The number of decimal places the token uses (on-chain).
 * - `displayDecimals`: The number of decimal places to show in the UI.
 * - `symbol`: The token's symbol.
 * - `name`: The token's full name.
 */
export const TOKENS = {
    SOL: {
      address: 'So11111111111111111111111111111111111111112',
      decimals: 9,
      displayDecimals: 2,
      symbol: 'SOL',
      name: 'Solana'
    }
    // Add more tokens here that we wish to list on the exchange.
  } as const

// Helper function to get display decimals with a default of 2
export const getTokenDisplayDecimals = (symbol: string): number => {
  return TOKENS[symbol as keyof typeof TOKENS]?.displayDecimals ?? 2
}
  