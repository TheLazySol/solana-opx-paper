/**
 * Computes the cumulative distribution function (CDF) for the standard normal distribution.
 *
 * @param {number} x - The value for which to compute the CDF.
 * @returns {number} The probability that a standard normal variable is less than or equal to x.
 */
export function normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }

  export function normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }