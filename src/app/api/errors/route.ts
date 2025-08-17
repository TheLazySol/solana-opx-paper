import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for error logging
const errorSchema = z.object({
  sessionId: z.string().optional(),
  errorType: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = errorSchema.parse(body)
    
    // Create error log record
    const errorLog = await prisma.errorLog.create({
      data: {
        sessionId: validatedData.sessionId,
        errorType: validatedData.errorType,
        message: validatedData.message,
        stack: validatedData.stack,
        metadata: validatedData.metadata,
      },
    })
    
    return NextResponse.json({ 
      success: true, 
      errorId: errorLog.id 
    })
    
  } catch (error) {
    console.error('Error logging error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid error data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get error statistics
    const [totalErrors, recentErrors, errorTypes] = await Promise.all([
      prisma.errorLog.count(),
      prisma.errorLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.errorLog.groupBy({
        by: ['errorType'],
        _count: { errorType: true },
        orderBy: { _count: { errorType: 'desc' } },
      }),
    ])
    
    return NextResponse.json({
      stats: {
        totalErrors,
        errorTypes,
      },
      recentErrors,
    })
    
  } catch (error) {
    console.error('Error stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

