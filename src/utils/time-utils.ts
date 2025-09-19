// Standard option expiry time in UTC (12:00 AM UTC / Midnight)
export const OPTION_EXPIRY_HOUR_UTC = 0; // 12:00 AM UTC (Midnight)
export const OPTION_EXPIRY_MINUTE_UTC = 0; // 0 minutes
export const OPTION_EXPIRY_SECOND_UTC = 0; // 0 seconds

/**
 * Calculates the time until expiry in seconds using UTC timezone
 * This ensures consistency across all users globally for crypto trading
 * Options expire at a standardized time (12:00 AM UTC / Midnight)
 * 
 * @param expiryDate - The expiration date (can be a Date object or string)
 * @returns The number of seconds until expiry (minimum 0)
 */
export function calculateTimeUntilExpiryUTC(expiryDate: Date | string): number {
  const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  const now = new Date();
  
  // Create UTC expiry date with standardized time using UTC methods to avoid timezone issues
  const utcExpiry = new Date(Date.UTC(
    expiry.getUTCFullYear(),
    expiry.getUTCMonth(), 
    expiry.getUTCDate(),
    OPTION_EXPIRY_HOUR_UTC,
    OPTION_EXPIRY_MINUTE_UTC,
    OPTION_EXPIRY_SECOND_UTC
  ));
  
  // Get current time in UTC
  const utcNow = new Date();
  
  return Math.max(0, Math.floor((utcExpiry.getTime() - utcNow.getTime()) / 1000));
}

/**
 * Formats the expiry time for display purposes
 * @returns A string showing when options expire (e.g., "8:00 AM UTC")
 */
export function getExpiryTimeDisplay(): string {
  const hour = OPTION_EXPIRY_HOUR_UTC;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const minute = OPTION_EXPIRY_MINUTE_UTC.toString().padStart(2, '0');
  
  return `${displayHour}:${minute} ${period} UTC`;
}
