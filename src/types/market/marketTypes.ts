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
