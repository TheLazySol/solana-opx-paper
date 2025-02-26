/**
 * Represents the result of an option pricing calculation, including the price and Greeks.
 *
 * @interface OptionCalculation
 * @property {number} price - The calculated price of the option.
 * @property {Object} greeks - The Greek values associated with the option.
 * @property {number} greeks.delta - Sensitivity of the option price to changes in the underlying asset price.
 * @property {number} greeks.gamma - Sensitivity of delta to changes in the underlying asset price.
 * @property {number} greeks.theta - Sensitivity of the option price to the passage of time.
 * @property {number} greeks.vega - Sensitivity of the option price to changes in implied volatility.
 * @property {number} greeks.rho - Sensitivity of the option price to changes in the risk-free interest rate.
 */
export interface OptionCalculation {
    price: number;
    greeks: {
      delta: number;
      gamma: number;
      theta: number;
      vega: number;
      rho: number;
    };
  }