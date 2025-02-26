/**
 * A constant object storing token details, including their blockchain address and decimals.
 * 
 * Each token symbol maps to an object containing:
 * - `address`: The Solana blockchain address of the token.
 * - `decimals`: The number of decimal places the token uses.
 */
export const TOKENS = {
    SOL: {
      address: 'So11111111111111111111111111111111111111112',
      decimals: 9
    },
    LABS: {
      address: 'LABSh5DTebUcUbEoLzXKCiXFJLecDFiDWiBGUU1GpxR',
      decimals: 9
    }
  } as const
  