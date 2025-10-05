import { NextResponse } from 'next/server'
import { createCustomPool } from '@/lib/redis/omlp-pool-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { config, price } = body as {
      config: {
        token: string
        tokenAddress: string
        initialSupply: number
        baseSupplyApy: number
        baseBorrowApy: number
        utilizationRateMultiplier: number
        borrowSpread: number
        supplyLimit: number
        minUtilizationForDynamicRates: number
        maxUtilizationThreshold: number
        liquidationThreshold: number
        liquidationPenalty: number
        initialBorrowedPercentage: number
      }
      price: number
    }

    if (!config || typeof price !== 'number') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const pool = await createCustomPool(config, price)
    return NextResponse.json({ success: true, pool }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create pool'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


