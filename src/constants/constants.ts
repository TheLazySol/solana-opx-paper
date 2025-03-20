import { format } from 'date-fns'

/**
 * The BirdEye API base URL.
 * Typically provided by the NEXT_PUBLIC_BIRDEYE_API_URL environment variable,
 * and defaults to an empty string if not set.
 *
 * @constant {string}
 */
export const BIRDEYE_API_URL: string = process.env.NEXT_PUBLIC_BIRDEYE_API_URL || ''

/**
 * The key used for storing prices in local storage.
 *
 * @constant {string}
 */
export const PRICE_STORAGE_KEY: string = 'stored-prices'

/**
 * Formats a given date string into a human-readable format.
 *
 * This function creates a Date object from the provided date string and then
 * formats it using the "MMMM do, yyyy" pattern (e.g., "January 31st, 2025").
 *
 * @param {string} dateStr - The date string to format.
 * @returns {string} The formatted date string.
 */
const formatExpirationDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return format(date, "MMMM do, yyyy")
}

/**
 * Represents an expiration date option.
 *
 * @typedef {Object} ExpirationDate
 * @property {string} value - The expiration date value in ISO format (e.g., "2025-01-31").
 * @property {string} label - The formatted expiration date label (e.g., "January 31st, 2025").
 * @property {boolean} isMonthly - Indicates whether the expiration date is a monthly expiration.
 */
export type ExpirationDate = {
  value: string
  label: string
  isMonthly: boolean
}

// Asset Price Refresh Interval
export const ASSET_PRICE_REFRESH_INTERVAL = 1000; // 1 second

// SOL PH Volatility
export const SOL_PH_VOLATILITY = 0.45;

// SOL PH Risk Free Rate
export const SOL_PH_RISK_FREE_RATE = 0.08;