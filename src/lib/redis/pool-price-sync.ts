import { updatePoolPrice, getAllPools } from './omlp-pool-service';

/**
 * Sync pool prices with current asset prices
 */
export async function syncPoolPrices(assetPrices: Record<string, number>): Promise<void> {
  try {
    const pools = await getAllPools();
    
    for (const pool of pools) {
      const currentPrice = assetPrices[pool.asset];
      
      if (currentPrice && currentPrice !== pool.assetPrice) {
        await updatePoolPrice(pool.poolId, currentPrice);
        console.log(`Updated ${pool.asset} pool price: ${pool.assetPrice} -> ${currentPrice}`);
      }
    }
  } catch (error) {
    console.error('Failed to sync pool prices:', error);
  }
}

/**
 * Create a price sync interval
 */
export function createPriceSyncInterval(
  getAssetPrices: () => Record<string, number>,
  intervalMs: number = 10000 // 10 seconds default
): () => void {
  const interval = setInterval(async () => {
    const prices = getAssetPrices();
    await syncPoolPrices(prices);
  }, intervalMs);
  
  // Return cleanup function
  return () => clearInterval(interval);
}
