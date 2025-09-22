import { TOKENS } from '@/constants/token-list/token-list'

// OMLP Pool Configuration Constants
export const OMLP_POOL_CONFIG = {
  // Base interest rates (annualized %)
  BASE_SUPPLY_APY: 2.5,
  BASE_BORROW_APY: 5.0,
  
  // Interest rate spreads and multipliers
  UTILIZATION_RATE_MULTIPLIER: 0.15, // How much APY increases per 1% utilization
  BORROW_SPREAD: 2.5, // Spread between supply and borrow rates
  
  // Pool limits and parameters
  DEFAULT_SUPPLY_LIMIT_MULTIPLIER: 5, // 5x the initial supply
  MIN_UTILIZATION_FOR_DYNAMIC_RATES: 10, // 10% minimum utilization before dynamic rates kick in
  MAX_UTILIZATION_THRESHOLD: 90, // 90% utilization threshold for rate adjustments
  
  // Risk parameters
  LIQUIDATION_THRESHOLD: 80, // 80% loan-to-value ratio
  LIQUIDATION_PENALTY: 5, // 5% liquidation penalty
} as const

// Individual Pool Configurations
export const POOL_CONFIGS = {
  SOL: {
    token: TOKENS.SOL.symbol,
    tokenAddress: TOKENS.SOL.address,
    initialSupply: 1000, // 1000 SOL initial pool supply
    baseSupplyApy: OMLP_POOL_CONFIG.BASE_SUPPLY_APY,
    baseBorrowApy: OMLP_POOL_CONFIG.BASE_BORROW_APY,
    supplyLimitMultiplier: OMLP_POOL_CONFIG.DEFAULT_SUPPLY_LIMIT_MULTIPLIER,
    utilizationMultiplier: OMLP_POOL_CONFIG.UTILIZATION_RATE_MULTIPLIER,
    // Mock initial borrowed amount (30% utilization)
    initialBorrowedPercentage: 30,
  },
  // Add more pools here as needed
} as const

// Export pool keys for type safety
export type PoolKey = keyof typeof POOL_CONFIGS
export const AVAILABLE_POOLS: PoolKey[] = Object.keys(POOL_CONFIGS) as PoolKey[]
