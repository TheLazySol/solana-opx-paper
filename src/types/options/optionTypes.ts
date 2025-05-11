import { address, Address } from 'gill'

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
 * Enum representing the valid option parameter IDs.
 * 
 * This enum contains all the possible IDs that can be used for option parameters such as bid, ask, volume, etc.
 */
export enum OptionParameterId {
  BID = "bid",         // The bid price of an option
  ASK = "ask",         // The ask price of an option
  VOLUME = "volume",   // The trading volume of an option
  OI = "oi",           // Open interest of an option
  OA = "oa",           // option contract availability
  IV = "iv",           // Implied volatility of an option
  DELTA = "delta",     // The delta of an option (price sensitivity to changes in underlying asset)
  THETA = "theta",     // The theta of an option (time sensitivity)
  GAMMA = "gamma",     // The gamma of an option (rate of change of delta)
  VEGA = "vega",       // The vega of an option (sensitivity to volatility)
  RHO = "rho"          // The rho of an option (interest rate sensitivity)
}

/**
 * Represents a parameter used in an option, such as bid, ask, volume, etc.
 * 
 * @interface OptionParameter
 * @property {OptionParameterId} id - The unique identifier for the option parameter (e.g., "bid", "ask").
 * @property {string} name - The human-readable name of the option parameter (e.g., "Bid", "Ask").
 * @property {boolean} visible - Whether the parameter should be visible in the UI.
 * @property {boolean} [required] - Whether the parameter is required for specific use cases (optional).
 */
export interface OptionParameter {
  /**
   * The unique identifier for the option parameter (e.g., "bid", "ask").
   */
  id: OptionParameterId | string;

  /**
   * The name of the option parameter (e.g., "Bid", "Ask").
   */
  name: string;

  /**
   * Whether the parameter should be visible in the UI. Used for filtering which parameters to display.
   */
  visible: boolean;

  /**
   * Whether the parameter is required for specific use cases. Optional.
   */
  required?: boolean;
}

/**
 * Represents a summary of an option, including details about the asset,
 * option type, strike price, premium, and quantity.
 *
 * @interface OptionSummary
 * @property {string} asset - The underlying asset for the option.
 * @property {'call' | 'put'} optionType - The type of the option (either "call" or "put").
 * @property {string} strikePrice - The strike price at which the option can be exercised.
 * @property {string} premium - The premium cost of the option.
 * @property {number} quantity - The quantity of the option contracts.
 */
export interface OptionSummary {
  asset: string
  optionType: OptionSide
  strikePrice: string
  premium: string
  quantity: number
}

/**
 * Properties for the MakerSummary component that displays a summary of options.
 *
 * @interface MakerSummaryProps
 * @property {OptionSummary[]} options - An array of option summaries to be displayed.
 * @property {(index: number) => void} onRemoveOption - Callback function to remove an option,
 *                                                      identified by its index in the array.
 */
export interface MakerSummaryProps {
  options: OptionSummary[]
  onRemoveOption: (index: number) => void
}

/**
 * Represents an order for an option.
 * 
 * @interface OptionOrder
 * 
 * @property {Address} publicKey - The Solana account address for the order.
 * @property {number} strike - The strike price of the option.
 * @property {number} price - The price at which the option is being traded.
 * @property {number} bidPrice - The highest bid price.
 * @property {number} askPrice - The lowest ask price.
 * @property {OrderType} type - The type of the order (buy or sell).
 * @property {OptionSide} optionSide - Whether the option is a 'call' or 'put'.
 * @property {Date} timestamp - The time at which the order was placed.
 * @property {Address} owner - The wallet address of the order creator.
 * @property {Address} [mint] - The mint address for the option token (optional).
 * @property {Address} [optionMint] - The mint address for the option token (optional).
 * @property {number} [size] - The size (number of contracts) of the order (optional).
 * @property {'pending' | 'filled' | 'cancelled'} status - The current status of the order.
 * @property {string} expirationDate - The expiration date of the option.
 * @property {boolean} [fromChainAction] - Whether the order was triggered by a chain action (optional).
 * @property {number} [volume] - The volume of the order (optional).
 */
export interface OptionOrder {
  publicKey: Address  // Solana account address for the order
  strike: number
  price: number
  bidPrice: number
  askPrice: number
  type: OrderType
  optionSide: OptionSide
  timestamp: Date
  owner: Address
  mint?: Address
  optionMint?: Address
  size?: number
  status: 'pending' | 'filled' | 'cancelled'
  expirationDate: string
  fromChainAction?: boolean
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
 * Represents the result of an option pricing calculation, including the price and Greeks.
 *
 * @interface OptionCalculation
 * @property {number} price - The calculated price of the option.
 * @property {Object} greeks - The Greek values associated with the option.
 * @property {number} greeks.delta - Sensitivity of the option price to changes in the underlying asset price.
 * @property {number} greeks.gamma - Sensitivity of delta to changes in the underlying asset price.
 * @property {number} greeks.theta - Sensitivity of the option price to the passage of time.
 * @property {number} greeks.vega - Sensitivity of the option price to changes in implied volatility.
 * @property {number} greeks.rho - Sensitivity of the option price to changes in the risk-free interest rate.
 */
export interface OptionCalculation {
  price: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
  };
}

/**
 * The default set of option parameters.
 * This array includes a common set of parameters like bid, ask, volume, open interest, etc.
 * These parameters are typically used for displaying option data in a trading interface.
 * 
 * @const {OptionParameter[]} defaultParameters - Array of default option parameters.
 */
export const defaultParameters: OptionParameter[] = [
  { id: OptionParameterId.BID, name: "Bid", visible: true, required: true },
  { id: OptionParameterId.ASK, name: "Ask", visible: true, required: true },
  { id: OptionParameterId.VOLUME, name: "Volume", visible: true, required: true },
  { id: OptionParameterId.OI, name: "OI", visible: true },
  { id: OptionParameterId.IV, name: "IV", visible: true },
  { id: OptionParameterId.DELTA, name: "Delta", visible: true },
  { id: OptionParameterId.THETA, name: "Theta", visible: true },
  { id: OptionParameterId.GAMMA, name: "Gamma", visible: false },
  { id: OptionParameterId.VEGA, name: "Vega", visible: false },
  { id: OptionParameterId.RHO, name: "Rho", visible: false }
];

/**
 * Filters the visible option parameters from a list of parameters.
 * This function returns only those parameters that are set to be visible.
 * 
 * @param {OptionParameter[]} params - The list of option parameters to be filtered.
 * @returns {OptionParameter[]} - The list of visible option parameters.
 */
export function getVisibleParameters(params: OptionParameter[]): OptionParameter[] {
  return params.filter(param => param.visible);
}

/**
 * Finds an option parameter by its unique ID.
 * This function looks for the parameter in the provided list of option parameters by its ID.
 * 
 * @param {OptionParameter[]} params - The list of option parameters to search through.
 * @param {string} id - The unique identifier for the parameter to search for.
 * @returns {OptionParameter | undefined} - The matching option parameter, or undefined if not found.
 */
export function findParameterById(params: OptionParameter[], id: string): OptionParameter | undefined {
  return params.find(param => param.id === id);
}

/**
 * Converts an array of `OptionOrder` objects into an array of `Option` objects.
 * This function processes orders and groups them by strike price, updating
 * option details like bid/ask prices and volume.
 *
 * @param {OptionOrder[]} orders - An array of `OptionOrder` objects to be converted.
 * @returns {Option[]} An array of `Option` objects created from the provided `OptionOrder` objects.
 */
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
  