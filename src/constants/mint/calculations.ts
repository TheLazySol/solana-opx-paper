export const calculateTotalPremium = (options: any[]) => {
  return options.reduce((total, option) => {
    return total + (Number(option.premium) * option.quantity * 100)
  }, 0)
}

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