export interface BirdeyePriceResponse {
  data: {
    value: number;
    updateUnixTime: number;
    updateHumanTime: string;
  };
  success: boolean;
  timestamp: number;
} 