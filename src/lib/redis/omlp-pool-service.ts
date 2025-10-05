import { getRedisClient } from './redis-client';
import { POOL_CONFIGS, PoolKey } from '@/constants/omlp/omlp-pools';

// Pool data structure in Redis
export interface RedisPoolData {
  // Pool identification
  poolId: string;
  asset: string;
  tokenAddress: string;
  
  // Pool state
  totalSupply: number;
  availableSupply: number;
  utilizedSupply: number;
  utilizationRate: number;
  
  // Interest rates (current, not base)
  currentSupplyApy: number;
  currentBorrowApy: number;
  
  // Pool configuration (from constants)
  baseSupplyApy: number;
  baseBorrowApy: number;
  utilizationRateMultiplier: number;
  borrowSpread: number;
  supplyLimit: number;
  minUtilizationForDynamicRates: number;
  maxUtilizationThreshold: number;
  liquidationThreshold: number;
  liquidationPenalty: number;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  
  // Current asset price (updated from price provider)
  assetPrice: number;
  lastPriceUpdate: number;
}

// Redis key prefixes
const REDIS_KEYS = {
  POOL: 'omlp:pool:',
  POOL_LIST: 'omlp:pools:list',
  POOL_STATS: 'omlp:pool:stats:',
  USER_POSITIONS: 'omlp:user:positions:',
} as const;

/**
 * Initialize a pool in Redis
 */
export async function initializePool(
  poolKey: PoolKey,
  assetPrice: number
): Promise<RedisPoolData> {
  const client = await getRedisClient();
  const config = POOL_CONFIGS[poolKey];
  const poolId = `${poolKey}_POOL`;
  
  // Create pool data structure
  const poolData: RedisPoolData = {
    // Pool identification
    poolId,
    asset: config.token,
    tokenAddress: config.tokenAddress,
    
    // Initialize pool state
    totalSupply: config.initialSupply,
    availableSupply: config.initialSupply,
    utilizedSupply: 0,
    utilizationRate: 0,
    
    // Initial interest rates (same as base when utilization is 0)
    currentSupplyApy: config.baseSupplyApy,
    currentBorrowApy: config.baseBorrowApy,
    
    // Store configuration
    baseSupplyApy: config.baseSupplyApy,
    baseBorrowApy: config.baseBorrowApy,
    utilizationRateMultiplier: config.utilizationRateMultiplier,
    borrowSpread: config.borrowSpread,
    supplyLimit: config.supplyLimit,
    minUtilizationForDynamicRates: config.minUtilizationForDynamicRates,
    maxUtilizationThreshold: config.maxUtilizationThreshold,
    liquidationThreshold: config.liquidationThreshold,
    liquidationPenalty: config.liquidationPenalty,
    
    // Timestamps
    createdAt: Date.now(),
    updatedAt: Date.now(),
    
    // Asset price
    assetPrice,
    lastPriceUpdate: Date.now(),
  };
  
  // Store pool data in Redis
  const redisKey = `${REDIS_KEYS.POOL}${poolId}`;
  await client.hSet(redisKey, 
    Object.entries(poolData).reduce((acc, [key, value]) => {
      acc[key] = value.toString();
      return acc;
    }, {} as Record<string, string>)
  );
  
  // Add pool to the list of active pools
  await client.sAdd(REDIS_KEYS.POOL_LIST, poolId);
  
  // Set expiration (optional - pools should persist)
  // await client.expire(redisKey, 60 * 60 * 24 * 30); // 30 days
  
  console.log(`Initialized ${poolKey} pool in Redis`);
  return poolData;
}

/**
 * Get pool data from Redis
 */
export async function getPoolData(poolId: string): Promise<RedisPoolData | null> {
  const client = await getRedisClient();
  const redisKey = `${REDIS_KEYS.POOL}${poolId}`;
  
  const data = await client.hGetAll(redisKey);
  
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  
  // Convert string values back to appropriate types
  return {
    poolId: data.poolId,
    asset: data.asset,
    tokenAddress: data.tokenAddress,
    totalSupply: parseFloat(data.totalSupply),
    availableSupply: parseFloat(data.availableSupply),
    utilizedSupply: parseFloat(data.utilizedSupply),
    utilizationRate: parseFloat(data.utilizationRate),
    currentSupplyApy: parseFloat(data.currentSupplyApy),
    currentBorrowApy: parseFloat(data.currentBorrowApy),
    baseSupplyApy: parseFloat(data.baseSupplyApy),
    baseBorrowApy: parseFloat(data.baseBorrowApy),
    utilizationRateMultiplier: parseFloat(data.utilizationRateMultiplier),
    borrowSpread: parseFloat(data.borrowSpread),
    supplyLimit: parseFloat(data.supplyLimit),
    minUtilizationForDynamicRates: parseFloat(data.minUtilizationForDynamicRates),
    maxUtilizationThreshold: parseFloat(data.maxUtilizationThreshold),
    liquidationThreshold: parseFloat(data.liquidationThreshold),
    liquidationPenalty: parseFloat(data.liquidationPenalty),
    createdAt: parseInt(data.createdAt),
    updatedAt: parseInt(data.updatedAt),
    assetPrice: parseFloat(data.assetPrice),
    lastPriceUpdate: parseInt(data.lastPriceUpdate),
  };
}

/**
 * Update pool asset price
 */
export async function updatePoolPrice(poolId: string, newPrice: number): Promise<void> {
  const client = await getRedisClient();
  const redisKey = `${REDIS_KEYS.POOL}${poolId}`;
  
  await client.hSet(redisKey, {
    assetPrice: newPrice.toString(),
    lastPriceUpdate: Date.now().toString(),
    updatedAt: Date.now().toString(),
  });
}

/**
 * Calculate and update interest rates based on utilization
 */
export async function updatePoolRates(poolId: string): Promise<void> {
  const poolData = await getPoolData(poolId);
  if (!poolData) return;
  
  const client = await getRedisClient();
  const redisKey = `${REDIS_KEYS.POOL}${poolId}`;
  
  // Calculate utilization rate
  const utilizationRate = poolData.totalSupply > 0 
    ? (poolData.utilizedSupply / poolData.totalSupply) * 100 
    : 0;
  
  // Calculate dynamic rates based on utilization
  let supplyApy = poolData.baseSupplyApy;
  let borrowApy = poolData.baseBorrowApy;
  
  if (utilizationRate >= poolData.minUtilizationForDynamicRates) {
    // Apply dynamic rate multiplier
    const rateIncrease = utilizationRate * poolData.utilizationRateMultiplier;
    borrowApy = poolData.baseBorrowApy + rateIncrease;
    
    // Supply APY = Borrow APY - Spread
    supplyApy = Math.max(0, borrowApy - poolData.borrowSpread);
  }
  
  // Update rates in Redis
  await client.hSet(redisKey, {
    utilizationRate: utilizationRate.toString(),
    currentSupplyApy: supplyApy.toString(),
    currentBorrowApy: borrowApy.toString(),
    updatedAt: Date.now().toString(),
  });
}

/**
 * Update pool utilization (when tokens are borrowed/returned)
 */
export async function updatePoolUtilization(
  poolId: string,
  amountChange: number,
  operation: 'borrow' | 'return'
): Promise<boolean> {
  const poolData = await getPoolData(poolId);
  if (!poolData) return false;
  
  const client = await getRedisClient();
  const redisKey = `${REDIS_KEYS.POOL}${poolId}`;
  
  let newUtilizedSupply = poolData.utilizedSupply;
  let newAvailableSupply = poolData.availableSupply;
  
  if (operation === 'borrow') {
    // Check if enough liquidity is available
    if (amountChange > poolData.availableSupply) {
      return false;
    }
    newUtilizedSupply += amountChange;
    newAvailableSupply -= amountChange;
  } else {
    // Return tokens to pool
    newUtilizedSupply = Math.max(0, newUtilizedSupply - amountChange);
    newAvailableSupply = Math.min(poolData.totalSupply, newAvailableSupply + amountChange);
  }
  
  // Update pool state
  await client.hSet(redisKey, {
    utilizedSupply: newUtilizedSupply.toString(),
    availableSupply: newAvailableSupply.toString(),
    updatedAt: Date.now().toString(),
  });
  
  // Update interest rates based on new utilization
  await updatePoolRates(poolId);
  
  return true;
}

/**
 * Get all active pools
 */
export async function getAllPools(): Promise<RedisPoolData[]> {
  const client = await getRedisClient();
  const poolIds = await client.sMembers(REDIS_KEYS.POOL_LIST);
  
  const pools: RedisPoolData[] = [];
  for (const poolId of poolIds) {
    const poolData = await getPoolData(poolId);
    if (poolData) {
      pools.push(poolData);
    }
  }
  
  return pools;
}

/**
 * Initialize default pools (deprecated - pools are now created via admin panel)
 * This function is kept for backward compatibility but does nothing
 */
export async function initializeDefaultPools(assetPrices: Record<string, number>): Promise<void> {
  // No longer initializes default pools - pools are created dynamically via admin panel
  console.log('Pool initialization skipped - create pools via admin panel');
}

/**
 * Update pool configuration in Redis
 */
export async function updatePoolConfig(
  poolId: string,
  updates: {
    baseSupplyApy?: number;
    baseBorrowApy?: number;
    utilizationRateMultiplier?: number;
    borrowSpread?: number;
    supplyLimit?: number;
    minUtilizationForDynamicRates?: number;
    maxUtilizationThreshold?: number;
    liquidationThreshold?: number;
    liquidationPenalty?: number;
  }
): Promise<RedisPoolData> {
  const client = await getRedisClient();
  const redisKey = `${REDIS_KEYS.POOL}${poolId}`;
  
  // Get existing pool data
  const existingPool = await getPoolData(poolId);
  if (!existingPool) {
    throw new Error(`Pool ${poolId} not found`);
  }
  
  // Update fields
  const updatedData = {
    ...existingPool,
    ...updates,
    updatedAt: Date.now(),
  };
  
  // Store updated data in Redis
  await client.hSet(redisKey, 
    Object.entries(updatedData).reduce((acc, [key, value]) => {
      acc[key] = value.toString();
      return acc;
    }, {} as Record<string, string>)
  );
  
  // Recalculate rates if relevant parameters changed
  if (
    updates.baseSupplyApy !== undefined ||
    updates.baseBorrowApy !== undefined ||
    updates.utilizationRateMultiplier !== undefined ||
    updates.borrowSpread !== undefined
  ) {
    await updatePoolRates(poolId);
  }
  
  console.log(`Updated ${poolId} configuration`);
  return updatedData;
}

/**
 * Create a custom pool with specific configuration
 */
export async function createCustomPool(
  config: {
    token: string;
    tokenAddress: string;
    initialSupply: number;
    baseSupplyApy: number;
    baseBorrowApy: number;
    utilizationRateMultiplier: number;
    borrowSpread: number;
    supplyLimit: number;
    minUtilizationForDynamicRates: number;
    maxUtilizationThreshold: number;
    liquidationThreshold: number;
    liquidationPenalty: number;
    initialBorrowedPercentage: number;
  },
  assetPrice: number
): Promise<RedisPoolData> {
  const client = await getRedisClient();
  const poolId = `${config.token}_POOL`;
  
  // Check if pool already exists
  const existingPool = await getPoolData(poolId);
  if (existingPool) {
    throw new Error(`Pool for ${config.token} already exists`);
  }
  
  // Calculate initial borrowed amount
  const initialBorrowed = (config.initialSupply * config.initialBorrowedPercentage) / 100;
  const availableSupply = config.initialSupply - initialBorrowed;
  const initialUtilization = config.initialSupply > 0 
    ? (initialBorrowed / config.initialSupply) * 100 
    : 0;
  
  // Create pool data structure
  const poolData: RedisPoolData = {
    // Pool identification
    poolId,
    asset: config.token,
    tokenAddress: config.tokenAddress,
    
    // Initialize pool state
    totalSupply: config.initialSupply,
    availableSupply,
    utilizedSupply: initialBorrowed,
    utilizationRate: initialUtilization,
    
    // Initial interest rates
    currentSupplyApy: config.baseSupplyApy,
    currentBorrowApy: config.baseBorrowApy,
    
    // Store configuration
    baseSupplyApy: config.baseSupplyApy,
    baseBorrowApy: config.baseBorrowApy,
    utilizationRateMultiplier: config.utilizationRateMultiplier,
    borrowSpread: config.borrowSpread,
    supplyLimit: config.supplyLimit,
    minUtilizationForDynamicRates: config.minUtilizationForDynamicRates,
    maxUtilizationThreshold: config.maxUtilizationThreshold,
    liquidationThreshold: config.liquidationThreshold,
    liquidationPenalty: config.liquidationPenalty,
    
    // Timestamps
    createdAt: Date.now(),
    updatedAt: Date.now(),
    
    // Asset price
    assetPrice,
    lastPriceUpdate: Date.now(),
  };
  
  // Store pool data in Redis
  const redisKey = `${REDIS_KEYS.POOL}${poolId}`;
  await client.hSet(redisKey, 
    Object.entries(poolData).reduce((acc, [key, value]) => {
      acc[key] = value.toString();
      return acc;
    }, {} as Record<string, string>)
  );
  
  // Add pool to the list of active pools
  await client.sAdd(REDIS_KEYS.POOL_LIST, poolId);
  
  // Calculate initial rates if there's utilization
  if (initialUtilization > 0) {
    await updatePoolRates(poolId);
  }
  
  console.log(`Created custom ${config.token} pool in Redis`);
  return poolData;
}

/**
 * Delete a pool from Redis
 * Only allows deletion if the pool has less than 0.001 assets remaining
 */
export async function deletePool(poolId: string): Promise<boolean> {
  const client = await getRedisClient();
  
  try {
    // First, get the pool data to check if it can be deleted
    const poolData = await getPoolData(poolId);
    if (!poolData) {
      console.log(`Pool ${poolId} not found`);
      return false;
    }
    
    // Check if pool has less than 0.001 assets left
    if (poolData.totalSupply >= 0.001) {
      throw new Error(`Cannot delete pool ${poolId}: Pool still has ${poolData.totalSupply} ${poolData.asset} remaining. Must have less than 0.001 assets to delete.`);
    }
    
    // Remove pool data from Redis
    const redisKey = `${REDIS_KEYS.POOL}${poolId}`;
    await client.del(redisKey);
    
    // Remove pool from the active pools list
    await client.sRem(REDIS_KEYS.POOL_LIST, poolId);
    
    // Remove any pool stats
    const statsKey = `${REDIS_KEYS.POOL_STATS}${poolId}`;
    await client.del(statsKey);
    
    console.log(`Deleted pool ${poolId} from Redis`);
    return true;
  } catch (error) {
    console.error(`Failed to delete pool ${poolId}:`, error);
    throw error;
  }
}
