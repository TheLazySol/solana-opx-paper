// OMLP Pool Configuration Constants
const OMLP_POOL_CONFIG = {
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

// SOL Pool Configuration
const SOL_POOL_CONFIG = {
  token: 'SOL',
  tokenAddress: 'So11111111111111111111111111111111111111112',
  initialSupply: 1000, // 1000 SOL initial pool supply
  baseSupplyApy: OMLP_POOL_CONFIG.BASE_SUPPLY_APY,
  baseBorrowApy: OMLP_POOL_CONFIG.BASE_BORROW_APY,
  supplyLimitMultiplier: OMLP_POOL_CONFIG.DEFAULT_SUPPLY_LIMIT_MULTIPLIER,
  utilizationMultiplier: OMLP_POOL_CONFIG.UTILIZATION_RATE_MULTIPLIER,
  // Mock initial borrowed amount (30% utilization)
  initialBorrowedPercentage: 30,
} as const

/**
 * Calculate the utilization rate of a pool
 * @param borrowed - Amount borrowed from the pool
 * @param supply - Total supply in the pool
 * @returns Utilization rate as a percentage (0-100)
 */
export function calculateUtilization(borrowed: number, supply: number): number {
  if (supply === 0) return 0
  return (borrowed / supply) * 100
}

/**
 * Calculate dynamic supply APY based on utilization
 * @param baseApy - Base supply APY
 * @param utilization - Current utilization rate (0-100)
 * @param utilizationMultiplier - How much APY increases per 1% utilization
 * @returns Dynamic supply APY
 */
export function calculateSupplyApy(
  baseApy: number, 
  utilization: number, 
  utilizationMultiplier: number = OMLP_POOL_CONFIG.UTILIZATION_RATE_MULTIPLIER
): number {
  // Supply APY increases with utilization
  const utilizationBonus = Math.max(0, utilization - OMLP_POOL_CONFIG.MIN_UTILIZATION_FOR_DYNAMIC_RATES) * utilizationMultiplier
  return Number((baseApy + utilizationBonus).toFixed(2))
}

/**
 * Calculate dynamic borrow APY based on utilization
 * @param baseApy - Base borrow APY
 * @param utilization - Current utilization rate (0-100)
 * @param utilizationMultiplier - How much APY increases per 1% utilization
 * @returns Dynamic borrow APY
 */
export function calculateBorrowApy(
  baseApy: number, 
  utilization: number, 
  utilizationMultiplier: number = OMLP_POOL_CONFIG.UTILIZATION_RATE_MULTIPLIER
): number {
  // Borrow APY increases more aggressively with high utilization
  const utilizationPenalty = utilization * utilizationMultiplier * 1.5 // 1.5x multiplier for borrow rates
  
  // Additional penalty for high utilization (>90%)
  const highUtilizationPenalty = utilization > OMLP_POOL_CONFIG.MAX_UTILIZATION_THRESHOLD 
    ? (utilization - OMLP_POOL_CONFIG.MAX_UTILIZATION_THRESHOLD) * 0.5 
    : 0
  
  return Number((baseApy + utilizationPenalty + highUtilizationPenalty).toFixed(2))
}

/**
 * Calculate the borrowed amount based on initial supply and utilization percentage
 * @param supply - Total supply in the pool
 * @param utilizationPercentage - Target utilization percentage (0-100)
 * @returns Borrowed amount
 */
export function calculateBorrowedAmount(supply: number, utilizationPercentage: number): number {
  return (supply * utilizationPercentage) / 100
}

/**
 * Calculate the supply limit for a pool
 * @param initialSupply - Initial pool supply
 * @param multiplier - Supply limit multiplier
 * @returns Supply limit
 */
export function calculateSupplyLimit(initialSupply: number, multiplier: number): number {
  return initialSupply * multiplier
}

/**
 * Generate a complete SOL pool object with calculated values
 * @param tokenPrice - Current SOL token price in USD
 * @param customSupply - Optional custom supply amount (defaults to initial supply)
 * @returns Complete SOL pool object with all calculated values
 */
export function generateSolPoolData(tokenPrice: number, customSupply?: number) {
  const config = SOL_POOL_CONFIG

  const supply = customSupply ?? config.initialSupply
  const borrowed = calculateBorrowedAmount(supply, config.initialBorrowedPercentage)
  const utilization = calculateUtilization(borrowed, supply)
  const supplyApy = calculateSupplyApy(config.baseSupplyApy, utilization, config.utilizationMultiplier)
  const borrowApy = calculateBorrowApy(config.baseBorrowApy, utilization, config.utilizationMultiplier)
  const supplyLimit = calculateSupplyLimit(config.initialSupply, config.supplyLimitMultiplier)

  return {
    token: config.token,
    supply,
    supplyApy,
    borrowed,
    borrowApy,
    utilization: Number(utilization.toFixed(2)),
    supplyLimit,
    tokenPrice,
  }
}

/**
 * Calculate interest earned over time
 * @param principal - Principal amount
 * @param apy - Annual percentage yield
 * @param timeInDays - Time period in days
 * @returns Interest earned
 */
export function calculateInterestEarned(principal: number, apy: number, timeInDays: number): number {
  const dailyRate = apy / 365 / 100
  return principal * dailyRate * timeInDays
}

/**
 * Calculate compound interest with daily compounding
 * @param principal - Principal amount
 * @param apy - Annual percentage yield
 * @param timeInDays - Time period in days
 * @returns Final amount with compound interest
 */
export function calculateCompoundInterest(principal: number, apy: number, timeInDays: number): number {
  const dailyRate = apy / 365 / 100
  return principal * Math.pow(1 + dailyRate, timeInDays)
}

/**
 * Calculate the health factor for a lending position
 * @param collateralValue - Value of collateral in USD
 * @param borrowedValue - Value of borrowed amount in USD
 * @param liquidationThreshold - Liquidation threshold percentage (0-100)
 * @returns Health factor (>1 is healthy, <1 is at risk of liquidation)
 */
export function calculateHealthFactor(
  collateralValue: number, 
  borrowedValue: number, 
  liquidationThreshold: number = OMLP_POOL_CONFIG.LIQUIDATION_THRESHOLD
): number {
  if (borrowedValue === 0) return Infinity
  return (collateralValue * liquidationThreshold / 100) / borrowedValue
}
