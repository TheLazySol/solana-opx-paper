import { NextRequest, NextResponse } from 'next/server';
import { createCustomPool } from '@/lib/redis/omlp-pool-service';
import { initializeRedisClient } from '@/lib/redis/redis-client';

// POST /api/pools/create - Create a custom pool
export async function POST(request: NextRequest) {
  try {
    await initializeRedisClient();
    
    const body = await request.json();
    const { config, assetPrice } = body;
    
    if (!config || !assetPrice) {
      return NextResponse.json(
        { error: 'Pool configuration and asset price are required' },
        { status: 400 }
      );
    }
    
    const pool = await createCustomPool(config, assetPrice);
    
    return NextResponse.json(pool);
  } catch (error) {
    console.error('Error creating pool:', error);
    
    // Check for specific error types
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create pool' },
      { status: 500 }
    );
  }
}
