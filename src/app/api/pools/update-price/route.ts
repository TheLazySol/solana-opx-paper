import { NextRequest, NextResponse } from 'next/server';
import { updatePoolPrice } from '@/lib/redis/omlp-pool-service';
import { initializeRedisClient } from '@/lib/redis/redis-client';

// POST /api/pools/update-price - Update pool asset price
export async function POST(request: NextRequest) {
  try {
    await initializeRedisClient();
    
    const body = await request.json();
    const { poolId, price } = body;
    
    if (!poolId || !price || price <= 0) {
      return NextResponse.json(
        { error: 'Valid pool ID and price are required' },
        { status: 400 }
      );
    }
    
    await updatePoolPrice(poolId, price);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating pool price:', error);
    return NextResponse.json(
      { error: 'Failed to update pool price' },
      { status: 500 }
    );
  }
}
