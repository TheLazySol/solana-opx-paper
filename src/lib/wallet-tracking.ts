import { prisma } from './prisma'

export interface WalletTrackingOptions {
  walletId: string
  sessionId?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export interface TrackActionOptions extends WalletTrackingOptions {
  actionType: string
  actionName: string
  pagePath?: string
}

/**
 * Track wallet connection - creates user if doesn't exist and logs the connection
 */
export async function trackWalletConnection(options: WalletTrackingOptions) {
  try {
    const { walletId, sessionId, userAgent, metadata } = options
    
    // Find or create user
    let user = await prisma.user.findUnique({ where: { walletId } })
    if (!user) {
      console.log('Creating new user for walletId:', walletId)
      user = await prisma.user.create({
        data: { walletId },
      })
    }

    // Create or get session
    let currentSessionId = sessionId
    if (!currentSessionId) {
      const session = await prisma.userSession.create({
        data: {
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userAgent: userAgent || 'unknown',
          userId: user.id,
        },
      })
      currentSessionId = session.sessionId
    }

    // Track the wallet connection action
    const action = await prisma.userAction.create({
      data: {
        sessionId: currentSessionId,
        actionType: 'wallet_connection',
        actionName: 'wallet_connected',
        metadata: {
          walletId,
          connectionTime: new Date().toISOString(),
          ...metadata,
        },
      },
    })

    return {
      success: true,
      user,
      sessionId: currentSessionId,
      actionId: action.id,
    }
  } catch (error) {
    console.error('Wallet connection tracking error:', error)
    throw error
  }
}

/**
 * Track wallet disconnection
 */
export async function trackWalletDisconnection(options: WalletTrackingOptions) {
  try {
    const { walletId, sessionId, userAgent, metadata } = options
    
    // Find user
    const user = await prisma.user.findUnique({ where: { walletId } })
    if (!user) {
      console.warn('Attempting to track disconnection for non-existent wallet:', walletId)
      return { success: false, error: 'User not found' }
    }

    // Use existing session or create one
    let currentSessionId = sessionId
    if (!currentSessionId) {
      const session = await prisma.userSession.create({
        data: {
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userAgent: userAgent || 'unknown',
          userId: user.id,
        },
      })
      currentSessionId = session.sessionId
    }

    // Track the wallet disconnection action
    const action = await prisma.userAction.create({
      data: {
        sessionId: currentSessionId,
        actionType: 'wallet_connection',
        actionName: 'wallet_disconnected',
        metadata: {
          walletId,
          disconnectionTime: new Date().toISOString(),
          ...metadata,
        },
      },
    })

    return {
      success: true,
      user,
      sessionId: currentSessionId,
      actionId: action.id,
    }
  } catch (error) {
    console.error('Wallet disconnection tracking error:', error)
    throw error
  }
}

/**
 * Track any wallet-related action
 */
export async function trackWalletAction(options: TrackActionOptions) {
  try {
    const { walletId, actionType, actionName, pagePath, sessionId, userAgent, metadata } = options
    
    // Find or create user
    let user = await prisma.user.findUnique({ where: { walletId } })
    if (!user) {
      user = await prisma.user.create({
        data: { walletId },
      })
    }

    // Create or get session
    let currentSessionId = sessionId
    if (!currentSessionId) {
      const session = await prisma.userSession.create({
        data: {
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userAgent: userAgent || 'unknown',
          userId: user.id,
        },
      })
      currentSessionId = session.sessionId
    }

    // Track the action
    const action = await prisma.userAction.create({
      data: {
        sessionId: currentSessionId,
        actionType,
        actionName,
        pagePath,
        metadata: {
          walletId,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      },
    })

    return {
      success: true,
      user,
      sessionId: currentSessionId,
      actionId: action.id,
    }
  } catch (error) {
    console.error('Wallet action tracking error:', error)
    throw error
  }
}

/**
 * Get wallet connection stats
 */
export async function getWalletStats() {
  try {
    const [
      totalUsers,
      totalConnections,
      uniqueConnectionsToday,
      recentConnections,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userAction.count({
        where: { actionName: 'wallet_connected' },
      }),
      prisma.userAction.count({
        where: {
          actionName: 'wallet_connected',
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.userAction.findMany({
        where: { actionName: 'wallet_connected' },
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          session: {
            include: { user: true },
          },
        },
      }),
    ])

    return {
      totalUsers,
      totalConnections,
      uniqueConnectionsToday,
      recentConnections,
    }
  } catch (error) {
    console.error('Wallet stats error:', error)
    throw error
  }
}

/**
 * Get wallet connection history for a specific wallet
 */
export async function getWalletHistory(walletId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { walletId },
      include: {
        sessions: {
          include: {
            actions: {
              orderBy: { timestamp: 'desc' },
            },
          },
        },
      },
    })

    if (!user) {
      return { success: false, error: 'Wallet not found' }
    }

    return {
      success: true,
      user,
      totalSessions: user.sessions.length,
      totalActions: user.sessions.reduce((acc, session) => acc + session.actions.length, 0),
    }
  } catch (error) {
    console.error('Wallet history error:', error)
    throw error
  }
}
