/**
 * Represents a summary of an option, including details about the asset,
 * option type, strike price, premium, and quantity.
 *
 * @interface OptionSummary
 * @property {string} asset - The underlying asset for the option.
 * @property {'call' | 'put'} optionType - The type of the option (either "call" or "put").
 * @property {string} strikePrice - The strike price at which the option can be exercised.
 * @property {string} premium - The premium cost of the option.
 * @property {number} quantity - The quantity of the option contracts.
 */
export interface OptionSummary {
    asset: string
    optionType: 'call' | 'put'
    strikePrice: string
    premium: string
    quantity: number
  }
  
  /**
   * Properties for the MakerSummary component that displays a summary of options.
   *
   * @interface MakerSummaryProps
   * @property {OptionSummary[]} options - An array of option summaries to be displayed.
   * @property {(index: number) => void} onRemoveOption - Callback function to remove an option,
   *                                                      identified by its index in the array.
   */
  export interface MakerSummaryProps {
    options: OptionSummary[]
    onRemoveOption: (index: number) => void
  }
  