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
  walletId: z.string(), // Add walletId to schema
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = trackingSchema.parse(body)
    
    console.log('Received tracking request:', validatedData)

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Extract walletId from request (assuming it's sent in the body)
    const { walletId } = validatedData
    console.log('Processing walletId:', walletId)

    // Find or create user
    let user = await prisma.user.findUnique({ where: { walletId } })
    if (!user) {
      console.log('Creating new user for walletId:', walletId)
      user = await prisma.user.create({
        data: { walletId },
      })
    } else {
      console.log('Found existing user for walletId:', walletId)
    }

    // Create or get session
    let sessionId = validatedData.sessionId
    if (!sessionId) {
      const session = await prisma.userSession.create({
        data: {
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userAgent: validatedData.userAgent || userAgent,
          userId: user.id, // Associate session with user
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

export async function GET(request: NextRequest) {
  try {
    // Check if requesting navigation stats specifically
    const { searchParams } = new URL(request.url)
    const statsType = searchParams.get('type')
    
    if (statsType === 'navigation') {
      // Get navigation-specific stats
      const navActions = await prisma.userAction.findMany({
        where: {
          actionType: 'button_click',
          actionName: {
            startsWith: 'nav_'
          }
        },
        select: {
          actionName: true,
          metadata: true,
          timestamp: true,
        },
        orderBy: {
          timestamp: 'desc'
        }
      })
      
      const stats = {
        trade: navActions.filter(a => a.actionName.includes('trade')).length,
        optionLab: navActions.filter(a => a.actionName.includes('option_lab')).length,
        omlp: navActions.filter(a => a.actionName.includes('omlp')).length,
        total: navActions.length
      }
      
      return NextResponse.json({
        navigationStats: stats,
        recentNavigations: navActions.slice(0, 10)
      })
    }
    
    // Default: Get basic stats
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

