import { PrismaClient } from '@prisma/client'
import { RedisPoolData } from '@/lib/redis/omlp-pool-service'
import { getRedisClient } from '@/lib/redis/redis-client'

const prisma = new PrismaClient()

/**
 * Sync a pool from PostgreSQL to Redis (on startup)
 */
export async function syncPoolToRedis(poolId: string): Promise<void> {
  const pool = await prisma.oMLPPool.findUnique({
    where: { poolId, isActive: true }
  })
  
  if (!pool) {
    console.log(`Pool ${poolId} not found in database`)
    return
  }
  
  const client = await getRedisClient()
  
  // Convert Prisma model to Redis format
  const redisPoolData: RedisPoolData = {
    poolId: pool.poolId,
    asset: pool.asset,
    tokenAddress: pool.tokenAddress,
    
    // Pool state
    totalSupply: pool.totalSupply,
    availableSupply: pool.availableSupply,
    utilizedSupply: pool.utilizedSupply,
    utilizationRate: pool.utilizationRate,
    
    // Interest rates
    currentSupplyApy: pool.currentSupplyApy,
    currentBorrowApy: pool.currentBorrowApy,
    
    // Configuration
    baseSupplyApy: pool.baseSupplyApy,
    baseBorrowApy: pool.baseBorrowApy,
    utilizationRateMultiplier: pool.utilizationRateMultiplier,
    borrowSpread: pool.borrowSpread,
    supplyLimit: pool.supplyLimit,
    minUtilizationForDynamicRates: pool.minUtilizationForDynamicRates,
    maxUtilizationThreshold: pool.maxUtilizationThreshold,
    liquidationThreshold: pool.liquidationThreshold,
    liquidationPenalty: pool.liquidationPenalty,
    
    // Timestamps
    createdAt: pool.createdAt.getTime(),
    updatedAt: pool.updatedAt.getTime(),
    
    // Default values (will be updated by price sync)
    assetPrice: 0,
    lastPriceUpdate: Date.now(),
  }
  
  // Store in Redis
  const redisKey = `omlp:pool:${poolId}`
  await client.hSet(redisKey, 
    Object.entries(redisPoolData).reduce((acc, [key, value]) => {
      acc[key] = value.toString()
      return acc
    }, {} as Record<string, string>)
  )
  
  // Add to active pools list
  await client.sAdd('omlp:pools:list', poolId)
  
  console.log(`Synced pool ${poolId} from PostgreSQL to Redis`)
}

/**
 * Sync all active pools from PostgreSQL to Redis
 */
export async function syncAllPoolsToRedis(): Promise<void> {
  const pools = await prisma.oMLPPool.findMany({
    where: { isActive: true }
  })
  
  console.log(`Syncing ${pools.length} pools to Redis...`)
  
  for (const pool of pools) {
    await syncPoolToRedis(pool.poolId)
  }
  
  console.log('Pool sync completed')
}

/**
 * Save pool to PostgreSQL (create or update)
 */
export async function savePoolToDatabase(poolData: RedisPoolData): Promise<void> {
  await prisma.oMLPPool.upsert({
    where: { poolId: poolData.poolId },
    create: {
      poolId: poolData.poolId,
      asset: poolData.asset,
      tokenAddress: poolData.tokenAddress,
      
      // Configuration
      baseSupplyApy: poolData.baseSupplyApy,
      baseBorrowApy: poolData.baseBorrowApy,
      utilizationRateMultiplier: poolData.utilizationRateMultiplier,
      borrowSpread: poolData.borrowSpread,
      supplyLimit: poolData.supplyLimit,
      minUtilizationForDynamicRates: poolData.minUtilizationForDynamicRates,
      maxUtilizationThreshold: poolData.maxUtilizationThreshold,
      liquidationThreshold: poolData.liquidationThreshold,
      liquidationPenalty: poolData.liquidationPenalty,
      
      // State
      totalSupply: poolData.totalSupply,
      availableSupply: poolData.availableSupply,
      utilizedSupply: poolData.utilizedSupply,
      utilizationRate: poolData.utilizationRate,
      currentSupplyApy: poolData.currentSupplyApy,
      currentBorrowApy: poolData.currentBorrowApy,
    },
    update: {
      // Update state values
      totalSupply: poolData.totalSupply,
      availableSupply: poolData.availableSupply,
      utilizedSupply: poolData.utilizedSupply,
      utilizationRate: poolData.utilizationRate,
      currentSupplyApy: poolData.currentSupplyApy,
      currentBorrowApy: poolData.currentBorrowApy,
      
      // Update configuration if changed
      baseSupplyApy: poolData.baseSupplyApy,
      baseBorrowApy: poolData.baseBorrowApy,
      utilizationRateMultiplier: poolData.utilizationRateMultiplier,
      borrowSpread: poolData.borrowSpread,
      supplyLimit: poolData.supplyLimit,
      minUtilizationForDynamicRates: poolData.minUtilizationForDynamicRates,
      maxUtilizationThreshold: poolData.maxUtilizationThreshold,
      liquidationThreshold: poolData.liquidationThreshold,
      liquidationPenalty: poolData.liquidationPenalty,
    }
  })
}

/**
 * Create a pool snapshot for time series data
 */
export async function createPoolSnapshot(poolData: RedisPoolData, assetPrice: number): Promise<void> {
  await prisma.oMLPPoolSnapshot.create({
    data: {
      poolId: poolData.poolId,
      totalSupply: poolData.totalSupply,
      availableSupply: poolData.availableSupply,
      utilizedSupply: poolData.utilizedSupply,
      utilizationRate: poolData.utilizationRate,
      currentSupplyApy: poolData.currentSupplyApy,
      currentBorrowApy: poolData.currentBorrowApy,
      assetPrice: assetPrice,
    }
  })
}

/**
 * Soft delete a pool from the database
 */
export async function softDeletePool(poolId: string): Promise<void> {
  await prisma.oMLPPool.update({
    where: { poolId },
    data: {
      isActive: false,
      deletedAt: new Date()
    }
  })
}

/**
 * Get historical snapshots for a pool
 */
export async function getPoolSnapshots(
  poolId: string, 
  from: Date, 
  to: Date
): Promise<Array<{
  timestamp: Date
  totalSupply: number
  utilizationRate: number
  currentSupplyApy: number
  currentBorrowApy: number
  assetPrice: number
}>> {
  const snapshots = await prisma.oMLPPoolSnapshot.findMany({
    where: {
      poolId,
      timestamp: {
        gte: from,
        lte: to
      }
    },
    orderBy: { timestamp: 'asc' },
    select: {
      timestamp: true,
      totalSupply: true,
      utilizationRate: true,
      currentSupplyApy: true,
      currentBorrowApy: true,
      assetPrice: true,
    }
  })
  
  return snapshots
}
