import { NextRequest, NextResponse } from 'next/server';
import { getAllPools, initializeDefaultPools, getPoolData } from '@/lib/redis/omlp-pool-service';
import { initializeRedisClient } from '@/lib/redis/redis-client';
import { syncAllPoolsToRedis } from '@/lib/prisma/omlp-pool-sync';

// GET /api/pools - Get all pools or a specific pool
export async function GET(request: NextRequest) {
  try {
    await initializeRedisClient();
    
    // Sync pools from PostgreSQL to Redis on every request
    // This ensures data persistence across server restarts
    await syncAllPoolsToRedis();
    
    const searchParams = request.nextUrl.searchParams;
    const poolId = searchParams.get('poolId');
    
    if (poolId) {
      // Get specific pool
      const pool = await getPoolData(poolId);
      if (!pool) {
        return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
      }
      return NextResponse.json(pool);
    }
    
    // Get all pools
    const pools = await getAllPools();
    return NextResponse.json(pools);
  } catch (error) {
    console.error('Error fetching pools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pools' },
      { status: 500 }
    );
  }
}

// POST /api/pools/initialize - Initialize default pools
export async function POST(request: NextRequest) {
  try {
    await initializeRedisClient();
    
    const body = await request.json();
    const { assetPrices } = body;
    
    if (!assetPrices || typeof assetPrices !== 'object') {
      return NextResponse.json(
        { error: 'Asset prices are required' },
        { status: 400 }
      );
    }
    
    await initializeDefaultPools(assetPrices);
    
    // Return all pools after initialization
    const pools = await getAllPools();
    return NextResponse.json(pools);
  } catch (error) {
    console.error('Error initializing pools:', error);
    return NextResponse.json(
      { error: 'Failed to initialize pools' },
      { status: 500 }
    );
  }
}
