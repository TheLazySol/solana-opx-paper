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
  expirationDate: string
  fromChainAction?: boolean  // Add this property
}

export interface Option {
  strike: number
  call: {
    iv: number
    volume: number
    oi: number
    theta: number
    delta: number
    bid: number
    ask: number
  }
  put: {
    iv: number
    volume: number
    oi: number
    theta: number
    delta: number
    bid: number
    ask: number
  }
}

export function convertOrderToOption(orders: OptionOrder[]): Option[] {
  const optionsMap = new Map<number, Option>()
  
  orders.forEach(order => {
    const strike = order.strike
    if (!optionsMap.has(strike)) {
      optionsMap.set(strike, {
        strike,
        call: { iv: 0, volume: 0, oi: 0, theta: 0, delta: 0, bid: 0, ask: 0 },
        put: { iv: 0, volume: 0, oi: 0, theta: 0, delta: 0, bid: 0, ask: 0 }
      })
    }
    
    const option = optionsMap.get(strike)!
    const side = order.optionSide === 'call' ? option.call : option.put
    
    // Update volume based on order size
    side.volume += order.size || 1
    
    // Set prices as before
    if (order.type === 'sell') {
      side.ask = order.price
    } else {
      side.bid = order.price
    }
  })

  return Array.from(optionsMap.values())
} 