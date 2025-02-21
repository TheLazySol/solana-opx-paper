/**
 * Interface for the parameters used in option calculations.
 * 
 * @interface OptionParams
 * @property {number} strikePrice - The strike price of the option.
 * @property {number} spotPrice - The current spot price of the underlying asset.
 * @property {number} timeUntilExpirySeconds - The time until option expiry in seconds.
 * @property {number} volatility - The implied volatility of the option.
 * @property {number} riskFreeRate - The risk-free rate used in option pricing.
 * @property {boolean} isCall - Whether the option is a call or a put option.
 */
interface OptionParams {
    strikePrice: number;
    spotPrice: number;
    timeUntilExpirySeconds: number;
    volatility: number;
    riskFreeRate: number;
    isCall: boolean;
  }