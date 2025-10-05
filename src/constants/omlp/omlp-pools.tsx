import { TOKENS } from '@/constants/token-list/token-list'

// Base configuration interface for all OMLP pools
export interface BasePoolConfig {
  token: string
  tokenAddress: string
  initialSupply: number
  baseSupplyApy: number
  baseBorrowApy: number
  utilizationRateMultiplier: number
  borrowSpread: number
  supplyLimit: number // Static supply limit in native token units
  minUtilizationForDynamicRates: number
  maxUtilizationThreshold: number
  liquidationThreshold: number
  liquidationPenalty: number
  initialBorrowedPercentage: number
}

// Pool configurations organized by asset
// Pools are now created dynamically via the admin panel
export const POOL_CONFIGS = {} as Record<string, BasePoolConfig>

// Global constants that might be shared across pools (if any)
export const GLOBAL_OMLP_CONFIG = {
  // Platform-wide settings that don't vary by asset
  PLATFORM_FEE_RATE: 0.0000, // 0.00% platform fee
  MIN_DEPOSIT_AMOUNT: 0.001, // Minimum deposit amount in native token units
  MAX_POOLS_PER_USER: 10, // Maximum number of pools a user can participate in
} as const

// Export pool keys for type safety
export type PoolKey = keyof typeof POOL_CONFIGS
export const AVAILABLE_POOLS: PoolKey[] = Object.keys(POOL_CONFIGS) as PoolKey[]
