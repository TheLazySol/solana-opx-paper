"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useMouseGlow } from '@/hooks/useMouseGlow';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardBody, 
  Input, 
  Slider, 
  Select, 
  SelectItem, 
  Chip, 
  Progress,
  Button,
  Tooltip,
  Switch,
  cn 
} from '@heroui/react';
import type { SliderValue } from "@heroui/react";
import { useFormContext } from 'react-hook-form';
import { CollateralState } from '../collateral-provider';
import { CostBreakdown } from '../cost-breakdown';
import { OptionContractSummary } from '../option-contract-summary';
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
}

export function StepCollateral({ proMode, onStateChangeAction }: StepCollateralProps) {
  const methods = useFormContext();
  const formValues = methods.watch();
  
  // Mouse glow effect hooks for each card
  const collateralCardRef = useMouseGlow();
  const leverageCardRef = useMouseGlow();
  const statusCardRef = useMouseGlow();
  const costCardRef = useMouseGlow();
  const advancedCardRef = useMouseGlow();
  
  const [collateralProvided, setCollateralProvided] = useState<string>("0");
  const [leverage, setLeverage] = useState<SliderValue>(1);
  const [leverageInputValue, setLeverageInputValue] = useState<string>("1");
  const [collateralType, setCollateralType] = useState<string>(COLLATERAL_TYPES[0].value);
  const [showMaxLeverageAlert, setShowMaxLeverageAlert] = useState<boolean>(false);
  const [solPrice, setSolPrice] = useState<number>(0);
  
  // Calculate derived values
  const options = formValues.strikePrice && formValues.premium ? [{
    quantity: formValues.quantity || 1,
    strikePrice: formValues.strikePrice,
    premium: formValues.premium,
    optionType: formValues.optionType,
    asset: formValues.asset,
    expirationDate: formValues.expirationDate
  }] : [];

  const totalPremium = calculateTotalPremium(options);
  const collateralNeeded = calculateCollateralNeeded(options);
  const requiredCollateral = calculateRequiredCollateral(collateralNeeded, totalPremium);
  const minCollateralRequired = calculateMinCollateralRequired(collateralNeeded);
  
  // Calculate the actual collateral requirement based on strike price and contract quantity
  const actualCollateralRequired = formValues.strikePrice && formValues.quantity 
    ? (formValues.strikePrice * (formValues.quantity * 100))
    : 0;
  
  // Convert annual to hourly interest rate
  const hourlyInterestRate = BASE_ANNUAL_INTEREST_RATE / (365 * 24);
  
  // Calculate amount borrowed (collateral * (leverage - 1))
  const amountBorrowed = Number(collateralProvided || 0) * (Number(leverage) - 1);
  
  // Calculate time until expiration (in hours)
  const getTimeUntilExpiration = () => {
    if (!formValues.expirationDate) {
      return 7 * 24; // Default to 7 days if no expiration date
    }
    
    const now = new Date();
    const expiry = new Date(formValues.expirationDate);
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
  const hasEnough = hasEnoughCollateral(requiredCollateral, Number(collateralProvided), Number(leverage));
  
  // Get form values for summary
  const strikePrice = formValues.strikePrice;
  const premium = formValues.premium;

  // Update parent state
  useEffect(() => {
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
    onStateChangeAction(state);
  }, [
    hasEnough,
    collateralProvided,
    leverage,
    collateralType,
    borrowCost,
    optionCreationFee,
    borrowFee,
    transactionCost,
    maxProfitPotential,
    solPrice,
    onStateChangeAction
  ]);

  // Fetch SOL price
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const priceData = await getTokenPrice('SOL');
        
        // If API returns 0 (no API key or token not found), use a fallback price for development
        const finalPrice = priceData.price > 0 ? priceData.price : 100; // Fallback to $100 for development
        setSolPrice(finalPrice);
        
        if (priceData.price === 0) {
          console.warn('SOL price API returned 0, using fallback price of $100 for calculations');
        }
      } catch (error) {
        console.error('Error fetching SOL price:', error);
        setSolPrice(100); // Fallback to $100 for development
      }
    };
    
    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, ASSET_PRICE_REFRESH_INTERVAL * 20); // Update every 30 seconds (1.5s * 20)
    
    return () => clearInterval(interval);
  }, []);

  const handleCollateralChange = (value: string) => {
    // Only allow numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCollateralProvided(value);
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

  // Calculate total coverage including leverage (collateral + borrowed amount)
  const totalCoverage = Number(collateralProvided) * Number(leverage);
  const collateralPercentage = actualCollateralRequired > 0 
    ? (totalCoverage / actualCollateralRequired) * 100
    : 0;

  // Calculate maximum leverage that would result in exactly 100% coverage using actualCollateralRequired
  const maxLeverageFor100Percent = Number(collateralProvided) > 0 && actualCollateralRequired > 0
    ? Math.max(1, actualCollateralRequired / Number(collateralProvided))
    : MAX_LEVERAGE;

  // Dynamic max leverage (capped at MAX_LEVERAGE, but limited by 100% coverage and never below 1)
  const dynamicMaxLeverage = Math.min(MAX_LEVERAGE, Math.max(1, maxLeverageFor100Percent));

  const leverageRef = useRef(leverage);
  leverageRef.current = leverage;

  // Auto-adjust leverage when collateral changes (but not when leverage itself changes)
  useEffect(() => {
    // Calculate required collateral locally to avoid dependency issues
    const currentRequiredCollateral = calculateRequiredCollateral(collateralNeeded, totalPremium);
    
    if (Number(collateralProvided) > 0 && currentRequiredCollateral > 0) {
      // If collateral alone covers 100% or more, reset leverage to 1x
      const collateralOnlyCoverage = Number(collateralProvided) / currentRequiredCollateral;
      if (collateralOnlyCoverage >= 1 && Number(leverageRef.current) > 1) {
        setLeverage(1);
        setLeverageInputValue("1");
      }
    }
  }, [collateralProvided, collateralNeeded, totalPremium]);


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
                    <div className="pointer-events-none flex items-center">
                      <span className="text-white/60">$</span>
                    </div>
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
                <div className="flex gap-2">
                  <span className="text-xs text-white/40 mr-2">Auto:</span>
                  
                  {/* Minimum at 10x leverage */}
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => {
                      const minCollateral = (actualCollateralRequired / MAX_LEVERAGE).toFixed(2);
                      const newLeverage = parseFloat(MAX_LEVERAGE.toFixed(3));
                      
                      setCollateralProvided(minCollateral);
                      setLeverage(newLeverage);
                      setLeverageInputValue(newLeverage.toFixed(3).replace(/\.?0+$/, ''));
                    }}
                    className="bg-white/5 hover:bg-white/10 text-xs"
                  >
                    Min (10x)
                  </Button>
                  
                  {/* Half at 5x leverage */}
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => {
                      const halfCollateral = (actualCollateralRequired / 5).toFixed(2);
                      const newLeverage = 5;
                      
                      setCollateralProvided(halfCollateral);
                      setLeverage(newLeverage);
                      setLeverageInputValue(newLeverage.toFixed(3).replace(/\.?0+$/, ''));
                    }}
                    className="bg-white/5 hover:bg-white/10 text-xs"
                  >
                    Half (5x)
                  </Button>
                  
                  {/* Full at 1x leverage */}
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => {
                      const fullCollateral = actualCollateralRequired.toFixed(2);
                      const newLeverage = 1;
                      
                      setCollateralProvided(fullCollateral);
                      setLeverage(newLeverage);
                      setLeverageInputValue(newLeverage.toFixed(3).replace(/\.?0+$/, ''));
                    }}
                    className="bg-white/5 hover:bg-white/10 text-xs"
                  >
                    Full (1x)
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
              
              {/* Leverage Slider */}
              <div className="space-y-3">
                <Slider
                  classNames={{
                    base: "w-full",
                    label: "text-medium"
                  }}
                  color="foreground"
                  label="Leverage"
                  maxValue={MAX_LEVERAGE}
                  minValue={1}
                  // eslint-disable-next-line no-unused-vars
                  renderValue={({children, ...props}) => (
                    <output {...props}>
                      <Tooltip
                        className="text-tiny text-default-500 rounded-md"
                        content="Press Enter to confirm"
                        placement="left"
                      >
                        <input
                          aria-label="Leverage value"
                          className="px-2 py-1 w-16 text-right text-small font-medium text-white bg-white/5 outline-none transition-colors rounded-lg border border-white/20 hover:border-white/30 focus:border-[#4a85ff]/60"
                          type="text"
                          value={leverageInputValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const v = e.target.value;
                            // Limit to 3 decimal places and prevent empty values that aren't being typed
                            if (v === '' || /^\d{1,2}(\.\d{0,3})?$/.test(v)) {
                              setLeverageInputValue(v);
                            }
                          }}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === "Enter" && leverageInputValue !== '' && !isNaN(Number(leverageInputValue))) {
                              const inputValue = Number(leverageInputValue);
                              const clampedValue = Math.min(dynamicMaxLeverage, Math.max(1, inputValue));
                              setLeverage(clampedValue);
                              setLeverageInputValue(clampedValue.toFixed(3).replace(/\.?0+$/, ''));
                              
                              // Show max leverage alert if we hit the limit
                              if (clampedValue >= dynamicMaxLeverage && dynamicMaxLeverage < MAX_LEVERAGE) {
                                setShowMaxLeverageAlert(true);
                                setTimeout(() => setShowMaxLeverageAlert(false), 5000);
                              }
                            }
                          }}
                        />
                      </Tooltip>
                    </output>
                  )}
                  size="sm"
                  step={0.01}
                  value={leverage}
                  onChange={(value: SliderValue) => {
                    if (!isNaN(Number(value))) {
                      const clampedValue = Math.min(dynamicMaxLeverage, Math.max(1, Number(value)));
                      setLeverage(clampedValue);
                      setLeverageInputValue(clampedValue.toFixed(3).replace(/\.?0+$/, ''));
                      
                      // Show max leverage alert if we hit the limit
                      if (clampedValue >= dynamicMaxLeverage && dynamicMaxLeverage < MAX_LEVERAGE) {
                        setShowMaxLeverageAlert(true);
                        setTimeout(() => setShowMaxLeverageAlert(false), 5000);
                      }
                    }
                  }}
                />
              </div>
              
              {/* Risk Indicator */}
              <div className="mt-3 p-3 bg-black/20 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Liquidation Risk</span>
                  <Chip
                    size="sm"
                    variant="flat"
                    className={cn(
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
                <p className="text-sm font-medium text-white">${Number(collateralProvided).toFixed(2)}</p>
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

      {/* Cost Breakdown */}
      <motion.div variants={itemVariants}>
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
      </motion.div>

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
                    {requiredCollateral > 0 ? ((Number(collateralProvided) * Number(leverage) / requiredCollateral) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Effective Leverage</p>
                  <p className="text-sm font-medium text-white">
                    {Number(collateralProvided) > 0 ? (requiredCollateral / Number(collateralProvided)).toFixed(2) : '0'}x
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Total Collateral Needed</p>
                  <p className="text-sm font-medium text-white">${requiredCollateral.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Borrowed Amount</p>
                  <p className="text-sm font-medium text-white">
                    ${Math.max(0, requiredCollateral - Number(collateralProvided) * Number(leverage)).toFixed(2)}
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