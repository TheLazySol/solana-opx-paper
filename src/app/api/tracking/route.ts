import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for tracking data
const trackingSchema = z.object({
  sessionId: z.string().optional(),
  actionType: z.string(),
  actionName: z.string(),
  pagePath: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = trackingSchema.parse(body)
    
    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Create or get session
    let sessionId = validatedData.sessionId
    if (!sessionId) {
      const session = await prisma.userSession.create({
        data: {
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userAgent: validatedData.userAgent || userAgent,
          ipAddress: validatedData.ipAddress || ipAddress,
        },
      })
      sessionId = session.sessionId
    }
    
    // Create action record
    const action = await prisma.userAction.create({
      data: {
        sessionId,
        actionType: validatedData.actionType,
        actionName: validatedData.actionName,
        pagePath: validatedData.pagePath,
        metadata: validatedData.metadata,
      },
    })
    
    return NextResponse.json({ 
      success: true, 
      sessionId,
      actionId: action.id 
    })
    
  } catch (error) {
    console.error('Tracking error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid tracking data', details: error.errors },
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
    // Get basic stats (you can expand this based on your needs)
    const [totalSessions, totalActions, recentActions] = await Promise.all([
      prisma.userSession.count(),
      prisma.userAction.count(),
      prisma.userAction.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: { session: true },
      }),
    ])
    
    return NextResponse.json({
      stats: {
        totalSessions,
        totalActions,
      },
      recentActions,
    })
    
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

