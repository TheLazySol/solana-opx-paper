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

export interface TokenPriceData {
  price: number;
  priceChange24h: number;
  timestamp: number;
  humanTime: string;
} 