/**
 * Types related to market data, pricing, and trading interfaces
 * 
 * This file contains type definitions for market-related data structures
 * including prices, price states, and their relationships.
 */

/**
 * Represents a collection of market prices for different assets, where each asset has a bid and ask price.
 * 
 * @interface MarketPrices
 * @property {string} [key] - The unique key for each asset (e.g., asset symbol like "SOL", "BTC").
 * @property {number} bid - The bid price for the asset.
 * @property {number} ask - The ask price for the asset.
 */
export interface MarketPrices {
  /**
   * The unique key for each asset (e.g., asset symbol like "SOL", "BTC").
   */
  [key: string]: {
    /**
     * The bid price for the asset.
     */
    bid: number;

    /**
     * The ask price for the asset.
     */
    ask: number;
  }
}

/**
 * Represents the state of a price in a UI or data context.
 * This includes current and previous prices as well as loading states.
 * 
 * @interface PriceState
 * @property {number | null} currentPrice - The current price of the asset, null if not loaded.
 * @property {number | null} previousPrice - The previous price of the asset, null if not available.
 * @property {number} priceChange24h - The percentage price change over the last 24 hours.
 * @property {boolean} isLoading - Whether the price data is currently being loaded.
 * @property {boolean} initialLoad - Whether this is the first load of the price data.
 */
export interface PriceState {
  currentPrice: number | null;
  previousPrice: number | null;
  priceChange24h: number;
  isLoading: boolean;
  initialLoad: boolean;
}

/**
 * Represents a single price point with timestamp information.
 * Useful for charting and time-series price data.
 * 
 * @interface PricePoint
 * @property {number} price - The price value.
 * @property {number} timestamp - The Unix timestamp when this price was recorded.
 */
export interface PricePoint {
  price: number;
  timestamp: number;
} 