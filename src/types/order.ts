import { PublicKey } from '@solana/web3.js'

export type OptionSide = 'call' | 'put'
export type OrderType = 'buy' | 'sell'

export interface OptionOrder {
  publicKey: PublicKey  // Solana account address for the order
  strike: number
  price: number
  bidPrice: number  // Add highest bid price
  askPrice: number  // Add lowest ask price
  type: OrderType
  optionSide: OptionSide
  timestamp: Date
  owner: PublicKey     // Wallet address of the order creator
  // Add other fields we'll need for Solana integration
  mint?: PublicKey     // Token mint address for the option
  optionMint?: PublicKey // The option token mint address
  size?: number        // Number of contracts
  status: 'pending' | 'filled' | 'cancelled'
} 