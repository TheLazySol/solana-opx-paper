import { prisma } from './prisma'

/**
 * Get navigation click statistics
 */
export async function getNavigationStats() {
  try {
    // Get all navigation clicks
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
        session: {
          select: {
            user: {
              select: {
                walletId: true
              }
            }
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    // Calculate statistics
    const stats = {
      trade: 0,
      optionLab: 0,
      omlp: 0,
      total: navActions.length,
      uniqueUsers: new Set(),
      recentClicks: [] as any[]
    }

    navActions.forEach(action => {
      // Count by navigation type
      if (action.actionName.includes('trade')) stats.trade++
      if (action.actionName.includes('option_lab')) stats.optionLab++
      if (action.actionName.includes('omlp')) stats.omlp++
      
      // Track unique users
      const walletId = action.session?.user?.walletId
      if (walletId) stats.uniqueUsers.add(walletId)
    })

    // Get recent clicks (last 10)
    stats.recentClicks = navActions.slice(0, 10).map(action => ({
      name: action.actionName.replace('nav_', '').replace(/_/g, ' '),
      path: (action.metadata as any)?.navigationTo || 'unknown',
      fromPath: (action.metadata as any)?.fromPath || 'unknown',
      walletConnected: (action.metadata as any)?.walletConnected || false,
      walletId: action.session?.user?.walletId?.slice(0, 8) + '...' || 'Not connected',
      timestamp: action.timestamp
    }))

    return {
      success: true,
      stats: {
        navigationCounts: {
          trade: stats.trade,
          optionLab: stats.optionLab,
          omlp: stats.omlp,
          total: stats.total
        },
        uniqueUsers: stats.uniqueUsers.size,
        recentClicks: stats.recentClicks
      }
    }
  } catch (error) {
    console.error('Navigation stats error:', error)
    return {
      success: false,
      error: 'Failed to fetch navigation stats'
    }
  }
}

/**
 * Get navigation stats for a specific wallet
 */
export async function getWalletNavigationHistory(walletId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { walletId },
      include: {
        sessions: {
          include: {
            actions: {
              where: {
                actionType: 'button_click',
                actionName: {
                  startsWith: 'nav_'
                }
              },
              orderBy: {
                timestamp: 'desc'
              }
            }
          }
        }
      }
    })

    if (!user) {
      return {
        success: false,
        error: 'Wallet not found'
      }
    }

    // Flatten all navigation actions
    const allNavActions = user.sessions.flatMap(session => session.actions)

    // Count navigation types
    const navigationCounts = {
      trade: allNavActions.filter(a => a.actionName.includes('trade')).length,
      optionLab: allNavActions.filter(a => a.actionName.includes('option_lab')).length,
      omlp: allNavActions.filter(a => a.actionName.includes('omlp')).length,
      total: allNavActions.length
    }

    return {
      success: true,
      walletId,
      navigationCounts,
      history: allNavActions.slice(0, 20).map(action => ({
        name: action.actionName.replace('nav_', '').replace(/_/g, ' '),
        path: (action.metadata as any)?.navigationTo || 'unknown',
        timestamp: action.timestamp
      }))
    }
  } catch (error) {
    console.error('Wallet navigation history error:', error)
    return {
      success: false,
      error: 'Failed to fetch wallet navigation history'
    }
  }
}
