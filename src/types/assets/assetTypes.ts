/**
 * Types related to underlying assets and tokens
 * 
 * This file contains type definitions for assets, tokens, and related data structures
 * used throughout the application.
 */

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