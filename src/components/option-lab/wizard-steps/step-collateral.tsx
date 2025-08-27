"use client"

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  cn 
} from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { CollateralState } from '../collateral-provider';
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
import {
  COLLATERAL_TYPES,
  BASE_ANNUAL_INTEREST_RATE,
  TRANSACTION_COST_SOL,
  MAX_LEVERAGE
} from '@/constants/constants';
import { 
  Shield, 
  Zap, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Info,
  Coins,
  Lock,
  Receipt
} from 'lucide-react';

interface StepCollateralProps {
  proMode: boolean;
  onStateChange: (state: CollateralState) => void;
}

export function StepCollateral({ proMode, onStateChange }: StepCollateralProps) {
  const methods = useFormContext();
  const formValues = methods.watch();
  
  const [collateralProvided, setCollateralProvided] = useState<string>("0");
  const [leverage, setLeverage] = useState<number>(1);
  const [collateralType, setCollateralType] = useState<string>(COLLATERAL_TYPES[0].value);
  
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
  const minCollateralRequired = calculateMinCollateralRequired(options);
  const borrowCost = calculateBorrowCost(Number(collateralProvided), leverage, requiredCollateral);
  const optionCreationFee = calculateOptionCreationFee(options);
  const borrowFee = calculateBorrowFee(borrowCost);
  const transactionCost = TRANSACTION_COST_SOL;
  const maxProfitPotential = calculateMaxProfitPotential(totalPremium, borrowCost, optionCreationFee, borrowFee, transactionCost);
  const hasEnough = hasEnoughCollateral(requiredCollateral, Number(collateralProvided), leverage);

  // Update parent state
  useEffect(() => {
    const state: CollateralState = {
      hasEnoughCollateral: hasEnough,
      collateralProvided,
      leverage,
      collateralType,
      borrowCost,
      optionCreationFee,
      borrowFee,
      transactionCost,
      maxProfitPotential
    };
    onStateChange(state);
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
    onStateChange
  ]);

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

  const collateralPercentage = requiredCollateral > 0 
    ? Math.min((Number(collateralProvided) * leverage / requiredCollateral) * 100, 100)
    : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Collateral Status Card */}
      <motion.div variants={itemVariants}>
        <Card 
          className={cn(
            "border transition-all duration-300",
            hasEnough
              ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20"
              : "bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20"
          )}
        >
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className={cn(
                  "w-5 h-5",
                  hasEnough ? "text-green-400" : "text-red-400"
                )} />
                <span className="font-medium text-white">
                  Collateral Status
                </span>
              </div>
              <Chip
                size="sm"
                variant="flat"
                className={cn(
                  hasEnough
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                )}
              >
                {hasEnough ? 'Sufficient' : 'Insufficient'}
              </Chip>
            </div>
            
            <Progress
              value={collateralPercentage}
              className="h-2 mb-2"
              classNames={{
                indicator: cn(
                  hasEnough
                    ? "bg-gradient-to-r from-green-400 to-emerald-400"
                    : "bg-gradient-to-r from-red-400 to-orange-400"
                ),
                track: "bg-white/10"
              }}
            />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">
                ${Number(collateralProvided).toFixed(2)} provided
              </span>
              <span className={cn(
                "font-medium",
                hasEnough ? "text-green-400" : "text-red-400"
              )}>
                ${(requiredCollateral / leverage).toFixed(2)} needed
              </span>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Main Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Collateral Input Section */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#4a85ff]/20 flex items-center justify-center">
              <Coins className="w-4 h-4 text-[#4a85ff]" />
            </div>
            <h3 className="text-lg font-medium text-white">Collateral Amount</h3>
          </div>
          
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
              <SelectItem key={type.value} value={type.value}>
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
              inputWrapper: "bg-white/5 border-white/20 hover:border-white/30 data-[hover=true]:bg-white/10"
            }}
          />
          
          {/* Quick Select Buttons */}
          <div className="flex gap-2">
            <span className="text-xs text-white/40 mr-2">Quick:</span>
            {[minCollateralRequired / leverage, requiredCollateral / leverage, requiredCollateral / leverage * 1.5].map((amount, index) => (
              <Button
                key={index}
                size="sm"
                variant="flat"
                onPress={() => setCollateralProvided(amount.toFixed(2))}
                className="bg-white/5 hover:bg-white/10 text-xs"
              >
                ${amount.toFixed(0)}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Leverage Section */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#5829f2]/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#5829f2]" />
            </div>
            <h3 className="text-lg font-medium text-white">Leverage</h3>
          </div>
          
          {/* Leverage Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Leverage Amount</span>
              <div className="flex items-center gap-2">
                <Chip
                  size="sm"
                  variant="flat"
                  className={cn(
                    "font-bold",
                    leverage === 1 ? "bg-green-500/20 text-green-400" :
                    leverage <= 5 ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-red-500/20 text-red-400"
                  )}
                >
                  {leverage}x
                </Chip>
                {leverage > 1 && (
                  <Tooltip content="Higher leverage increases risk but reduces collateral needed">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  </Tooltip>
                )}
              </div>
            </div>
            
            <Slider
              value={leverage}
              onChange={(value) => setLeverage(value as number)}
              minValue={1}
              maxValue={MAX_LEVERAGE}
              step={0.5}
              className="w-full"
              classNames={{
                track: "bg-white/10",
                filler: cn(
                  leverage === 1 ? "bg-gradient-to-r from-green-400 to-green-500" :
                  leverage <= 5 ? "bg-gradient-to-r from-yellow-400 to-yellow-500" :
                  "bg-gradient-to-r from-red-400 to-red-500"
                ),
                thumb: "bg-white border-2 border-white/20"
              }}
              renderValue={() => (
                <div className="flex justify-between w-full px-1 mt-2">
                  <span className="text-xs text-white/40">1x</span>
                  <span className="text-xs text-white/40">{MAX_LEVERAGE / 2}x</span>
                  <span className="text-xs text-white/40">{MAX_LEVERAGE}x</span>
                </div>
              )}
            />
          </div>
          
          {/* Risk Indicator */}
          <Card className="bg-white/5 border border-white/10">
            <CardBody className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Risk Level</span>
                <Chip
                  size="sm"
                  variant="flat"
                  className={cn(
                    leverage === 1 ? "bg-green-500/20 text-green-400" :
                    leverage <= 3 ? "bg-blue-500/20 text-blue-400" :
                    leverage <= 5 ? "bg-yellow-500/20 text-yellow-400" :
                    leverage <= 7 ? "bg-orange-500/20 text-orange-400" :
                    "bg-red-500/20 text-red-400"
                  )}
                >
                  {leverage === 1 ? 'Minimal' :
                   leverage <= 3 ? 'Low' :
                   leverage <= 5 ? 'Medium' :
                   leverage <= 7 ? 'High' :
                   'Very High'}
                </Chip>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* Cost Breakdown */}
      <motion.div variants={itemVariants}>
        <Card className="bg-black/40 border border-white/10">
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-[#4a85ff]" />
              <h4 className="text-sm font-medium text-white">Cost Breakdown</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Borrow Cost</span>
                <span className="text-sm font-medium text-white">${borrowCost.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Option Creation Fee</span>
                <span className="text-sm font-medium text-white">${optionCreationFee.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Borrow Fee</span>
                <span className="text-sm font-medium text-white">${borrowFee.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Transaction Cost</span>
                <span className="text-sm font-medium text-white">${transactionCost.toFixed(4)}</span>
              </div>
              
              <div className="pt-3 mt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Max Profit Potential</span>
                  <span className={cn(
                    "text-sm font-bold",
                    maxProfitPotential > 0 ? "text-green-400" : "text-red-400"
                  )}>
                    ${Math.abs(maxProfitPotential).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Pro Mode Advanced Details */}
      {proMode && (
        <motion.div 
          variants={itemVariants}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="bg-white/5 border border-white/10">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-[#4a85ff]" />
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
                    {requiredCollateral > 0 ? ((Number(collateralProvided) * leverage / requiredCollateral) * 100).toFixed(1) : '0'}%
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
                    ${Math.max(0, requiredCollateral - Number(collateralProvided) * leverage).toFixed(2)}
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

      {/* Help Text */}
      <motion.div variants={itemVariants} className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-300">
          Provide collateral to secure your option position. Use leverage to reduce collateral requirements but be aware of increased risk.
          {proMode && ' Advanced metrics help you understand your risk exposure.'}
        </p>
      </motion.div>
    </motion.div>
  );
}
