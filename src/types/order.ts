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
  volume?: number
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
  
  // First, initialize the map with all unique strike prices
  orders.forEach(order => {
    const strike = order.strike
    if (!optionsMap.has(strike)) {
      optionsMap.set(strike, {
        strike,
        call: { iv: 0, volume: 0, oi: 0, theta: 0, delta: 0, bid: 0, ask: 0 },
        put: { iv: 0, volume: 0, oi: 0, theta: 0, delta: 0, bid: 0, ask: 0 }
      })
    }
  })

  // Then process all orders to update prices and volumes
  orders.forEach(order => {
    const option = optionsMap.get(order.strike)!
    const side = order.optionSide === 'call' ? option.call : option.put
    
    // Update volume for all trades and mints
    const orderSize = order.size || 1
    
    // For minted options (type: 'sell' with no prior interaction)
    if (order.type === 'sell' && !order.fromChainAction) {
      side.volume += orderSize * 2  // Count both sides of the trade
      side.ask = order.price
    } 
    // For regular trades
    else {
      side.volume += orderSize
      if (order.type === 'sell') {
        side.ask = order.price
      } else if (order.type === 'buy') {
        side.bid = order.price
      }
    }
  })

  return Array.from(optionsMap.values())
} 