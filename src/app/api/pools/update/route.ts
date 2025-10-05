import { NextRequest, NextResponse } from 'next/server';
import { updatePoolConfig, getPoolData } from '@/lib/redis/omlp-pool-service';
import { savePoolToDatabase } from '@/lib/prisma/omlp-pool-sync';
import { initializeRedisClient } from '@/lib/redis/redis-client';

// POST /api/pools/update - Update pool configuration
export async function POST(request: NextRequest) {
  try {
    await initializeRedisClient();
    
    const body = await request.json();
    const { poolId, updates } = body;
    
    if (!poolId || !updates) {
      return NextResponse.json(
        { error: 'Pool ID and updates are required' },
        { status: 400 }
      );
    }
    
    const updatedPool = await updatePoolConfig(poolId, updates);
    
    // Save updated pool to PostgreSQL for persistence
    if (updatedPool) {
      await savePoolToDatabase(updatedPool);
    }
    
    return NextResponse.json(updatedPool);
  } catch (error) {
    console.error('Error updating pool:', error);
    
    // Check for specific error types
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update pool' },
      { status: 500 }
    );
  }
}

