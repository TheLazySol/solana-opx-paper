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