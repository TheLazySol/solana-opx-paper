import { PublicKey } from '@solana/web3.js'

/**
 * Defines the side of an option.
 * - 'call': A contract that gives the holder the right to buy an asset.
 * - 'put': A contract that gives the holder the right to sell an asset.
 */
export type OptionSide = 'call' | 'put'

/**
 * Defines the type of order.
 * - 'buy': A buy order for the option.
 * - 'sell': A sell order for the option.
 */
export type OrderType = 'buy' | 'sell'
/**
 * Represents an order for an option.
 * 
 * @interface OptionOrder
 * 
 * @property {PublicKey} publicKey - The Solana account address for the order.
 * @property {number} strike - The strike price of the option.
 * @property {number} price - The price at which the option is being traded.
 * @property {number} bidPrice - The highest bid price.
 * @property {number} askPrice - The lowest ask price.
 * @property {OrderType} type - The type of the order (buy or sell).
 * @property {OptionSide} optionSide - Whether the option is a 'call' or 'put'.
 * @property {Date} timestamp - The time at which the order was placed.
 * @property {PublicKey} owner - The wallet address of the order creator.
 * @property {PublicKey} [mint] - The mint address for the option token (optional).
 * @property {PublicKey} [optionMint] - The mint address for the option token (optional).
 * @property {number} [size] - The size (number of contracts) of the order (optional).
 * @property {'pending' | 'filled' | 'cancelled'} status - The current status of the order.
 * @property {string} expirationDate - The expiration date of the option.
 * @property {boolean} [fromChainAction] - Whether the order was triggered by a chain action (optional).
 * @property {number} [volume] - The volume of the order (optional).
 */
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
/**
 * Represents an option with its details for both 'call' and 'put' sides.
 * 
 * @interface Option
 * @property {number} strike - The strike price of the option.
 * @property {object} call - The details for the 'call' option.
 * @property {object} put - The details for the 'put' option.
 */
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
/**
 * Represents parameters for an option (e.g., bid, ask, volume).
 * 
 * @interface OptionParameter
 * @property {string} id - The unique identifier for the option parameter.
 * @property {string} name - The name of the option parameter.
 * @property {boolean} visible - Whether the option parameter is visible.
 * @property {boolean} [required] - Whether the option parameter is required (optional).
 */
export interface OptionParameter {
  id: string
  name: string
  visible: boolean
  required?: boolean
}