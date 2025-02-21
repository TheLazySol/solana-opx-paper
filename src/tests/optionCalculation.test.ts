import { calculateOption } from "@/lib/tests/option-calculator";

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

// Helper function to calculate time in years
const convertTimeToYears = (timeInSeconds: number) => timeInSeconds / 31_536_000;

// Helper function for creating expected results
const getExpectedValues = (optionType: "call" | "put") => {
  const commonGreeks = {
    gamma: 0.0620, 
    theta: -0.1978,
    vega: 0.5611
  };

  if (optionType === "call") {
    return {
      price: 5.2014,
      greeks: {
        delta: 0.6214, 
        rho: 0.0841, 
        ...commonGreeks
      }
    };
  } else {
    return {
      price: 28.3589,
      greeks: {
        delta: -0.3786, 
        rho: -0.0841, 
        ...commonGreeks
      }
    };
  }
};

describe("Option Pricing Calculation", () => {
  let params: OptionParams;

  beforeEach(() => {
    // Common parameters for both tests
    params = {
      strikePrice: 250,
      spotPrice: 218.54,
      timeUntilExpirySeconds: 716747, // 8.3 days in seconds
      volatility: 0.35,
      riskFreeRate: 0.08,
      isCall: true // Default to call option
    };
  });

  it("should calculate call option correctly", () => {
    const timeToExpiryYears = convertTimeToYears(params.timeUntilExpirySeconds);
    const expected = getExpectedValues("call");

    const result = calculateOption({ ...params, isCall: true });

    expect(result.price).toBeCloseTo(expected.price, 4);
    expect(result.greeks.delta).toBeCloseTo(expected.greeks.delta, 4);
    expect(result.greeks.gamma).toBeCloseTo(expected.greeks.gamma, 4);
    expect(result.greeks.theta).toBeCloseTo(expected.greeks.theta, 4);
    expect(result.greeks.vega).toBeCloseTo(expected.greeks.vega, 4);
    expect(result.greeks.rho).toBeCloseTo(expected.greeks.rho, 4);
  });

  it("should calculate put option correctly", () => {
    const timeToExpiryYears = convertTimeToYears(params.timeUntilExpirySeconds);
    const expected = getExpectedValues("put");

    const result = calculateOption({ ...params, isCall: false });

    expect(result.price).toBeCloseTo(expected.price, 4);
    expect(result.greeks.delta).toBeCloseTo(expected.greeks.delta, 4);
    expect(result.greeks.gamma).toBeCloseTo(expected.greeks.gamma, 4);
    expect(result.greeks.theta).toBeCloseTo(expected.greeks.theta, 4);
    expect(result.greeks.vega).toBeCloseTo(expected.greeks.vega, 4);
    expect(result.greeks.rho).toBeCloseTo(expected.greeks.rho, 4);
  });

  it("should handle expired options correctly", () => {
    params.timeUntilExpirySeconds = 0; // Expired option
    const result = calculateOption({ ...params, isCall: true });

    expect(result.price).toBe(0);
    expect(result.greeks.delta).toBe(0);
    expect(result.greeks.gamma).toBe(0);
    expect(result.greeks.theta).toBe(0);
    expect(result.greeks.vega).toBe(0);
    expect(result.greeks.rho).toBe(0);
  });

  // Additional edge case tests
  it("should handle options with very short expiry time", () => {
    params.timeUntilExpirySeconds = 1; // 1 second to expiry
    const result = calculateOption({ ...params, isCall: true });

    expect(result.price).toBeCloseTo(0, 4);
    expect(result.greeks.delta).toBeCloseTo(0, 4); // Delta might be near 0 in this case
  });

  it("should handle options with very high volatility", () => {
    params.volatility = 5.0; // Extremely high volatility
    const result = calculateOption({ ...params, isCall: true });

    expect(result.price).toBeGreaterThan(0); // Should still be a valid price
  });
});
