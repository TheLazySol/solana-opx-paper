/**
 * Represents a stored price record along with its metadata.
 * 
 * @typedef {Object} StoredPrice
 * @property {number} price - The recorded price value.
 * @property {number} priceChange24h - The price change over the last 24 hours.
 * @property {number} timestamp - The Unix timestamp when the price was recorded.
 */
export type StoredPrice = {
  /**
   * The recorded price value.
   */
  price: number;

  /**
   * The price change over the last 24 hours.
   */
  priceChange24h: number;

  /**
   * The Unix timestamp when the price was recorded.
   */
  timestamp: number;
}

/**
 * Represents an underlying asset with a value and label.
 * 
 * @interface UnderlyingAsset
 * @property {string} value - The identifier for the asset (e.g., SOL, LABS).
 * @property {string} label - The name or label for the asset (e.g., Solana (SOL), Epicentral Labs (LABS)).
 */
export interface UnderlyingAsset {
  /**
   * The identifier for the asset (e.g., SOL, LABS).
   */
  value: string;

  /**
   * The name or label for the asset (e.g., Solana (SOL), Epicentral Labs (LABS)).
   */
  label: string;
}

/**
 * List of underlying assets with their respective values and labels.
 * 
 * @const {UnderlyingAsset[]} underlyingAssets - Array of underlying assets.
 */
export const underlyingAssets: UnderlyingAsset[] = [
  { value: "SOL", label: "Solana (SOL)" },
  { value: "LABS", label: "Epicentral Labs (LABS)" },
]
