import { OptionOrder, Option } from "@/types/options/optionTypes"

/**
 * Converts an array of OptionOrder objects into Option objects grouped by strike price.
 * This function updates the option's bid, ask, and volume based on the provided orders.
 * 
 * @param {OptionOrder[]} orders - The list of option orders to be converted.
 * @returns {Option[]} An array of Option objects, each grouped by strike price.
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