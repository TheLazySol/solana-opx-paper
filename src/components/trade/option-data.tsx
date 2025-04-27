// Types for option data
export interface OptionGreeks {
  delta: number
  theta: number
  gamma: number
  vega: number
  rho: number
}

export interface OptionContract {
  strike: number
  expiry: string
  // Call side
  callBid: number
  callAsk: number
  callVolume: number
  callOpenInterest: number
  callGreeks: OptionGreeks
  callOptionsAvailable: number
  // Put side
  putBid: number
  putAsk: number
  putVolume: number
  putOpenInterest: number
  putGreeks: OptionGreeks
  putOptionsAvailable: number
}

// Import Black-Scholes model and constants
import { calculateOption } from '@/lib/option-pricing-model/black-scholes-model'
import { 
  SOL_PH_VOLATILITY, 
  SOL_PH_RISK_FREE_RATE,
  OPTION_SPREAD_PERCENTAGE,
  DEFAULT_OPTION_VOLUME,
  DEFAULT_OPTION_OPEN_INTEREST
} from '@/constants/constants'

// Volume Tracker - keeps track of traded option volumes
// Using a singleton pattern to maintain state across component instances
class OptionVolumeTracker {
  private static instance: OptionVolumeTracker;
  private volumeMap: Map<string, number> = new Map();
  
  private constructor() {}
  
  public static getInstance(): OptionVolumeTracker {
    if (!OptionVolumeTracker.instance) {
      OptionVolumeTracker.instance = new OptionVolumeTracker();
    }
    return OptionVolumeTracker.instance;
  }
  
  // Generate a unique key for an option
  private getOptionKey(strike: number, expiry: string, side: 'call' | 'put'): string {
    return `${side}-${strike}-${expiry}`;
  }
  
  // Get volume for an option
  public getVolume(strike: number, expiry: string, side: 'call' | 'put'): number {
    const key = this.getOptionKey(strike, expiry, side);
    return this.volumeMap.get(key) || DEFAULT_OPTION_VOLUME;
  }
  
  // Update volume for an option
  public updateVolume(strike: number, expiry: string, side: 'call' | 'put', quantity: number): void {
    const key = this.getOptionKey(strike, expiry, side);
    const currentVolume = this.getVolume(strike, expiry, side);
    // Volume is normally reported as an absolute number of contracts traded
    const updated = currentVolume + Math.abs(quantity);
    this.volumeMap.set(key, updated);
  }
  
  // Reset all volumes (for testing)
  public resetAllVolumes(): void {
    this.volumeMap.clear();
  }
}

// Open Interest Tracker - keeps track of active open option positions
// Using a singleton pattern to maintain state across component instances
class OpenInterestTracker {
  private static instance: OpenInterestTracker;
  private openInterestMap: Map<string, number> = new Map();
  
  private constructor() {}
  
  public static getInstance(): OpenInterestTracker {
    if (!OpenInterestTracker.instance) {
      OpenInterestTracker.instance = new OpenInterestTracker();
    }
    return OpenInterestTracker.instance;
  }
  
  // Generate a unique key for an option
  private getOptionKey(strike: number, expiry: string, side: 'call' | 'put'): string {
    return `${side}-${strike}-${expiry}`;
  }
  
  // Get open interest for an option
  public getOpenInterest(strike: number, expiry: string, side: 'call' | 'put'): number {
    const key = this.getOptionKey(strike, expiry, side);
    return this.openInterestMap.get(key) || DEFAULT_OPTION_OPEN_INTEREST;
  }
  
  // Increase open interest for an option (when new positions are opened)
  public increaseOpenInterest(strike: number, expiry: string, side: 'call' | 'put', quantity: number): void {
    const key = this.getOptionKey(strike, expiry, side);
    const currentOI = this.getOpenInterest(strike, expiry, side);
    this.openInterestMap.set(key, currentOI + quantity);
  }
  
  // Decrease open interest for an option (when positions are closed)
  public decreaseOpenInterest(strike: number, expiry: string, side: 'call' | 'put', quantity: number): void {
    const key = this.getOptionKey(strike, expiry, side);
    const currentOI = this.getOpenInterest(strike, expiry, side);
    // Ensure we don't go below zero
    this.openInterestMap.set(key, Math.max(0, currentOI - quantity));
  }
  
  // Reset all open interest (for testing)
  public resetAllOpenInterest(): void {
    this.openInterestMap.clear();
  }
}

// Options Availability Tracker - keeps track of the quantity of options available to trade
// Using a singleton pattern to maintain state across component instances
class OptionsAvailabilityTracker {
  private static instance: OptionsAvailabilityTracker;
  private availabilityMap: Map<string, number> = new Map();
  
  private constructor() {}
  
  public static getInstance(): OptionsAvailabilityTracker {
    if (!OptionsAvailabilityTracker.instance) {
      OptionsAvailabilityTracker.instance = new OptionsAvailabilityTracker();
    }
    return OptionsAvailabilityTracker.instance;
  }
  
  // Generate a unique key for an option
  private getOptionKey(strike: number, expiry: string, side: 'call' | 'put'): string {
    return `${side}-${strike}-${expiry}`;
  }
  
  // Get the quantity of options available
  public getOptionsAvailable(strike: number, expiry: string, side: 'call' | 'put'): number {
    const key = this.getOptionKey(strike, expiry, side);
    // Default to 0 options available if no entry exists
    return this.availabilityMap.get(key) ?? 0;
  }
  
  // Set available quantity for an option
  public setOptionsAvailable(strike: number, expiry: string, side: 'call' | 'put', quantity: number): void {
    const key = this.getOptionKey(strike, expiry, side);
    this.availabilityMap.set(key, Math.max(0, quantity));
  }
  
  // Decrease available options when options are purchased
  public decreaseOptionsAvailable(strike: number, expiry: string, side: 'call' | 'put', quantity: number): void {
    const key = this.getOptionKey(strike, expiry, side);
    const currentAvailable = this.getOptionsAvailable(strike, expiry, side);
    // Ensure we don't go below zero
    this.availabilityMap.set(key, Math.max(0, currentAvailable - quantity));
  }
  
  // Increase available options when options are returned to the market
  public increaseOptionsAvailable(strike: number, expiry: string, side: 'call' | 'put', quantity: number): void {
    const key = this.getOptionKey(strike, expiry, side);
    const currentAvailable = this.getOptionsAvailable(strike, expiry, side);
    this.availabilityMap.set(key, currentAvailable + quantity);
  }
  
  // Reset all availability (for testing)
  public resetAllAvailability(): void {
    this.availabilityMap.clear();
  }
}

// Export the volume tracker instance
export const volumeTracker = OptionVolumeTracker.getInstance();

// Export the open interest tracker instance
export const openInterestTracker = OpenInterestTracker.getInstance();

// Export the options availability tracker instance
export const optionsAvailabilityTracker = OptionsAvailabilityTracker.getInstance();

// Function to update volume when an option is traded
export const updateOptionVolume = (option: SelectedOption): void => {
  if (option && option.quantity) {
    volumeTracker.updateVolume(
      option.strike,
      option.expiry,
      option.side,
      option.quantity
    );
  }
};

// Function to update open interest when an option position is opened
export const updateOptionOpenInterest = (option: SelectedOption): void => {
  if (option && option.quantity) {
    openInterestTracker.increaseOpenInterest(
      option.strike,
      option.expiry,
      option.side,
      option.quantity
    );
  }
};

// Function to decrease open interest when an option position is closed
export const decreaseOptionOpenInterest = (strike: number, expiry: string, side: 'call' | 'put', quantity: number): void => {
  openInterestTracker.decreaseOpenInterest(
    strike,
    expiry,
    side,
    quantity
  );
};

// Helper function to calculate time until expiry in seconds
/**
 * Calculates the time remaining until option expiry in seconds.
 * 
 * @param expiryDate - The expiration date string for the option
 * @returns The number of seconds until expiry, with a minimum of 0 seconds
 * 
 * This function:
 * 1. Converts the expiry date string to a Date object
 * 2. Gets the current time
 * 3. Calculates difference in milliseconds and converts to seconds
 * 4. Returns max of 0 or the calculated time to prevent negative values
 */
function calculateTimeUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const now = new Date()
  
  // Convert both dates to UTC
  const utcExpiry = new Date(expiry.getTime() + expiry.getTimezoneOffset() * 60000)
  const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
  
  return Math.max(0, Math.floor((utcExpiry.getTime() - utcNow.getTime()) / 1000))
}

// Helper function to calculate option data for a given strike
function calculateOptionData(strike: number, expiryDate: string, spotPrice: number): OptionContract {
  const timeUntilExpiry = calculateTimeUntilExpiry(expiryDate)
  
  // Calculate call option
  const callOption = calculateOption({
    isCall: true,
    strikePrice: strike,
    spotPrice: spotPrice,
    timeUntilExpirySeconds: timeUntilExpiry,
    volatility: SOL_PH_VOLATILITY,
    riskFreeRate: SOL_PH_RISK_FREE_RATE
  })

  // Calculate put option
  const putOption = calculateOption({
    isCall: false,
    strikePrice: strike,
    spotPrice: spotPrice,
    timeUntilExpirySeconds: timeUntilExpiry,
    volatility: SOL_PH_VOLATILITY,
    riskFreeRate: SOL_PH_RISK_FREE_RATE
  })

  // Calculate bid-ask spread (1% spread)
  const callMidPrice = callOption.price
  const putMidPrice = putOption.price
  
  const callBid = callMidPrice * (1 - OPTION_SPREAD_PERCENTAGE / 2)
  const callAsk = callMidPrice * (1 + OPTION_SPREAD_PERCENTAGE / 2)
  const putBid = putMidPrice * (1 - OPTION_SPREAD_PERCENTAGE / 2)
  const putAsk = putMidPrice * (1 + OPTION_SPREAD_PERCENTAGE / 2)

  // Get call and put volumes from the tracker
  const callVolume = volumeTracker.getVolume(strike, expiryDate, 'call');
  const putVolume = volumeTracker.getVolume(strike, expiryDate, 'put');
  
  // Get call and put open interest from the tracker
  const callOpenInterest = openInterestTracker.getOpenInterest(strike, expiryDate, 'call');
  const putOpenInterest = openInterestTracker.getOpenInterest(strike, expiryDate, 'put');

  // Check availability status
  const callOptionsAvailable = optionsAvailabilityTracker.getOptionsAvailable(strike, expiryDate, 'call');
  const putOptionsAvailable = optionsAvailabilityTracker.getOptionsAvailable(strike, expiryDate, 'put');

  return {
    strike,
    expiry: expiryDate,
    // Call side
    callBid,
    callAsk,
    callVolume,
    callOpenInterest,
    callGreeks: callOption.greeks,
    callOptionsAvailable,
    // Put side
    putBid,
    putAsk,
    putVolume,
    putOpenInterest,
    putGreeks: putOption.greeks,
    putOptionsAvailable
  }
}

// Mock data generator function
export const generateMockOptionData = (expirationDate: string | null, spotPrice: number, refreshVolume: number): OptionContract[] => {
  // If no spot price is available, return empty array
  if (!spotPrice) {
    return []
  }

  const expiry = expirationDate || "2024-12-31"
  
  // Check for minted options from localStorage
  let mintedOptions: any[] = [];
  try {
    const mintedOptionsStr = localStorage.getItem('mintedOptions');
    if (mintedOptionsStr) {
      mintedOptions = JSON.parse(mintedOptionsStr);
    }
  } catch (error) {
    console.error('Error loading minted options:', error);
  }
  
  // Filter minted options for the current expiration date
  const expiryMintedOptions = mintedOptions.filter(option => 
    option.expiry === expiry
  );
  
  // If no minted options exist for this expiry, return empty array
  if (expiryMintedOptions.length === 0) {
    return [];
  }
  
  // Group options by strike
  const optionsByStrike: Record<number, any[]> = {};
  expiryMintedOptions.forEach(option => {
    if (!optionsByStrike[option.strike]) {
      optionsByStrike[option.strike] = [];
    }
    optionsByStrike[option.strike].push(option);
  });
  
  // Extract strike prices only if they have pending options or filled options
  const strikePrices = Object.entries(optionsByStrike)
    .filter(([_, options]) => {
      // Check if this strike has any pending options
      const hasPendingOptions = options.some(opt => opt.status === 'pending');
      
      // Check if this strike has any filled options (open interest)
      const hasFilledOptions = options.some(opt => opt.status === 'filled');
      
      // Include strikes with either pending options OR filled options
      return hasPendingOptions || hasFilledOptions;
    })
    .map(([strike, _]) => Number(strike));
  
  // Sort strike prices
  strikePrices.sort((a, b) => a - b);
  
  // Generate option data for each valid strike
  const options = strikePrices.map(strike => {
    // Start with the standard calculation
    const option = calculateOptionData(strike, expiry, spotPrice);
    
    // Get all options for this strike
    const strikeOptions = optionsByStrike[strike] || [];
    
    // Process call options
    const callMintedOptions = strikeOptions.filter(o => o.side === 'call');
    if (callMintedOptions.length > 0) {
      // Count only pending options as available
      const pendingCallOptions = callMintedOptions.filter(opt => opt.status === 'pending');
      const totalPendingCallQuantity = pendingCallOptions.reduce((sum, opt) => sum + opt.quantity, 0);
      
      // Set options available to the total pending quantity
      optionsAvailabilityTracker.setOptionsAvailable(strike, expiry, 'call', totalPendingCallQuantity);
      option.callOptionsAvailable = totalPendingCallQuantity;
      
      // Update open interest - just get the current value from tracker
      option.callOpenInterest = openInterestTracker.getOpenInterest(strike, expiry, 'call');
      
      // Get volume from tracker without updating it
      option.callVolume = volumeTracker.getVolume(strike, expiry, 'call');
    }
    
    // Process put options
    const putMintedOptions = strikeOptions.filter(o => o.side === 'put');
    if (putMintedOptions.length > 0) {
      // Count only pending options as available
      const pendingPutOptions = putMintedOptions.filter(opt => opt.status === 'pending');
      const totalPendingPutQuantity = pendingPutOptions.reduce((sum, opt) => sum + opt.quantity, 0);
      
      // Set options available to the total pending quantity
      optionsAvailabilityTracker.setOptionsAvailable(strike, expiry, 'put', totalPendingPutQuantity);
      option.putOptionsAvailable = totalPendingPutQuantity;
      
      // Update open interest - just get the current value from tracker
      option.putOpenInterest = openInterestTracker.getOpenInterest(strike, expiry, 'put');
      
      // Get volume from tracker without updating it
      option.putVolume = volumeTracker.getVolume(strike, expiry, 'put');
    }
    
    return option;
  });
  
  return options;
}

// Selected option type
export interface SelectedOption {
  index: number
  asset: string
  strike: number
  expiry: string
  type: 'bid' | 'ask'
  side: 'call' | 'put'
  price: number
  quantity: number
  limitPrice?: number
}

// Function to handle when an option is filled (bought from a seller)
export const handleOptionFill = (
  strike: number,
  expiry: string,
  side: 'call' | 'put',
  quantity: number,
  price: number
): void => {
  // 1. Update volume since a trade happened
  volumeTracker.updateVolume(strike, expiry, side, quantity);
  
  // 2. Update open interest (a new position was opened)
  openInterestTracker.increaseOpenInterest(strike, expiry, side, quantity);
  
  // 3. Decrease available options
  const currentAvailable = optionsAvailabilityTracker.getOptionsAvailable(strike, expiry, side);
  if (currentAvailable >= quantity) {
    optionsAvailabilityTracker.decreaseOptionsAvailable(strike, expiry, side, quantity);
    
    // 4. Get minted options from localStorage
    try {
      const mintedOptionsStr = localStorage.getItem('mintedOptions');
      if (mintedOptionsStr) {
        const mintedOptions = JSON.parse(mintedOptionsStr);
        
        // Find pending options that match this criteria
        const pendingOptions = mintedOptions.filter((opt: any) => 
          opt.strike === strike && 
          opt.expiry === expiry && 
          opt.side === side && 
          opt.status === 'pending'
        );
        
        // We need to find which pending option(s) to update
        let remainingToFill = quantity;
        const updatedOptions = mintedOptions.map((opt: any) => {
          // Skip if not matching or not pending or no more quantity to fill
          if (
            opt.strike !== strike || 
            opt.expiry !== expiry || 
            opt.side !== side || 
            opt.status !== 'pending' ||
            remainingToFill <= 0
          ) {
            return opt;
          }
          
          // Calculate how much of this option to fill
          const fillAmount = Math.min(remainingToFill, opt.quantity);
          remainingToFill -= fillAmount;
          
          // Update the option status
          if (fillAmount >= opt.quantity) {
            // Fully filled
            return {
              ...opt,
              status: 'filled',
              filledAt: new Date().toISOString(),
              filledPrice: price
            };
          } else {
            // Partially filled - split into two options
            // First part: filled portion
            const filledOption = {
              ...opt,
              quantity: fillAmount,
              status: 'filled',
              filledAt: new Date().toISOString(),
              filledPrice: price,
              id: `${opt.id}-filled-${Date.now()}`
            };
            
            // Second part: remaining pending portion
            opt.quantity -= fillAmount;
            
            // Return the filled option, the pending option stays in the array
            return filledOption;
          }
        });
        
        // Add any pending options that weren't fully filled
        const updatedMintedOptions = [
          ...updatedOptions,
          // Add back any partially filled options with their remaining quantities
          ...mintedOptions.filter((opt: any) => 
            opt.strike === strike && 
            opt.expiry === expiry && 
            opt.side === side && 
            opt.status === 'pending' &&
            opt.quantity > 0
          )
        ];
        
        // Save back to localStorage
        localStorage.setItem('mintedOptions', JSON.stringify(updatedMintedOptions));
        
        // Dispatch custom event to notify components
        window.dispatchEvent(new CustomEvent('mintedOptionsUpdated'));
      }
    } catch (error) {
      console.error('Error updating minted options:', error);
    }
  }
}

// Function to match pending buy orders with minted options
export const matchBuyOrderWithMintedOptions = (
  buyOrder: SelectedOption,
  buyerPositionId: string, 
  buyerLegIndex: number
): void => {
  // Check if there are available options of this type to buy
  const availableQuantity = optionsAvailabilityTracker.getOptionsAvailable(
    buyOrder.strike,
    buyOrder.expiry,
    buyOrder.side
  );
  
  if (availableQuantity <= 0 || !buyOrder.quantity) {
    console.log('No options available to buy');
    return;
  }
  
  // Calculate how many options can be filled
  const fillQuantity = Math.min(buyOrder.quantity, availableQuantity);
  
  if (fillQuantity <= 0) return;
  
  // Process this filled order
  handleOptionFill(
    buyOrder.strike,
    buyOrder.expiry, 
    buyOrder.side,
    fillQuantity,
    buyOrder.price
  );
  
  // Now update the buyer's order to show it's been filled
  // Instead of importing directly, update the order in localStorage
  // to avoid circular dependencies
  try {
    const storedOrders = localStorage.getItem('openOrders');
    if (storedOrders) {
      const orders = JSON.parse(storedOrders);
      const position = orders.find((p: any) => p.id === buyerPositionId);
      
      if (position && position.legs && position.legs[buyerLegIndex]) {
        const leg = position.legs[buyerLegIndex];
        const totalPosition = Math.abs(leg.position);
        
        // Initialize filled and pending quantities if they don't exist
        if (leg.filledQuantity === undefined) leg.filledQuantity = 0;
        if (leg.pendingQuantity === undefined) leg.pendingQuantity = totalPosition;
        
        // Update the quantities
        leg.filledQuantity += fillQuantity;
        leg.pendingQuantity = Math.max(0, leg.pendingQuantity - fillQuantity);
        
        // Update status if fully filled
        if (leg.pendingQuantity === 0) {
          leg.status = 'filled';
        }
        
        // Save back to localStorage
        localStorage.setItem('openOrders', JSON.stringify(orders));
        
        // Dispatch event to notify components
        window.dispatchEvent(new CustomEvent('openOrdersUpdated'));
      }
    }
  } catch (error) {
    console.error('Error updating buyer position:', error);
  }
} 