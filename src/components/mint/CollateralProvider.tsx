import { useState, useEffect } from 'react';
import React from 'react';
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/misc/utils";
import { 
  COLLATERAL_TYPES, 
  BASE_ANNUAL_INTEREST_RATE,
  TRANSACTION_COST_SOL,
  MAX_LEVERAGE
} from "@/constants/mint/constants";
import { 
  calculateCollateralNeeded, 
  calculateRequiredCollateral, 
  hasEnoughCollateral, 
  calculateOptimalLeverage,
  calculateTotalPremium,
  calculateHourlyInterestRate,
  calculateBorrowCost,
  calculateOptionCreationFee,
  calculateBorrowFee,
  calculateMaxProfitPotential
} from "@/constants/mint/calculations";

export interface OptionPosition {
  quantity: number;
  strikePrice: string | number;
  premium: string | number;
  optionType: string;
  asset: string;
  expiryTimestamp?: number;
}

export interface CollateralState {
  hasEnoughCollateral: boolean;
  collateralProvided: string;
  leverage: number;
  collateralType: string;
  borrowCost: number;
  optionCreationFee: number;
  borrowFee: number;
  transactionCost: number;
  maxProfitPotential: number;
}

interface CollateralProviderProps {
  options: OptionPosition[];
  onStateChange?: (state: CollateralState) => void;
}

export function CollateralProvider({ options, onStateChange }: CollateralProviderProps) {
  const baseCollateralNeeded = calculateCollateralNeeded(options);
  const totalPremium = calculateTotalPremium(options);
  const [collateralProvided, setCollateralProvided] = useState<string>("");
  const [leverage, setLeverage] = useState<number[]>([1]);
  const [collateralType, setCollateralType] = useState<typeof COLLATERAL_TYPES[number]['value']>(
    COLLATERAL_TYPES.find(type => type.default)?.value || "USDC"
  );
  const maxLeverage = MAX_LEVERAGE;
  
  // Convert annual to hourly interest rate
  const hourlyInterestRate = calculateHourlyInterestRate(BASE_ANNUAL_INTEREST_RATE);
  
  // Calculate position size (total available capital with leverage)
  const positionSize = Number(collateralProvided || 0) * leverage[0];
  
  // Calculate amount borrowed (collateral * (leverage - 1))
  const amountBorrowed = Number(collateralProvided || 0) * (leverage[0] - 1);
  
  // Calculate time until expiration (in hours)
  const getTimeUntilExpiration = () => {
    // Find the latest expiry from all options
    const now = Math.floor(Date.now() / 1000); // Convert to seconds
    let latestExpiry = 0;
    
    options.forEach(option => {
      if (option.expiryTimestamp && option.expiryTimestamp > latestExpiry) {
        latestExpiry = option.expiryTimestamp;
      }
    });
    
    // If no expiry found, use 7 days as default
    if (latestExpiry === 0) {
      latestExpiry = now + (7 * 24 * 60 * 60); // 7 days in seconds
    }
    
    // Calculate hours until expiry
    return Math.max(0, Math.ceil((latestExpiry - now) / 3600));
  };
  
  const hoursUntilExpiry = getTimeUntilExpiration();
  
  // Calculate all fees
  const borrowCost = calculateBorrowCost(amountBorrowed, hourlyInterestRate, hoursUntilExpiry);
  const optionCreationFee = calculateOptionCreationFee();
  const borrowFee = calculateBorrowFee(amountBorrowed);
  const transactionCost = TRANSACTION_COST_SOL;
  
  // Calculate maximum profit potential
  const maxProfitPotential = calculateMaxProfitPotential(
    totalPremium,
    borrowCost,
    optionCreationFee,
    transactionCost
  );
  
  // Calculate required collateral based on position size
  const collateralNeeded = calculateRequiredCollateral(baseCollateralNeeded, positionSize);
  
  // Check if enough collateral is provided
  const isEnoughCollateral = hasEnoughCollateral(
    baseCollateralNeeded,
    Number(collateralProvided || 0),
    leverage[0]
  );

  // Memoize the state object to prevent unnecessary updates
  const currentState = React.useMemo(() => ({
    hasEnoughCollateral: isEnoughCollateral,
    collateralProvided,
    leverage: leverage[0],
    collateralType,
    borrowCost,
    optionCreationFee,
    borrowFee,
    transactionCost,
    maxProfitPotential
  }), [
    isEnoughCollateral, 
    collateralProvided, 
    leverage, 
    collateralType, 
    borrowCost, 
    optionCreationFee, 
    borrowFee, 
    transactionCost, 
    maxProfitPotential
  ]);

  // Store previous state to compare
  const prevStateRef = React.useRef(currentState);

  // Notify parent component of state changes only when values actually change
  useEffect(() => {
    if (
      prevStateRef.current.hasEnoughCollateral !== currentState.hasEnoughCollateral ||
      prevStateRef.current.collateralProvided !== currentState.collateralProvided ||
      prevStateRef.current.leverage !== currentState.leverage ||
      prevStateRef.current.collateralType !== currentState.collateralType ||
      prevStateRef.current.borrowCost !== currentState.borrowCost ||
      prevStateRef.current.optionCreationFee !== currentState.optionCreationFee ||
      prevStateRef.current.borrowFee !== currentState.borrowFee ||
      prevStateRef.current.transactionCost !== currentState.transactionCost ||
      prevStateRef.current.maxProfitPotential !== currentState.maxProfitPotential
    ) {
      prevStateRef.current = currentState;
      onStateChange?.(currentState);
    }
  }, [currentState, onStateChange]);

  return (
    <Card className="h-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
      transition-all duration-300 hover:bg-transparent overflow-hidden shadow-lg">
      <CardHeader className="px-4 py-3 pb-0">
        <CardTitle className="text-xl font-bold">Open Position</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-3 space-y-4">
        {/* Position Size Panel - Moved to top */}
        <div className="flex flex-col p-2 rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
          <span className="text-xs text-muted-foreground">Position Size</span>
          <span className="font-bold text-lg text-[#4a85ff]">
            ${positionSize.toFixed(2)}
          </span>
        </div>
        
        {/* Collateral Needed */}
        <div className="flex flex-col p-2 rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
          <span className="text-xs text-muted-foreground">Collateral Needed to Open Position:</span>
          <span className="font-semibold text-lg">${collateralNeeded.toFixed(2)}</span>
        </div>
        
        {/* Collateral Amount */}
        <div>
          <span className="text-sm font-medium mb-2 block">Provide Collateral Amount</span>
          <div className="flex items-center gap-2">
            <Select
              value={collateralType}
              onValueChange={(value: typeof COLLATERAL_TYPES[number]['value']) => setCollateralType(value)}
            >
              <SelectTrigger className="h-10 w-24 bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939] focus:ring-1 focus:ring-[#4a85ff]/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLLATERAL_TYPES.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    className="text-sm"
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={collateralProvided}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
                  setCollateralProvided(value);
                }
              }}
              min="1"
              step="0.01"
              className="h-10 flex-1 px-3 bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939] 
                focus:border-[#4a85ff]/40 focus:ring-1 focus:ring-[#4a85ff]/40
                text-right text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0.00"
            />
          </div>
        </div>
        
        {/* Leverage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Leverage</span>
            <div className="flex space-x-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const optimalLeverage = calculateOptimalLeverage(
                    baseCollateralNeeded,
                    Number(collateralProvided || 0)
                  );
                  setLeverage([optimalLeverage]);
                }}
                className="h-6 px-2 py-0 text-xs bg-[#4a85ff]/10 border border-[#4a85ff]/40
                  hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60
                  transition-all duration-200"
              >
                Auto-Size
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newLeverage = Math.max(1, leverage[0] - 0.01);
                  setLeverage([newLeverage]);
                }}
                className="h-6 w-6 p-0 text-xs bg-[#4a85ff]/10 border border-[#4a85ff]/40
                  hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60
                  transition-all duration-200 flex items-center justify-center"
              >
                -
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newLeverage = Math.min(maxLeverage, leverage[0] + 0.01);
                  setLeverage([newLeverage]);
                }}
                className="h-6 w-6 p-0 text-xs bg-[#4a85ff]/10 border border-[#4a85ff]/40
                  hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60
                  transition-all duration-200 flex items-center justify-center"
              >
                +
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Slider
              min={1}
              max={maxLeverage}
              step={0.01}
              value={leverage}
              onValueChange={setLeverage}
              className="flex-1"
            />
            <span className="font-medium w-12 text-right">{leverage[0].toFixed(2)}x</span>
          </div>
        </div>

        {/* Costs and Fees (Combined) */}
        {Number(collateralProvided) > 0 && (
          <div className="flex flex-col rounded-lg bg-white/5 dark:bg-black/20 border border-[#e5e5e5]/20 dark:border-[#393939]/50">
            <div className="flex items-center justify-between p-2 border-b border-[#e5e5e5]/20 dark:border-[#393939]/50">
              <span className="text-sm font-medium">Borrow Rate</span>
              <span className="text-xs text-muted-foreground">
                {(hourlyInterestRate * 10000).toFixed(4)}% per hour
              </span>
            </div>
            <div className="p-2 space-y-2">
              <div className="grid grid-cols-2 gap-y-1 text-sm">
                <span>Amount Borrowed:</span>
                <span className="text-right font-normal">${amountBorrowed.toFixed(2)}</span>

                {leverage[0] > 1 && (
                  <>
                    <span>Est. Borrow Cost:</span>
                    <span className="text-right font-normal">${borrowCost.toFixed(2)}</span>
                  </>
                )}
                <span>Borrow Fee:</span>
                <span className="text-right font-normal">${borrowFee.toFixed(2)}</span>

                <div className="col-span-2 border-t border-[#e5e5e5]/20 dark:border-[#393939]/50 mt-1 pt-1"></div>

                <span>Creation Fee:</span>
                <span className="text-right font-normal">{optionCreationFee} SOL</span>

                <span>Transaction Cost:</span>
                <span className="text-right font-normal">{transactionCost} SOL</span>

                <div className="col-span-2 border-t border-[#e5e5e5]/20 dark:border-[#393939]/50 mt-1 pt-1"></div>

                <span>Total Cost:</span>
                <span className="text-right font-normal text-red-500">
                  ${(borrowCost + optionCreationFee + borrowFee).toFixed(2)}
                </span>

                <span>New Max Profit:</span>
                <span className={`text-right font-bold ${maxProfitPotential >= 0 ? 'text-green-500' : 'text-red-500'}`}>${maxProfitPotential.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 