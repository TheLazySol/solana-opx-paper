"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMouseGlow } from '@/hooks/useMouseGlow';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardBody, 
  Input, 
  Select, 
  SelectItem, 
  Chip, 
  Button,
  Tooltip,
  Switch,
  cn 
} from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { CollateralState } from '../collateral-provider';
import { CostBreakdown } from '../cost-breakdown';
import { OptionContractSummary } from '../option-contract-summary';
import { AdvancedOptionDetails } from '../advanced-option-details';
import {
  calculateCollateralNeeded,
  calculateRequiredCollateral,
  hasEnoughCollateral,
  calculateTotalPremium,
  calculateBorrowCost,
  calculateOptionCreationFee,
  calculateBorrowFee,
  calculateMaxProfitPotential,
  calculateMinCollateralRequired
} from '@/constants/option-lab/calculations';
import { formatNumberWithCommas } from '@/utils/utils';
import {
  COLLATERAL_TYPES,
  BASE_ANNUAL_INTEREST_RATE,
  BORROW_FEE_RATE,
  OPTION_CREATION_FEE_RATE,
  TRANSACTION_COST_SOL,
  MAX_LEVERAGE,
  ASSET_PRICE_REFRESH_INTERVAL
} from '@/constants/constants';
import { getTokenPrice } from '@/lib/api/getTokenPrice';
import { 
  Shield, 
  Zap, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Info,
  Coins,
  Lock,
  Receipt,
  Check
} from 'lucide-react';

interface StepCollateralProps {
  proMode: boolean;
  onStateChangeAction: (state: CollateralState) => void;
  initialCollateralState?: CollateralState;
}

// Helper function to format leverage value to 3 decimal places, removing trailing zeros
const formatLeverageValue = (value: number): string => {
  return value.toFixed(3).replace(/\.?0+$/, '');
};

export function StepCollateral({ proMode, onStateChangeAction, initialCollateralState }: StepCollateralProps) {
  const methods = useFormContext();
  const formValues = methods.watch();
  
  // Watch specific fields for reactivity
  const asset = methods.watch('asset');
  const strikePrice = methods.watch('strikePrice');
  const premium = methods.watch('premium');
  const quantity = methods.watch('quantity');
  const optionType = methods.watch('optionType');
  const expirationDate = methods.watch('expirationDate');
  
  // Mouse glow effect hooks for each card
  const collateralCardRef = useMouseGlow();
  const leverageCardRef = useMouseGlow();
  const statusCardRef = useMouseGlow();
  const costCardRef = useMouseGlow();
  const advancedCardRef = useMouseGlow();
  
  const [collateralProvided, setCollateralProvided] = useState<string>(
    initialCollateralState?.collateralProvided || "0"
  );
  const [leverage, setLeverage] = useState<number>(
    initialCollateralState?.leverage || 1
  );
  const [leverageInputValue, setLeverageInputValue] = useState<string>(
    initialCollateralState?.leverage ? formatLeverageValue(initialCollateralState.leverage) : "1"
  );
  const [collateralType, setCollateralType] = useState<string>(
    initialCollateralState?.collateralType || COLLATERAL_TYPES[0].value
  );
  const [showMaxLeverageAlert, setShowMaxLeverageAlert] = useState<boolean>(false);
  const maxLeverageAlertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoMode, setAutoMode] = useState<boolean>(false);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [collateralPrice, setCollateralPrice] = useState<number>(1); // Price of selected collateral in USD
  
  // Calculate derived values
  const options = strikePrice && premium ? [{
    quantity: quantity || 1,
    strikePrice: strikePrice,
    premium: premium,
    optionType: optionType,
    asset: asset,
    expirationDate: expirationDate
  }] : [];

  const totalPremium = calculateTotalPremium(options);
  const collateralNeeded = calculateCollateralNeeded(options);
  const requiredCollateral = calculateRequiredCollateral(collateralNeeded, totalPremium);
  const minCollateralRequired = calculateMinCollateralRequired(collateralNeeded);
  
  // Convert collateral to USD for calculations
  const collateralProvidedUSD = Number(collateralProvided || 0) * collateralPrice;
  
  // Calculate the actual collateral requirement based on strike price and contract quantity
  const actualCollateralRequired = strikePrice && quantity 
    ? (strikePrice * (quantity * 100))
    : 0;
  
  // Convert annual to hourly interest rate
  const hourlyInterestRate = BASE_ANNUAL_INTEREST_RATE / (365 * 24);
  
  // Calculate amount borrowed (collateral * (leverage - 1)) in USD
  const amountBorrowed = collateralProvidedUSD * (Number(leverage) - 1);
  
  // Calculate time until expiration (in hours)
  const getTimeUntilExpiration = () => {
    if (!expirationDate) {
      return 7 * 24; // Default to 7 days if no expiration date
    }
    
    const now = new Date();
    const expiry = new Date(expirationDate);
    const hoursUntilExpiry = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)));
    return hoursUntilExpiry;
  };
  
  const hoursUntilExpiry = getTimeUntilExpiration();
  const daysUntilExpiry = hoursUntilExpiry / 24;
  
  // Calculate all fees correctly - now in USD
  const dailyBorrowRate = BORROW_FEE_RATE; // This is already daily rate (0.035%)
  const borrowCost = amountBorrowed * dailyBorrowRate * daysUntilExpiry;
  const optionCreationFee = OPTION_CREATION_FEE_RATE * solPrice; // Convert SOL to USD
  const borrowFee = calculateBorrowFee(amountBorrowed);
  const transactionCost = TRANSACTION_COST_SOL * solPrice; // Convert SOL to USD
  
  const maxProfitPotential = calculateMaxProfitPotential(totalPremium, borrowCost, optionCreationFee, borrowFee, transactionCost);
  const hasEnough = hasEnoughCollateral(requiredCollateral, collateralProvidedUSD, Number(leverage));

  // Use ref to store the callback to avoid dependency issues
  const onStateChangeRef = useRef(onStateChangeAction);
  onStateChangeRef.current = onStateChangeAction;

  // Use ref to track previous state and prevent unnecessary updates
  const previousStateRef = useRef<CollateralState | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced update function to prevent rapid-fire updates
  const debouncedUpdateParentState = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      const state: CollateralState = {
        hasEnoughCollateral: hasEnough,
        collateralProvided,
        leverage: Number(leverage),
        collateralType,
        borrowCost,
        optionCreationFee,
        borrowFee,
        transactionCost,
        maxProfitPotential
      };

      // Only update if state has actually changed
      const previousState = previousStateRef.current;
      if (!previousState || 
          previousState.hasEnoughCollateral !== state.hasEnoughCollateral ||
          previousState.collateralProvided !== state.collateralProvided ||
          previousState.leverage !== state.leverage ||
          previousState.collateralType !== state.collateralType ||
          Math.abs(previousState.borrowCost - state.borrowCost) > 0.01 ||
          Math.abs(previousState.optionCreationFee - state.optionCreationFee) > 0.01 ||
          Math.abs(previousState.borrowFee - state.borrowFee) > 0.01 ||
          Math.abs(previousState.transactionCost - state.transactionCost) > 0.01 ||
          Math.abs(previousState.maxProfitPotential - state.maxProfitPotential) > 0.01) {
        
        previousStateRef.current = state;
        onStateChangeRef.current(state);
      }
    }, 10); // Very short debounce, just enough to batch updates
  }, [
    hasEnough,
    collateralProvided,
    leverage,
    collateralType,
    borrowCost,
    optionCreationFee,
    borrowFee,
    transactionCost,
    maxProfitPotential
  ]);

  // Update parent state with debouncing
  useEffect(() => {
    debouncedUpdateParentState();
    
    // Cleanup timeout on unmount
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (maxLeverageAlertTimeoutRef.current) {
        clearTimeout(maxLeverageAlertTimeoutRef.current);
      }
    };
  }, [debouncedUpdateParentState]);

  // Reset collateral input when collateral type changes
  const collateralTypeRef = useRef(collateralType);
  useEffect(() => {
    if (collateralTypeRef.current !== collateralType) {
      collateralTypeRef.current = collateralType;
      
      // Use setTimeout to prevent cascading updates
      setTimeout(() => {
        setCollateralProvided("0");
        setLeverage(1);
        setLeverageInputValue(formatLeverageValue(1));
        setAutoMode(false); // Also reset auto mode when changing types
      }, 0);
    }
  }, [collateralType]);

  // Restore state when initialCollateralState changes (user navigating back)
  useEffect(() => {
    if (initialCollateralState) {
      setCollateralProvided(initialCollateralState.collateralProvided);
      setLeverage(initialCollateralState.leverage);
      setLeverageInputValue(formatLeverageValue(initialCollateralState.leverage));
      setCollateralType(initialCollateralState.collateralType);
      // Only reset auto mode on initial load, not on every state change
      // setAutoMode(false); // Commented out to preserve auto mode state
    }
  }, [initialCollateralState]);

  // Fetch SOL price and collateral price
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Always fetch SOL price for fee calculations
        const solPriceData = await getTokenPrice('SOL');
        const finalSolPrice = solPriceData.price > 0 ? solPriceData.price : 100;
        setSolPrice(finalSolPrice);
        
        // Fetch collateral price if it's not USDC
        if (collateralType === 'SOL') {
          setCollateralPrice(finalSolPrice);
        } else {
          setCollateralPrice(1); // USDC is always 1:1 with USD
        }
        
        if (solPriceData.price === 0) {
          console.warn('SOL price API returned 0, using fallback price of $100 for calculations');
        }
      } catch (error) {
        console.error('Error fetching prices:', error);
        setSolPrice(100);
        setCollateralPrice(collateralType === 'SOL' ? 100 : 1);
      }
    };
    
    fetchPrices();
    const interval = setInterval(fetchPrices, ASSET_PRICE_REFRESH_INTERVAL * 20);
    
    return () => clearInterval(interval);
  }, [collateralType]);

  const handleCollateralChange = (value: string) => {
    // Only allow numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCollateralProvided(value);
      
      // Auto-adjust leverage when in auto mode
      if (autoMode && value !== '' && !isNaN(Number(value)) && actualCollateralRequired > 0) {
        const collateralUSD = Number(value) * collateralPrice;
        if (collateralUSD > 0) {
          // Calculate optimal leverage up to 10x to reach 100% coverage
          const optimalLeverage = Math.min(MAX_LEVERAGE, actualCollateralRequired / collateralUSD);
          const clampedLeverage = Math.max(1, optimalLeverage);
          setLeverage(clampedLeverage);
          setLeverageInputValue(formatLeverageValue(clampedLeverage));
        }
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  // Calculate total coverage including leverage (collateral + borrowed amount) in USD
  const totalCoverage = collateralProvidedUSD * Number(leverage);
  const collateralPercentage = actualCollateralRequired > 0 
    ? (totalCoverage / actualCollateralRequired) * 100
    : 0;

  // Calculate maximum leverage that would result in exactly 100% coverage using actualCollateralRequired
  const maxLeverageFor100Percent = collateralProvidedUSD > 0 && actualCollateralRequired > 0
    ? Math.max(1, actualCollateralRequired / collateralProvidedUSD)
    : MAX_LEVERAGE;

  // Dynamic max leverage (capped at MAX_LEVERAGE, but limited by 100% coverage and never below 1)
  const dynamicMaxLeverage = Math.min(MAX_LEVERAGE, Math.max(1, maxLeverageFor100Percent));

  const leverageRef = useRef(leverage);
  leverageRef.current = leverage;

  // Auto-adjust leverage when collateral changes (but not when leverage itself changes)
  useEffect(() => {
    // Don't auto-adjust if auto mode is active - let auto mode handle it
    if (autoMode) return;
    
    // Calculate required collateral locally to avoid dependency issues
    const currentRequiredCollateral = calculateRequiredCollateral(collateralNeeded, totalPremium);
    
    if (collateralProvidedUSD > 0 && currentRequiredCollateral > 0) {
      // If collateral alone covers 100% or more, reset leverage to 1x
      const collateralOnlyCoverage = collateralProvidedUSD / currentRequiredCollateral;
      if (collateralOnlyCoverage >= 1 && Number(leverageRef.current) > 1) {
        setLeverage(1);
        setLeverageInputValue(formatLeverageValue(1));
      }
    }
  }, [collateralProvided, collateralNeeded, totalPremium, collateralProvidedUSD, collateralPrice, autoMode]);


  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Option Summary Card - Always visible */}
      {strikePrice && premium && (
        <motion.div variants={itemVariants}>
          <OptionContractSummary />
        </motion.div>
      )}

      {/* Main Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collateral Input Section */}
        <motion.div variants={itemVariants}>
          <Card 
            ref={collateralCardRef}
            className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
            style={{
              background: `
                radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                  rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                  rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                  rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                  transparent 75%
                ),
                linear-gradient(to bottom right, 
                  rgb(15 23 42 / 0.4), 
                  rgb(30 41 59 / 0.3), 
                  rgb(51 65 85 / 0.2)
                )
              `,
              transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
            }}
          >
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                  <Coins className="w-3 h-3 text-[#4a85ff]" />
                </div>
                <h3 className="text-sm font-medium text-white">Collateral Amount</h3>
              </div>
              <div className="space-y-3">
                {/* Collateral Type Selector */}
                <Select
                  label="Collateral Type"
                  selectedKeys={[collateralType]}
                  onSelectionChange={(keys) => setCollateralType(Array.from(keys)[0] as string)}
                  className="w-full"
                  classNames={{
                    trigger: "bg-white/5 border-white/20 hover:border-white/30 data-[hover=true]:bg-white/10",
                    value: "text-white",
                    label: "text-white/60"
                  }}
                >
                  {COLLATERAL_TYPES.map(type => (
                    <SelectItem key={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </Select>
                
                {/* Collateral Amount Input */}
                <Input
                  type="text"
                  label="Collateral Amount"
                  placeholder="0.00"
                  value={collateralProvided}
                  onValueChange={handleCollateralChange}
                  startContent={
                    collateralType === 'USDC' ? (
                      <div className="pointer-events-none flex items-center">
                        <span className="text-white/60">$</span>
                      </div>
                    ) : null
                  }
                  endContent={
                    <Chip size="sm" variant="flat" className="bg-white/10">
                      {collateralType}
                    </Chip>
                  }
                  classNames={{
                    base: "max-w-full",
                    input: "text-white",
                    inputWrapper: "bg-white/5 border-white/20 hover:border-white/30 data-[hover=true]:bg-white/10 data-[focus=true]:!bg-white/10 data-[focus-visible=true]:!bg-white/10 focus:!bg-white/10"
                  }}
                />
                
                {/* Auto Select Buttons */}
                <div className="flex gap-2 items-center">
                  {/* Auto Mode Toggle */}
                  <Button
                    size="sm"
                    variant={autoMode ? "solid" : "flat"}
                    onPress={() => {
                      const newAutoMode = !autoMode;
                      setAutoMode(newAutoMode);
                      
                      // If turning auto mode ON and there's collateral provided, auto-adjust leverage
                      if (newAutoMode && collateralProvided !== '' && Number(collateralProvided) > 0 && actualCollateralRequired > 0) {
                        const collateralUSD = Number(collateralProvided) * collateralPrice;
                        if (collateralUSD > 0) {
                          // Calculate optimal leverage up to 10x to reach 100% coverage
                          const optimalLeverage = Math.min(MAX_LEVERAGE, actualCollateralRequired / collateralUSD);
                          const clampedLeverage = Math.max(1, optimalLeverage);
                          setLeverage(clampedLeverage);
                          setLeverageInputValue(formatLeverageValue(clampedLeverage));
                        }
                      }
                    }}
                    className={cn(
                      "text-xs transition-all",
                      autoMode 
                        ? "bg-[#4a85ff] text-white shadow-[0_0_12px_rgba(74,133,255,0.6)]" 
                        : "bg-white/5 hover:bg-white/10"
                    )}
                  >
                    Auto
                  </Button>
                  
                  {/* Minimum at 10x leverage */}
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={autoMode}
                    onPress={() => {
                      // Calculate exact collateral needed for 100% coverage at 10x leverage + $0.01 buffer
                      const targetLeverage = MAX_LEVERAGE;
                      const minCollateralUSD = (actualCollateralRequired / targetLeverage) + 0.01; // Add $0.01 buffer
                      const minCollateral = (minCollateralUSD / collateralPrice).toFixed(collateralType === 'SOL' ? 4 : 2);
                      
                      setCollateralProvided(minCollateral);
                      setLeverage(targetLeverage);
                      setLeverageInputValue(formatLeverageValue(targetLeverage));
                    }}
                    className={cn(
                      "text-xs",
                      autoMode 
                        ? "bg-white/5 text-white/40 cursor-not-allowed" 
                        : "bg-white/5 hover:bg-white/10"
                    )}
                  >
                    10%
                  </Button>
                  
                  {/* Half at 5x leverage */}
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={autoMode}
                    onPress={() => {
                      // Calculate exact collateral needed for 100% coverage at 5x leverage + $0.01 buffer
                      const targetLeverage = 5;
                      const halfCollateralUSD = (actualCollateralRequired / targetLeverage) + 0.01; // Add $0.01 buffer
                      const halfCollateral = (halfCollateralUSD / collateralPrice).toFixed(collateralType === 'SOL' ? 4 : 2);
                      
                      setCollateralProvided(halfCollateral);
                      setLeverage(targetLeverage);
                      setLeverageInputValue(formatLeverageValue(targetLeverage));
                    }}
                    className={cn(
                      "text-xs",
                      autoMode 
                        ? "bg-white/5 text-white/40 cursor-not-allowed" 
                        : "bg-white/5 hover:bg-white/10"
                    )}
                  >
                    50%
                  </Button>
                  
                  {/* Full at 1x leverage */}
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={autoMode}
                    onPress={() => {
                      // Calculate exact collateral needed for 100% coverage at 1x leverage + $0.01 buffer
                      const targetLeverage = 1;
                      const fullCollateralUSD = actualCollateralRequired + 0.01; // Add $0.01 buffer
                      const fullCollateral = (fullCollateralUSD / collateralPrice).toFixed(collateralType === 'SOL' ? 4 : 2);
                      
                      setCollateralProvided(fullCollateral);
                      setLeverage(targetLeverage);
                      setLeverageInputValue(formatLeverageValue(targetLeverage));
                    }}
                    className={cn(
                      "text-xs",
                      autoMode 
                        ? "bg-white/5 text-white/40 cursor-not-allowed" 
                        : "bg-white/5 hover:bg-white/10"
                    )}
                  >
                    100%
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Leverage Section */}
        <motion.div variants={itemVariants}>
          <Card 
            ref={leverageCardRef}
            className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
            style={{
              background: `
                radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                  rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                  rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                  rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                  transparent 75%
                ),
                linear-gradient(to bottom right, 
                  rgb(15 23 42 / 0.4), 
                  rgb(30 41 59 / 0.3), 
                  rgb(51 65 85 / 0.2)
                )
              `,
              transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
            }}
          >
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-[#4a85ff]" />
                </div>
                <h3 className="text-sm font-medium text-white">Leverage</h3>
              </div>
              
                {/* Leverage Usage Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>1x</span>
                    <span>{MAX_LEVERAGE}x Max</span>
                  </div>
                  <Tooltip 
                    content={
                      <div className="text-xs font-light space-y-1">
                        <div>Current Leverage: <span className="text-[#4a85ff]">{Number(leverage).toFixed(2)}x</span></div>
                        <div>Usage: <span className="text-[#4a85ff]">{((Number(leverage) / MAX_LEVERAGE) * 100).toFixed(1)}%</span></div>
                        <div className="text-white/60">Adjust using input field or auto buttons</div>
                      </div>
                    }
                    placement="top"
                  >
                    <div className="relative h-3 w-full bg-white/10 rounded-full" style={{ padding: '2px' }}>
                      <div 
                        className="absolute left-0 h-full transition-all duration-300 rounded-full"
                        style={{ 
                          width: `${((Number(leverage) - 1) / (MAX_LEVERAGE - 1)) * 100}%`,
                          background: '#4a85ff',
                          boxShadow: `0 0 ${Math.min(20, 6 + (Number(leverage) / MAX_LEVERAGE) * 14)}px rgba(74, 133, 255, ${Math.min(0.9, 0.4 + (Number(leverage) / MAX_LEVERAGE) * 0.5)})`,
                          top: '2px',
                          height: 'calc(100% - 4px)'
                        }}
                      />
                      {/* Marker for current dynamic max if different from MAX_LEVERAGE */}
                      {dynamicMaxLeverage < MAX_LEVERAGE && (
                        <div 
                          className="absolute w-0.5 bg-white/60"
                          style={{ 
                            left: `${((dynamicMaxLeverage - 1) / (MAX_LEVERAGE - 1)) * 100}%`,
                            top: '2px',
                            height: 'calc(100% - 4px)'
                          }}
                        />
                      )}
                    </div>
                  </Tooltip>
                </div>
              
              {/* Leverage Details */}
              <div className="mt-3 p-3 bg-black/20 rounded-lg border border-white/5">
                <div className="space-y-3">
                  {/* First Row - Main Details */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-white/40 mb-0.5">Amount Borrowed</p>
                      <p className="text-xs font-medium text-white">
                        {asset && solPrice > 0 ? (
                          `${(amountBorrowed / solPrice).toFixed(4)} ${asset || 'SOL'}`
                        ) : (
                          '0.0000 SOL'
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-0.5">OMLP Route</p>
                      <p className="text-xs font-medium text-white">SAP-1 ({asset || 'SOL'})</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-0.5">Leverage</p>
                      <input
                        aria-label="Leverage value"
                        className="w-full px-2 py-1 text-xs font-medium text-white bg-white/5 outline-none transition-colors rounded hover:bg-white/10 focus:bg-white/10"
                        type="text"
                        value={leverageInputValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const v = e.target.value;
                          // Allow empty string, numbers up to 2 digits before decimal, and up to 3 decimal places
                          if (v === '' || /^\d{1,2}(\.\d{0,3})?$/.test(v)) {
                            setLeverageInputValue(v);
                            // Auto-sync leverage value while typing (if valid number)
                            if (v !== '' && !isNaN(Number(v))) {
                              const inputValue = Number(v);
                              const clampedValue = Math.min(dynamicMaxLeverage, Math.max(1, inputValue));
                              setLeverage(clampedValue);
                              
                              // Clear existing timeout
                              if (maxLeverageAlertTimeoutRef.current) {
                                clearTimeout(maxLeverageAlertTimeoutRef.current);
                              }
                              
                              // Show max leverage alert with 50ms delay if we hit the limit
                              if (clampedValue >= dynamicMaxLeverage && dynamicMaxLeverage < MAX_LEVERAGE) {
                                maxLeverageAlertTimeoutRef.current = setTimeout(() => {
                                  setShowMaxLeverageAlert(true);
                                  setTimeout(() => setShowMaxLeverageAlert(false), 5000);
                                }, 50);
                              }
                            }
                          }
                        }}
                        onBlur={() => {
                          // Clear existing timeout
                          if (maxLeverageAlertTimeoutRef.current) {
                            clearTimeout(maxLeverageAlertTimeoutRef.current);
                          }
                          
                          // Format the input value when user finishes editing
                          if (leverageInputValue !== '' && !isNaN(Number(leverageInputValue))) {
                            const inputValue = Number(leverageInputValue);
                            const clampedValue = Math.min(dynamicMaxLeverage, Math.max(1, inputValue));
                            setLeverage(clampedValue);
                            setLeverageInputValue(formatLeverageValue(clampedValue));
                          } else if (leverageInputValue === '') {
                            // Reset to 1 if empty
                            setLeverage(1);
                            setLeverageInputValue(formatLeverageValue(1));
                          }
                        }}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter" && leverageInputValue !== '' && !isNaN(Number(leverageInputValue))) {
                            // Clear existing timeout
                            if (maxLeverageAlertTimeoutRef.current) {
                              clearTimeout(maxLeverageAlertTimeoutRef.current);
                            }
                            
                            const inputValue = Number(leverageInputValue);
                            const clampedValue = Math.min(dynamicMaxLeverage, Math.max(1, inputValue));
                            setLeverage(clampedValue);
                            setLeverageInputValue(formatLeverageValue(clampedValue));
                            
                            // Blur the input to trigger formatting
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        placeholder="1.0"
                      />
                    </div>
                  </div>
                  
                  {/* Second Row - Costs and Risk */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-white/40 mb-0.5">Est. Daily Interest</p>
                      <p className="text-xs font-medium text-white">${borrowCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-0.5">Borrow Fee</p>
                      <p className="text-xs font-medium text-white">${borrowFee.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-0.5">Liquidation Risk</p>
                      <Chip
                        size="sm"
                        variant="flat"
                        className={cn(
                          "text-xs",
                          Number(leverage) === 1 ? "bg-green-500/20 text-green-400" :
                          Number(leverage) <= 3 ? "bg-blue-500/20 text-blue-400" :
                          Number(leverage) <= 5 ? "bg-yellow-500/20 text-yellow-400" :
                          Number(leverage) <= 7 ? "bg-orange-500/20 text-orange-400" :
                          "bg-red-500/20 text-red-400"
                        )}
                      >
                        {Number(leverage) === 1 ? 'Minimal' :
                         Number(leverage) <= 3 ? 'Low' :
                         Number(leverage) <= 5 ? 'Medium' :
                         Number(leverage) <= 7 ? 'High' :
                         'Very High'}
                      </Chip>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* Collateral Status */}
      <motion.div variants={itemVariants}>
        <Card 
          ref={statusCardRef}
          className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
          style={{
            background: `
              radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0))), 
                transparent 40%
              ),
              linear-gradient(to bottom right, 
                rgb(15 23 42 / 0.4), 
                rgb(30 41 59 / 0.3), 
                rgb(51 65 85 / 0.2)
              )
            `
          }}
        >
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                <Shield className="w-3 h-3 text-[#4a85ff]" />
              </div>
              <h4 className="text-sm font-medium text-white">Collateral Status</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Provided</p>
                  {Number(collateralProvided) === 0 ? (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  ) : (
                    <Check className="w-3 h-3 text-green-400" />
                  )}
                </div>
                <p className="text-sm font-medium text-white">
                  ${collateralProvidedUSD.toFixed(2)}
                  {collateralType !== 'USDC' && Number(collateralProvided) > 0 && (
                    <span className="text-xs text-white/60 ml-1">
                      ({Number(collateralProvided).toFixed(collateralType === 'SOL' ? 4 : 2)} {collateralType})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Remaining Coverage Needed</p>
                  {Math.max(0, actualCollateralRequired - totalCoverage) > 0 ? (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  ) : (
                    <Check className="w-3 h-3 text-green-400" />
                  )}
                </div>
                <p className="text-sm font-medium text-white">
                  ${Math.max(0, actualCollateralRequired - totalCoverage).toFixed(2)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Coverage</p>
                  {collateralPercentage < 100 ? (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  ) : (
                    <Check className="w-3 h-3 text-green-400" />
                  )}
                </div>
                <p 
                  className={cn(
                    "text-sm font-medium transition-all duration-300",
                    collateralPercentage >= 100 
                      ? "text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" 
                      : ""
                  )}
                  style={{
                    color: collateralPercentage >= 100 
                      ? 'rgb(34 197 94)' 
                      : `rgb(${255 - (collateralPercentage * 1.21)} ${255 - (collateralPercentage * 0.58)} ${255 - (collateralPercentage * 0.61)})`,
                    filter: collateralPercentage >= 100 
                      ? 'drop-shadow(0 0 8px rgba(34,197,94,0.8))' 
                      : `drop-shadow(0 0 ${collateralPercentage * 0.08}px rgba(34,197,94,${collateralPercentage * 0.008}))`
                  }}
                >
                  {collateralPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Advanced Option Details */}
      <motion.div variants={itemVariants}>
        <AdvancedOptionDetails 
          assetPrice={asset ? solPrice : null}
          showTitle={false}
          collateralInfo={useMemo(() => ({
            collateralProvided,
            collateralType,
            collateralPrice,
            borrowCost, // Total borrow cost over the period
            borrowFee
          }), [collateralProvided, collateralType, collateralPrice, borrowCost, borrowFee])}
        />
      </motion.div>

      {/* Max Leverage Alert */}
      <AnimatePresence>
        {Number(leverage) >= dynamicMaxLeverage && dynamicMaxLeverage < MAX_LEVERAGE && showMaxLeverageAlert && (
          <motion.div 
            key="max-leverage-alert"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-amber-300 font-medium mb-1">
                  Maximum Leverage Reached
                </p>
                <p className="text-xs text-amber-300/80">
                  You&apos;ve reached the maximum leverage ({dynamicMaxLeverage.toFixed(2)}x) needed for 100% trade coverage. Add more collateral to increase leverage further.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cost Breakdown - Temporarily hidden as info is now in Leverage Details */}
      {/* <motion.div variants={itemVariants}>
        <CostBreakdown 
          collateralState={{
            hasEnoughCollateral: hasEnough,
            collateralProvided,
            leverage: Number(leverage),
            collateralType,
            borrowCost,
            optionCreationFee,
            borrowFee,
            transactionCost,
            maxProfitPotential
          }}
          showDevModeChip={solPrice === 100}
        />
      </motion.div> */}

      {/* Pro Mode Advanced Details */}
      {proMode && (
        <motion.div 
          variants={itemVariants}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card 
            ref={advancedCardRef}
            className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
            style={{
              background: `
                radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                  rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                  rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                  rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                  transparent 75%
                ),
                linear-gradient(to bottom right, 
                  rgb(15 23 42 / 0.4), 
                  rgb(30 41 59 / 0.3), 
                  rgb(51 65 85 / 0.2)
                )
              `,
              transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
            }}
          >
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                  <Info className="w-3 h-3 text-[#4a85ff]" />
                </div>
                <h4 className="text-sm font-medium text-white">Advanced Collateral Details</h4>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Interest Rate (Annual)</p>
                  <p className="text-sm font-medium text-white">{(BASE_ANNUAL_INTEREST_RATE * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Collateralization Ratio</p>
                  <p className="text-sm font-medium text-white">
                    {requiredCollateral > 0 ? ((collateralProvidedUSD * Number(leverage) / requiredCollateral) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Effective Leverage</p>
                  <p className="text-sm font-medium text-white">
                    {collateralProvidedUSD > 0 ? (requiredCollateral / collateralProvidedUSD).toFixed(2) : '0'}x
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Total Collateral Needed</p>
                  <p className="text-sm font-medium text-white">${requiredCollateral.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Borrowed Amount</p>
                  <p className="text-sm font-medium text-white">
                    ${Math.max(0, requiredCollateral - collateralProvidedUSD * Number(leverage)).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Health Factor</p>
                  <p className={cn(
                    "text-sm font-medium",
                    collateralPercentage >= 100 ? "text-green-400" :
                    collateralPercentage >= 75 ? "text-yellow-400" :
                    "text-red-400"
                  )}>
                    {collateralPercentage >= 100 ? 'Good' :
                     collateralPercentage >= 75 ? 'Warning' :
                     'Critical'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}

    </motion.div>
  );
}