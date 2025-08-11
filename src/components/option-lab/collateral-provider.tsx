import { useState, useEffect } from 'react';
import React from 'react';
import { 
  Input, 
  Slider, 
  Button, 
  Select, 
  SelectItem, 
  Card, 
  CardHeader, 
  CardBody,
  Chip,
  Progress,
  Tooltip,
  Divider,
  cn
} from '@heroui/react';
import { 
  COLLATERAL_TYPES, 
  BASE_ANNUAL_INTEREST_RATE,
  TRANSACTION_COST_SOL,
  MAX_LEVERAGE
} from "@/constants/constants";
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
  calculateMaxProfitPotential,
  calculateMinCollateralRequired
} from "@/constants/option-lab/calculations";
import { 
  Info, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Zap,
  Target,
  Receipt
} from 'lucide-react';
import { motion } from 'framer-motion';

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
  onMint?: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  hasValidationError?: boolean;
  hasPendingOptions?: boolean;
}

export function CollateralProvider({ 
  options, 
  onStateChange, 
  onMint, 
  isSubmitting = false, 
  hasValidationError = false,
  hasPendingOptions = false
}: CollateralProviderProps) {
  const baseCollateralNeeded = calculateCollateralNeeded(options);
  const minCollateralRequired = calculateMinCollateralRequired(baseCollateralNeeded, MAX_LEVERAGE);
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
    const now = new Date()
    const utcNow = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ))
    let latestExpiry = 0;
    
    options.forEach(option => {
      if (option.expiryTimestamp && option.expiryTimestamp > latestExpiry) {
        latestExpiry = option.expiryTimestamp;
      }
    });
    
    // If no expiry found, use 7 days as default
    if (latestExpiry === 0) {
      latestExpiry = Math.floor(utcNow.getTime() / 1000) + (7 * 24 * 60 * 60); // 7 days in seconds
    }
    
    // Calculate hours until expiry
    return Math.max(0, Math.ceil((latestExpiry - Math.floor(utcNow.getTime() / 1000)) / 3600));
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

  // Calculate collateral progress
  const totalFunds = Number(collateralProvided) + amountBorrowed
  const collateralProgress = baseCollateralNeeded > 0 ? (totalFunds / baseCollateralNeeded) * 100 : 0

  // Auto-size leverage function
  const handleAutoLeverage = () => {
    const optimalLeverage = calculateOptimalLeverage(
      baseCollateralNeeded,
      Number(collateralProvided || 0)
    );
    setLeverage([optimalLeverage]);
  };

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
    <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl h-full">
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Open Position
        </h3>
      </CardHeader>
      
      <CardBody className="gap-4">
        {/* Collateral Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/60">Collateral Status</span>
            </div>
            <Chip 
              size="sm" 
              variant="flat"
              className={cn(
                "font-medium",
                isEnoughCollateral 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-amber-500/20 text-amber-400"
              )}
            >
              {isEnoughCollateral ? "Sufficient" : "Insufficient"}
            </Chip>
          </div>
          
          <Progress
            value={Math.min(collateralProgress, 100)}
            className="h-2"
            classNames={{
              indicator: cn(
                "transition-all",
                isEnoughCollateral ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-amber-400 to-amber-600"
              )
            }}
          />
          
          <div className="flex justify-between text-xs">
            <span className="text-white/40">
              ${totalFunds.toFixed(2)} provided
            </span>
            <span className="text-white/40">
              ${baseCollateralNeeded.toFixed(2)} needed
            </span>
          </div>
        </motion.div>

        <Divider className="bg-white/10" />

        {/* Collateral Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white/80">Provide Collateral</label>
            <Tooltip content={`Minimum required with max leverage (${MAX_LEVERAGE}x)`}>
              <Button
                size="sm"
                variant="flat"
                className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 h-7"
                onPress={() => setCollateralProvided(minCollateralRequired.toFixed(2))}
              >
                Min: ${minCollateralRequired.toFixed(2)}
              </Button>
            </Tooltip>
          </div>
          
          <div className="flex gap-2">
            <Select
              selectedKeys={[collateralType]}
              onSelectionChange={(selection) => {
                const selected = Array.from(selection)[0] as typeof COLLATERAL_TYPES[number]['value'];
                setCollateralType(selected);
              }}
              size="sm"
              variant="bordered"
              className="w-28"
              classNames={{
                trigger: "bg-white/5 border-white/20 hover:border-white/30",
                value: "text-white/80"
              }}
            >
              {COLLATERAL_TYPES.map((type) => (
                <SelectItem key={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </Select>
            
            <Input
              type="number"
              value={collateralProvided}
              onChange={(e) => {
                const value = e.target.value
                if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
                  setCollateralProvided(value)
                }
              }}
              min="1"
              step="0.01"
              size="sm"
              variant="bordered"
              placeholder="0.00"
              classNames={{
                input: "text-right font-medium",
                inputWrapper: "bg-white/5 border-white/20 hover:border-white/30 flex-1"
              }}
              startContent={<span className="text-white/40">$</span>}
            />
          </div>
        </div>

        {/* Leverage Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-white/60" />
              <label className="text-sm font-medium text-white/80">Leverage</label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="flat"
                className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 h-7"
                onPress={handleAutoLeverage}
                startContent={<Zap className="w-3 h-3" />}
              >
                Auto
              </Button>
              <Chip 
                size="sm" 
                variant="flat" 
                className="bg-white/10 font-mono"
              >
                {leverage[0].toFixed(2)}x
              </Chip>
            </div>
          </div>
          
          <Slider
            minValue={1}
            maxValue={maxLeverage}
            step={0.01}
            value={leverage}
            onChange={(value) => setLeverage(Array.isArray(value) ? value : [value])}
            className="flex-1"
            classNames={{
              track: "bg-white/10",
              filler: "bg-gradient-to-r from-blue-400 to-purple-400"
            }}
          />
        </div>

        <Divider className="bg-white/10" />

        {/* Position Summary */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="flex flex-col items-center p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
            <DollarSign className="w-4 h-4 text-white/60 mb-1" />
            <span className="text-xs text-white/60">Position Size</span>
            <span className="text-sm font-semibold text-white">
              ${positionSize.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
            <TrendingUp className="w-4 h-4 text-white/60 mb-1" />
            <span className="text-xs text-white/60">Borrowed</span>
            <span className="text-sm font-semibold text-white">
              ${amountBorrowed.toFixed(2)}
            </span>
          </div>
        </motion.div>

        {/* Borrow Summary */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
        >
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white/80">Fee Breakdown</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/60">Borrow Cost</span>
              <span className="text-xs font-medium text-white/80">
                ${borrowCost.toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/60">Option Creation</span>
              <span className="text-xs font-medium text-white/80">
                ${optionCreationFee.toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/60">Transaction Cost</span>
              <span className="text-xs font-medium text-white/80">
                ${transactionCost.toFixed(2)}
              </span>
            </div>
            
            <Divider className="bg-white/10" />
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-white/80">Max Profit Potential</span>
              <span className="text-sm font-semibold text-green-400">
                ${maxProfitPotential.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-white/40 text-right">(after fees)</div>
          </div>
        </motion.div>

        {/* Warning Message */}
        {!isEnoughCollateral && Number(collateralProvided) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-400">
              Insufficient collateral. Increase amount or leverage to proceed.
            </span>
          </motion.div>
        )}

        {/* Mint Button */}
        <Button
          className={cn(
            "w-full h-12 font-semibold text-base transition-all duration-300",
            (!isEnoughCollateral || 
             options.length === 0 || 
             isSubmitting || 
             hasValidationError || 
             !hasPendingOptions)
              ? "bg-white/10 text-white/40 border border-white/20"
              : "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98]"
          )}
          onPress={() => onMint && onMint({} as React.FormEvent)}
          isDisabled={
            !isEnoughCollateral || 
            options.length === 0 || 
            isSubmitting || 
            hasValidationError || 
            !hasPendingOptions
          }
        >
          {isSubmitting ? "Minting..." : "Mint Option"}
        </Button>
      </CardBody>
    </Card>
  );
}