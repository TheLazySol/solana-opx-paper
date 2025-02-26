/**
 * Represents the response structure from the BirdEye API for a price request.
 *
 * @interface BirdeyePriceResponse
 * 
 * @property {Object} data - The data object containing price information.
 * @property {number} data.value - The price value.
 * @property {number} data.updateUnixTime - The Unix timestamp when the price was last updated.
 * @property {string} data.updateHumanTime - The human-readable string of the last update time.
 * @property {number} [data.priceChange24H] - The price change over the last 24 hours (optional).
 * @property {boolean} success - A flag indicating whether the API request was successful.
 * @property {string} [message] - An optional message describing the status of the request.
 */
export interface BirdeyePriceResponse {
  data: {
    value: number;
    updateUnixTime: number;
    updateHumanTime: string;
    priceChange24H?: number;
  };
  success: boolean;
  message?: string;
}

/**
 * Represents the structure of token price data used within the application.
 *
 * @interface TokenPriceData
 * 
 * @property {number} price - The current price of the token.
 * @property {number} priceChange24h - The price change over the last 24 hours.
 * @property {number} timestamp - The Unix timestamp when the price was recorded.
 * @property {string} humanTime - The human-readable string of the timestamp.
 */
export interface TokenPriceData {
  price: number;
  priceChange24h: number;
  timestamp: number;
  humanTime: string;
}
