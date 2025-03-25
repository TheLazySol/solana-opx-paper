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
 * Formats a given date string into a compact format for option expiration dates.
 *
 * This function creates a Date object from the provided date string and then
 * formats it using the "MMM-dd-yyyy" pattern (e.g., "Jan-01-2025").
 *
 * @param {string} dateStr - The date string to format.
 * @returns {string} The formatted date string.
 */
export const formatOptionExpirationDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return format(date, "MMM-dd-yyyy")
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
export const ASSET_PRICE_REFRESH_INTERVAL = 1500; // 1.5 seconds

// SOL PH Volatility
export const SOL_PH_VOLATILITY = 0.45;

// SOL PH Risk Free Rate
export const SOL_PH_RISK_FREE_RATE = 0.08;

// Option Chain Constants
export const OPTION_SPREAD_PERCENTAGE = 0.01; // 1% bid-ask spread
export const DEFAULT_OPTION_VOLUME = 0;
export const DEFAULT_OPTION_OPEN_INTEREST = 0;
export const OPTION_STRIKE_PRICES = [130, 135, 140, 145, 150];

// Test expiration dates array for development
export const EMPTY_EXPIRATION_DATES: ExpirationDate[] = [
  {
    value: "2025-03-28",
    label: "March 28th, 2025",
    isMonthly: true
  }
];