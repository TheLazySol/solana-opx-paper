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
  let year: number, month: number, day: number;
  
  if (typeof expiryDate === 'string') {
    // Handle date-only strings like "2025-01-31" by parsing as UTC
    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyPattern.test(expiryDate)) {
      // Parse YYYY-MM-DD as UTC by appending timezone
      const expiry = new Date(expiryDate + 'T00:00:00Z');
      year = expiry.getUTCFullYear();
      month = expiry.getUTCMonth();
      day = expiry.getUTCDate();
    } else {
      // For other string formats, parse and extract UTC components
      const expiry = new Date(expiryDate);
      year = expiry.getUTCFullYear();
      month = expiry.getUTCMonth();
      day = expiry.getUTCDate();
    }
  } else {
    // For Date objects, extract UTC components
    year = expiryDate.getUTCFullYear();
    month = expiryDate.getUTCMonth();
    day = expiryDate.getUTCDate();
  }
  
  // Create UTC expiry date with standardized time
  const utcExpiry = new Date(Date.UTC(
    year,
    month,
    day,
    OPTION_EXPIRY_HOUR_UTC,
    OPTION_EXPIRY_MINUTE_UTC,
    OPTION_EXPIRY_SECOND_UTC
  ));
  
  // Get current time as explicit UTC millisecond timestamp
  const utcNowTimestamp = Date.now();
  
  return Math.max(0, Math.floor((utcExpiry.getTime() - utcNowTimestamp) / 1000));
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
