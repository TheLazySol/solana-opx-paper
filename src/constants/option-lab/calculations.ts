import { 
  BASE_ANNUAL_INTEREST_RATE,
  OPTION_CREATION_FEE_RATE,
  BORROW_FEE_RATE,
  TRANSACTION_COST_SOL,
  MAX_LEVERAGE
} from "@/constants/constants";

/* =========================
   Premium & Payout Calculations
   ========================= */

/**
 * Calculates the total premium received for a set of option positions.
 * @param options Array of option objects
 * @returns Total premium in USD
 */
export const calculateTotalPremium = (options: any[]) => {
  return options.reduce((total, option) => {
    return total + (Number(option.premium) * option.quantity * 100)
  }, 0)
}

/* =========================
   Collateral Calculations
   ========================= */

/**
 * Calculates the total collateral needed for a set of options.
 * For both calls and puts, collateral is 100% of strike price * quantity * contract size.
 * @param options Array of option objects
 * @returns Total collateral required
 */
export const calculateCollateralNeeded = (options: any[]) => {
  return options.reduce((total, option) => {
    // For calls, collateral is 100% of strike price
    if (option.optionType.toLowerCase() === 'call') {
      return total + (Number(option.strikePrice) * option.quantity * 100)
    }
    // For puts, collateral is strike price in USD
    return total + (Number(option.strikePrice) * option.quantity * 100)
  }, 0)
}

/**
 * Calculates the required collateral after accounting for position size.
 * @param collateralNeeded Total collateral needed
 * @param positionSize Size of the position
 * @returns Adjusted required collateral
 */
export const calculateRequiredCollateral = (
  collateralNeeded: number,
  positionSize: number
) => {
  // If position size is greater than collateral needed, reduce the required collateral proportionally
  if (positionSize > 0) {
    const coverage = Math.min(positionSize / collateralNeeded, 1)
    return collateralNeeded * (1 - coverage)
  }
  return collateralNeeded
}

/**
 * Checks if the provided collateral (with leverage) is enough to cover the required collateral.
 * @param collateralNeeded Total collateral required
 * @param collateralProvided Collateral provided by user
 * @param leverage Leverage multiplier
 * @returns Boolean indicating sufficiency
 */
export const hasEnoughCollateral = (
  collateralNeeded: number,
  collateralProvided: number,
  leverage: number
) => {
  const totalAvailable = collateralProvided * leverage
  return totalAvailable >= collateralNeeded
}

/**
 * Calculates the optimal leverage needed to exactly meet the collateral requirement.
 * @param collateralNeeded Total collateral required
 * @param collateralProvided Collateral provided by user
 * @param maxLeverage Maximum allowed leverage
 * @returns Optimal leverage (rounded to 2 decimals)
 */
export const calculateOptimalLeverage = (
  collateralNeeded: number,
  collateralProvided: number,
  maxLeverage: number = MAX_LEVERAGE
): number => {
  if (collateralProvided <= 0) return 1;
  
  // Calculate the leverage needed to exactly meet the collateral requirement
  const requiredLeverage = collateralNeeded / collateralProvided;
  
  // Round to 2 decimal places and ensure the leverage is within bounds
  return Number(Math.min(Math.max(1, requiredLeverage), maxLeverage).toFixed(2));
}

/* =========================
   Interest & Fee Calculations
   ========================= */

/**
 * Converts an annual interest rate to an hourly rate.
 * @param annualRate Annual interest rate (default: BASE_ANNUAL_INTEREST_RATE)
 * @returns Hourly interest rate
 */
export const calculateHourlyInterestRate = (annualRate: number = BASE_ANNUAL_INTEREST_RATE): number => {
  return annualRate / (365 * 24);
}

/**
 * Calculates the total borrowing cost for a given amount, rate, and duration.
 * @param amountBorrowed Amount borrowed
 * @param hourlyRate Hourly interest rate
 * @param hours Number of hours borrowed
 * @returns Total borrowing cost
 */
export const calculateBorrowCost = (
  amountBorrowed: number,
  hourlyRate: number,
  hours: number
): number => {
  return amountBorrowed * hourlyRate * hours;
}

/**
 * Returns the fixed option creation fee.
 * @returns Option creation fee (in SOL)
 */
export const calculateOptionCreationFee = (): number => {
  return OPTION_CREATION_FEE_RATE;
}

/**
 * Calculates the borrow fee for a given borrowed amount.
 * @param amountBorrowed Amount borrowed
 * @returns Borrow fee
 */
export const calculateBorrowFee = (amountBorrowed: number): number => {
  return amountBorrowed * BORROW_FEE_RATE;
}

/* =========================
   Profit & Risk Calculations
   ========================= */

/**
 * Calculates the maximum profit potential for an option seller.
 * @param totalPremium Total premium received
 * @param borrowCost Total borrowing cost
 * @param optionCreationFee Option creation fee
 * @param transactionCost Transaction cost in SOL (default: TRANSACTION_COST_SOL)
 * @param solPrice Current SOL price in USD (default: 1)
 * @returns Maximum profit potential in USD
 */
export const calculateMaxProfitPotential = (
  totalPremium: number,
  borrowCost: number,
  optionCreationFee: number,
  transactionCost: number = TRANSACTION_COST_SOL,
  solPrice: number = 1 // Default SOL price in USD if not provided
): number => {
  const transactionCostInUSD = transactionCost * solPrice;
  return totalPremium - borrowCost - optionCreationFee - transactionCostInUSD;
}

/**
 * Calculates the minimum collateral required for a given leverage.
 * @param collateralNeeded Total collateral required
 * @param maxLeverage Maximum allowed leverage
 * @returns Minimum collateral required
 */
export const calculateMinCollateralRequired = (
  collateralNeeded: number,
  maxLeverage: number = MAX_LEVERAGE
): number => {
  return collateralNeeded / maxLeverage;
}

/* =========================
   Liquidation Calculations
   ========================= */

/**
 * Calculate the liquidation price for an option seller based on their collateral and leverage
 * 
 * @param options Array of option positions
 * @param collateralProvided Amount of collateral provided by the seller
 * @param leverage Leverage used by the seller
 * @param currentPrice Current price of the underlying asset
 * @returns An object containing liquidation prices: {upward: number|null, downward: number|null}
 */
export const calculateLiquidationPrice = (
  options: any[], 
  collateralProvided: number,
  leverage: number,
  currentPrice: number
): { upward: number | null, downward: number | null } => {
  if (options.length === 0 || collateralProvided <= 0 || currentPrice <= 0) {
    return { upward: null, downward: null };
  }

  // Total premium received (this is our max profit at expiration)
  const totalPremium = calculateTotalPremium(options);
  
  // Liquidation occurs when losses exceed collateral provided
  // We need to find prices where: totalPremium - optionPayout = -collateralProvided
  
  // Initialize liquidation prices
  let upwardLiquidationPrice: number | null = null;
  let downwardLiquidationPrice: number | null = null;
  
  // Separate calls and puts for easier analysis
  const calls = options.filter(opt => opt.optionType.toLowerCase() === 'call');
  const puts = options.filter(opt => opt.optionType.toLowerCase() === 'put');
  
  // Check for upward liquidation (relevant when selling calls)
  if (calls.length > 0) {
    // For each call option, calculate at what higher price we hit liquidation
    // For simplicity, we'll use a linear approximation for the worst-case call
    const worstCall = calls.reduce((worst, current) => {
      const currentRisk = Number(current.quantity) * 100; // 100 units per contract
      const worstRisk = Number(worst?.quantity || 0) * 100;
      return currentRisk > worstRisk ? current : worst;
    }, null);
    
    if (worstCall) {
      const strikePrice = Number(worstCall.strikePrice);
      // At liquidation: totalPremium - leverage * (price - strike) * quantity * 100 = -collateralProvided
      // Solve for price:
      const price = strikePrice + (totalPremium + collateralProvided) / (leverage * Number(worstCall.quantity) * 100);
      upwardLiquidationPrice = price > strikePrice ? price : null;
    }
  }
  
  // Check for downward liquidation (relevant when selling puts)
  if (puts.length > 0) {
    // For each put option, calculate at what lower price we hit liquidation
    // For simplicity, we'll use a linear approximation for the worst-case put
    const worstPut = puts.reduce((worst, current) => {
      const currentRisk = Number(current.quantity) * 100; // 100 units per contract
      const worstRisk = Number(worst?.quantity || 0) * 100;
      return currentRisk > worstRisk ? current : worst;
    }, null);
    
    if (worstPut) {
      const strikePrice = Number(worstPut.strikePrice);
      // At liquidation: totalPremium - leverage * (strike - price) * quantity * 100 = -collateralProvided
      // Solve for price:
      const price = strikePrice - (totalPremium + collateralProvided) / (leverage * Number(worstPut.quantity) * 100);
      downwardLiquidationPrice = price < strikePrice && price > 0 ? price : null;
    }
  }
  
  return { upward: upwardLiquidationPrice, downward: downwardLiquidationPrice };
};

/* =========================
   Position Management Calculations
   ========================= */

/**
 * Calculates the average entry price for a position based on fill history
 * 
 * @param previousAvgPrice Previous average price 
 * @param previousFilledQuantity Previous filled quantity
 * @param newFillPrice New fill price
 * @param newFillQuantity New fill quantity
 * @returns The new average entry price
 */
export const calculateAverageEntryPrice = (
  previousAvgPrice: number,
  previousFilledQuantity: number,
  newFillPrice: number,
  newFillQuantity: number
): number => {
  // If there's no previous history or quantities are zero, return the new price
  if (previousFilledQuantity <= 0 || previousAvgPrice <= 0) {
    return newFillPrice;
  }

  // If new quantity is zero, maintain the previous average
  if (newFillQuantity <= 0) {
    return previousAvgPrice;
  }

  // Calculate weighted average: (prevQty * prevPrice + newQty * newPrice) / totalQty
  const totalQuantity = previousFilledQuantity + newFillQuantity;
  const weightedSum = (previousAvgPrice * previousFilledQuantity) + (newFillPrice * newFillQuantity);
  
  return weightedSum / totalQuantity;
}; 