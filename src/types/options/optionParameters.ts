/**
 * Enum representing the valid option parameter IDs.
 * 
 * This enum contains all the possible IDs that can be used for option parameters such as bid, ask, volume, etc.
 */
export enum OptionParameterId {
  BID = "bid",         // The bid price of an option
  ASK = "ask",         // The ask price of an option
  VOLUME = "volume",   // The trading volume of an option
  OI = "oi",           // Open interest of an option
  IV = "iv",           // Implied volatility of an option
  DELTA = "delta",     // The delta of an option (price sensitivity to changes in underlying asset)
  THETA = "theta",     // The theta of an option (time sensitivity)
  GAMMA = "gamma",     // The gamma of an option (rate of change of delta)
  VEGA = "vega",       // The vega of an option (sensitivity to volatility)
  RHO = "rho"          // The rho of an option (interest rate sensitivity)
}

/**
 * Represents a parameter used in an option, such as bid, ask, volume, etc.
 * This interface defines the structure for each option parameter.
 * 
 * @interface OptionParameter
 * @property {OptionParameterId} id - The unique identifier for the option parameter (e.g., "bid", "ask").
 * @property {string} name - The human-readable name of the option parameter (e.g., "Bid", "Ask").
 * @property {boolean} visible - Whether the parameter should be visible in the UI.
 * @property {boolean} [required] - Whether the parameter is required for specific use cases (optional).
 */
export interface OptionParameter {
  /**
   * The unique identifier for the option parameter (e.g., "bid", "ask").
   */
  id: OptionParameterId;

  /**
   * The name of the option parameter (e.g., "Bid", "Ask").
   */
  name: string;

  /**
   * Whether the parameter should be visible in the UI. Used for filtering which parameters to display.
   */
  visible: boolean;

  /**
   * Whether the parameter is required for specific use cases. Optional.
   */
  required?: boolean;
}

/**
 * The default set of option parameters.
 * This array includes a common set of parameters like bid, ask, volume, open interest, etc.
 * These parameters are typically used for displaying option data in a trading interface.
 * 
 * @const {OptionParameter[]} defaultParameters - Array of default option parameters.
 * @example
 * const params = getVisibleParameters(defaultParameters);
 * console.log(params);  // Logs only visible option parameters
 */
export const defaultParameters: OptionParameter[] = [
  { id: OptionParameterId.BID, name: "Bid", visible: true, required: true },
  { id: OptionParameterId.ASK, name: "Ask", visible: true, required: true },
  { id: OptionParameterId.VOLUME, name: "Volume", visible: true, required: true },
  { id: OptionParameterId.OI, name: "OI", visible: true },
  { id: OptionParameterId.IV, name: "IV", visible: true },
  { id: OptionParameterId.DELTA, name: "Delta", visible: true },
  { id: OptionParameterId.THETA, name: "Theta", visible: true },
  { id: OptionParameterId.GAMMA, name: "Gamma", visible: false },
  { id: OptionParameterId.VEGA, name: "Vega", visible: false },
  { id: OptionParameterId.RHO, name: "Rho", visible: false }
];

/**
 * Filters the visible option parameters from a list of parameters.
 * This function returns only those parameters that are set to be visible.
 * 
 * @param {OptionParameter[]} params - The list of option parameters to be filtered.
 * @returns {OptionParameter[]} - The list of visible option parameters.
 * @example
 * const visibleParams = getVisibleParameters(defaultParameters);
 * console.log(visibleParams);  // Logs only the parameters where visible is true.
 */
export function getVisibleParameters(params: OptionParameter[]): OptionParameter[] {
  return params.filter(param => param.visible);
}

/**
 * Finds an option parameter by its unique ID.
 * This function looks for the parameter in the provided list of option parameters by its ID.
 * 
 * @param {OptionParameter[]} params - The list of option parameters to search through.
 * @param {string} id - The unique identifier for the parameter to search for.
 * @returns {OptionParameter | undefined} - The matching option parameter, or undefined if not found.
 * @example
 * const param = findParameterById(defaultParameters, 'bid');
 * console.log(param);  // Logs the "Bid" parameter object if found, otherwise undefined.
 */
export function findParameterById(params: OptionParameter[], id: string): OptionParameter | undefined {
  return params.find(param => param.id === id);
}
