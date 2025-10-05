import { NextRequest, NextResponse } from 'next/server'
import { deletePool } from '@/lib/redis/omlp-pool-service'

export async function POST(request: NextRequest) {
  try {
    const { poolId } = await request.json()
    
    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      )
    }

    const success = await deletePool(poolId)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete pool or pool not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: `Pool ${poolId} deleted successfully` 
    })
  } catch (error) {
    console.error('Error deleting pool:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
