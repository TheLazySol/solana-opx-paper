export interface BirdeyePriceResponse {
  success: boolean;
  message?: string;
  data: {
    value: number;
    priceChange24H: number;
    updateUnixTime: number;
    updateHumanTime: string;
    // Add other fields as needed from the Birdeye API response
    volumeUsd24h?: number;
    volume24h?: number;
    marketCap?: number;
    liquidity?: number;
  };
} 