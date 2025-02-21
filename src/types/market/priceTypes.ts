export interface PriceState {
    currentPrice: number | null;
    previousPrice: number | null;
    priceChange24h: number;
    isLoading: boolean;
    initialLoad: boolean;
  }