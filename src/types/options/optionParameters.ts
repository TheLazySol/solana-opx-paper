
/**
 * Represents a parameter used in an option, such as bid, ask, volume, etc.
 * 
 * @interface OptionParameter
 * @property {string} id - The unique identifier for the option parameter (e.g., "bid", "ask").
 * @property {string} name - The name of the option parameter (e.g., "Bid", "Ask").
 * @property {boolean} visible - Whether the parameter should be visible in the UI.
 * @property {boolean} [required] - Whether the parameter is required (optional).
 */
export interface OptionParameter {
  /**
   * The unique identifier for the option parameter (e.g., "bid", "ask").
   */
  id: string;

  /**
   * The name of the option parameter (e.g., "Bid", "Ask").
   */
  name: string;

  /**
   * Whether the parameter should be visible in the UI.
   */
  visible: boolean;

  /**
   * Whether the parameter is required (optional).
   */
  required?: boolean;
}

/**
 * The default set of option parameters.
 * 
 * @const {OptionParameter[]} defaultParameters - Array of default option parameters, such as bid, ask, volume, etc.
 */
export const defaultParameters: OptionParameter[] = [
  { id: "bid", name: "Bid", visible: true, required: true },
  { id: "ask", name: "Ask", visible: true, required: true },
  { id: "volume", name: "Volume", visible: true, required: true },
  { id: "oi", name: "OI", visible: true },
  { id: "iv", name: "IV", visible: true },
  { id: "delta", name: "Delta", visible: true },
  { id: "theta", name: "Theta", visible: true },
  { id: "gamma", name: "Gamma", visible: false },
  { id: "vega", name: "Vega", visible: false },
  { id: "rho", name: "Rho", visible: false }
]
