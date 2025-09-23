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

// SOL-specific Pool Configuration
export const SOL_POOL_CONFIG: BasePoolConfig = {
  // Asset identification
  token: TOKENS.SOL.symbol,
  tokenAddress: TOKENS.SOL.address,
  
  // Pool parameters
  initialSupply: 1000, // 1000 SOL initial pool supply
  
  // Interest rates (annualized %)
  baseSupplyApy: 0.0, // 0% base supply APY for SOL
  baseBorrowApy: 0.0, // 0% base borrow APY for SOL
  
  // Interest rate dynamics
  utilizationRateMultiplier: 0.05, // How much APY increases per 1% utilization for SOL
  borrowSpread: 5.0, // 5% spread between supply and borrow rates for SOL
  
  // Pool limits and parameters
  supplyLimit: 5000, // Maximum 5000 SOL can be supplied to the pool
  minUtilizationForDynamicRates: 10, // 10% minimum utilization before dynamic rates kick in for SOL
  maxUtilizationThreshold: 90, // 90% utilization threshold for rate adjustments for SOL
  
  // Risk parameters specific to SOL
  liquidationThreshold: 100, // 100% loan-to-value ratio for SOL
  liquidationPenalty: 1.5, // 1.5% liquidation penalty for SOL
  
  // Initial state
  initialBorrowedPercentage: 0, // Start with 0% utilization for SOL
} as const

// Pool configurations organized by asset
export const POOL_CONFIGS = {
  SOL: SOL_POOL_CONFIG,
  // Future assets can be added here with their own unique configurations:
  // USDC: USDC_POOL_CONFIG,
  // wBTC: wBTC_POOL_CONFIG,
  // etc.
} as const

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

// Backward compatibility - keeping this for existing imports
export const OMLP_POOL_CONFIG = {
  BASE_SUPPLY_APY: SOL_POOL_CONFIG.baseSupplyApy,
  BASE_BORROW_APY: SOL_POOL_CONFIG.baseBorrowApy,
  UTILIZATION_RATE_MULTIPLIER: SOL_POOL_CONFIG.utilizationRateMultiplier,
  BORROW_SPREAD: SOL_POOL_CONFIG.borrowSpread,
  SUPPLY_LIMIT: SOL_POOL_CONFIG.supplyLimit, // Changed from multiplier to static limit
  MIN_UTILIZATION_FOR_DYNAMIC_RATES: SOL_POOL_CONFIG.minUtilizationForDynamicRates,
  MAX_UTILIZATION_THRESHOLD: SOL_POOL_CONFIG.maxUtilizationThreshold,
  LIQUIDATION_THRESHOLD: SOL_POOL_CONFIG.liquidationThreshold,
  LIQUIDATION_PENALTY: SOL_POOL_CONFIG.liquidationPenalty,
} as const
