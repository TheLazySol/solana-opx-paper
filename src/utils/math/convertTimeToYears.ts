/**
 * Converts time from seconds to years.
 * 
 * This function assumes that there are 31,536,000 seconds in a year (365 days).
 * It is used to convert the time to expiry in seconds to a more conventional time unit for option pricing calculations.
 * 
 * @param {number} timeInSeconds - The time in seconds to be converted.
 * @returns {number} The equivalent time in years.
 * 
 * @example
 * // Convert 716747 seconds to years
 * const timeInYears = convertTimeToYears(716747);
 * console.log(timeInYears); // 0.0227 years
 */
export const convertTimeToYears = (timeInSeconds: number): number => timeInSeconds / 31_536_000;
