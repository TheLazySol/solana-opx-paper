"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody, Chip, Tooltip, Button, cn } from '@heroui/react';
import { useFormContext, useWatch } from 'react-hook-form';
import { AssetSelector } from '../asset-selector';
import { OptionTypeSelector } from '../option-type-select';
import { ExpirationDatePicker } from '../expiration-date-select';
import { StrikePriceInput } from '../strike-price-input';
import { PremiumDisplay } from '../premium-display';
import { QuantityInput } from '../quantity-input';
import { calculateOption } from '@/lib/option-pricing-model/blackScholesModel';
import { SOL_PH_VOLATILITY, SOL_PH_RISK_FREE_RATE, EDIT_REFRESH_INTERVAL } from '@/constants/constants';
import { formatNumberWithCommas } from '@/utils/utils';
import { useAssetPriceInfo } from '@/context/asset-price-provider';
import { Info, TrendingUp, TrendingDown, Calendar, DollarSign, Hash, HelpCircle, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface StepConfigureDegenProps {
  assetPrice: number | null;
}

interface StepInfo {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const stepInfo: Record<string, StepInfo> = {
  asset: {
    id: 'asset',
    title: 'Choose Your Underlying Asset',
    description: 'This is the cryptocurrency you&apos;re creating an option for. The option gives buyers the right to buy (call) or sell (put) this asset at a specific price.',
    icon: <DollarSign className="w-4 h-4" />
  },
  optionType: {
    id: 'optionType',
    title: 'Select Option Type',
    description: 'A Call option gives the buyer the right to BUY the asset at the strike price. A Put option gives the buyer the right to SELL the asset at the strike price.',
    icon: <TrendingUp className="w-4 h-4" />
  },
  strikePrice: {
    id: 'strikePrice',
    title: 'Set Your Strike Price',
    description: 'This is the price at which the option can be exercised. For calls, buyers profit when the asset price goes above this. For puts, they profit when it goes below.',
    icon: <DollarSign className="w-4 h-4" />
  },
  quantity: {
    id: 'quantity',
    title: 'Choose Quantity',
    description: 'The number of option contracts you want to create. Each contract represents 100 units of the underlying asset.',
    icon: <Hash className="w-4 h-4" />
  },
  expirationDate: {
    id: 'expirationDate',
    title: 'Pick Expiration Date',
    description: 'The date when the option expires. After this date, the option becomes worthless if not exercised.',
    icon: <Calendar className="w-4 h-4" />
  },
  premium: {
    id: 'premium',
    title: 'Option Premium',
    description: 'The price buyers pay for each option contract. This is calculated automatically based on market conditions and option parameters.',
    icon: <DollarSign className="w-4 h-4" />
  }
};

export function StepConfigureDegen({ assetPrice: propAssetPrice }: StepConfigureDegenProps) {
  const methods = useFormContext();
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [isCalculatingPremium, setIsCalculatingPremium] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Get order type from form context
  const premiumOrderType = methods.watch('orderType') || 'market';
  const [currentStep, setCurrentStep] = useState<string>('asset');
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(new Set(['asset'])); // User starts on asset step
  const debounceTimer = useRef<NodeJS.Timeout>();
  
  const selectedAsset = methods.watch('asset');
  const { price: contextAssetPrice } = useAssetPriceInfo(selectedAsset);
  const assetPrice = propAssetPrice ?? contextAssetPrice;
  
  const strikePrice = useWatch({ control: methods.control, name: 'strikePrice' });
  const expirationDate = useWatch({ control: methods.control, name: 'expirationDate' });
  const optionType = useWatch({ control: methods.control, name: 'optionType' });
  const quantity = useWatch({ control: methods.control, name: 'quantity' });
  const premium = useWatch({ control: methods.control, name: 'premium' });

  // Determine which steps have valid form data
  const isStepValidated = useCallback((step: string): boolean => {
    switch (step) {
      case 'asset':
        return !!selectedAsset;
      case 'optionType':
        return !!optionType;
      case 'strikePrice':
        return !!strikePrice && strikePrice !== '';
      case 'quantity':
        return quantity >= 0.01;
      case 'expirationDate':
        return !!expirationDate;
      case 'premium':
        return !!premium && premium !== '';
      default:
        return false;
    }
  }, [selectedAsset, optionType, strikePrice, quantity, expirationDate, premium]);

  // Determine which steps are completed (visited AND validated)
  const isStepCompleted = useCallback((step: string): boolean => {
    return visitedSteps.has(step) && isStepValidated(step);
  }, [visitedSteps, isStepValidated]);

  // Determine which steps are enabled (based on validation, not completion)
  const isStepEnabled = useCallback((step: string): boolean => {
    switch (step) {
      case 'asset':
        return true;
      case 'optionType':
        return isStepValidated('asset');
      case 'strikePrice':
        return isStepValidated('asset') && isStepValidated('optionType');
      case 'quantity':
        return isStepValidated('asset') && isStepValidated('optionType') && isStepValidated('strikePrice');
      case 'expirationDate':
        return isStepValidated('asset') && isStepValidated('optionType') && isStepValidated('strikePrice') && isStepValidated('quantity');
      case 'premium':
        return isStepValidated('asset') && isStepValidated('optionType') && isStepValidated('strikePrice') && isStepValidated('quantity') && isStepValidated('expirationDate');
      default:
        return false;
    }
  }, [isStepValidated]);

  // Auto-advance to next step when current step is validated (but allow going back)
  useEffect(() => {
    const stepOrder = ['asset', 'optionType', 'strikePrice', 'quantity', 'expirationDate', 'premium'];
    const currentIndex = stepOrder.indexOf(currentStep);
    
    // Only auto-advance if we're on the last incomplete step and it just got validated
    if (currentIndex < stepOrder.length - 1 && isStepValidated(currentStep)) {
      const nextStep = stepOrder[currentIndex + 1];
      if (isStepEnabled(nextStep) && !isStepValidated(nextStep)) {
        // Mark current step as visited since user completed it
        setVisitedSteps(prev => new Set([...prev, currentStep]));
        // Add a longer delay to give users time to see their selection
        const timer = setTimeout(() => {
          setCurrentStep(nextStep);
          setVisitedSteps(prev => new Set([...prev, nextStep]));
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedAsset, optionType, strikePrice, quantity, expirationDate, premium, currentStep, isStepValidated, isStepEnabled, methods]);

  const calculateOptionPrice = useCallback(async (values: any) => {
    if (!assetPrice || !values.expirationDate || !values.strikePrice || values.strikePrice === '') {
      return;
    }
    
    setIsCalculatingPremium(true);
    const timeUntilExpiry = Math.floor(
      (values.expirationDate.getTime() - Date.now()) / 1000
    );
    
    try {
      const volatility = SOL_PH_VOLATILITY;
      const riskFreeRate = SOL_PH_RISK_FREE_RATE;
      const result = await calculateOption({
        isCall: values.optionType === 'call',
        strikePrice: typeof values.strikePrice === 'string' ? Number(values.strikePrice) : values.strikePrice,
        spotPrice: assetPrice,
        timeUntilExpirySeconds: timeUntilExpiry,
        volatility,
        riskFreeRate
      });
      const premium = result.price;
      
      // Only update if the value actually changed to prevent infinite loops
      const currentPremium = methods.getValues('premium');
      const newPremiumValue = premium.toFixed(2);
      if (currentPremium !== newPremiumValue) {
        methods.setValue('premium', newPremiumValue, {
          shouldValidate: false,
          shouldDirty: true,
          shouldTouch: false
        });
      }
      setCalculatedPrice(premium);
      setLastUpdated(new Date());
      
      return premium;
    } catch (error) {
      console.error('Error calculating option:', error);
      throw error;
    } finally {
      setIsCalculatingPremium(false);
    }
  }, [assetPrice, methods]);

  // Calculate premium when all required fields are filled
  useEffect(() => {
    if (premiumOrderType === 'market') {
      const values = methods.getValues();
      if (values.strikePrice && values.strikePrice !== '' && values.expirationDate && values.quantity >= 0.01) {
        // Debounce the calculation to prevent infinite loops
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
          calculateOptionPrice(values);
        }, EDIT_REFRESH_INTERVAL);
      }
    }
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [optionType, expirationDate, strikePrice, quantity, assetPrice, calculateOptionPrice, methods, premiumOrderType]);

  const manualRefresh = useCallback(async () => {
    const values = methods.getValues();
    if (values.strikePrice && values.strikePrice !== '' && values.expirationDate) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      setIsDebouncing(true);
      try {
        await calculateOptionPrice(values);
      } finally {
        setIsDebouncing(false);
      }
    }
  }, [methods, calculateOptionPrice]);

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

  const totalValue = premium && quantity ? Number(premium) * quantity * 100 : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Progress Summary */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-[#4a85ff]/10 to-[#5829f2]/10 border border-[#4a85ff]/20">
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Your Option Summary</h3>
              {premium && (
                <Chip
                  size="sm"
                  variant="flat"
                  className="bg-green-500/20 text-green-400"
                >
                  Total Value: ${formatNumberWithCommas(totalValue)}
                </Chip>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {selectedAsset && (
                <Chip size="sm" variant="bordered" className="border-white/20">
                  {selectedAsset}
                </Chip>
              )}
              {optionType && (
                <Chip
                  size="sm"
                  variant="bordered"
                  className={cn(
                    "border-white/20",
                    optionType === 'call' ? "text-green-400" : "text-red-400"
                  )}
                >
                  {optionType === 'call' ? 'Call' : 'Put'}
                </Chip>
              )}
              {strikePrice && (
                <Chip size="sm" variant="bordered" className="border-white/20">
                  Strike: ${Number(strikePrice).toFixed(2)}
                </Chip>
              )}
              {quantity > 0 && (
                <Chip size="sm" variant="bordered" className="border-white/20">
                  Qty: {quantity}
                </Chip>
              )}
              {expirationDate && (
                <Chip size="sm" variant="bordered" className="border-white/20">
                  Exp: {format(expirationDate, 'MMM dd')}
                </Chip>
              )}
              {premium && (
                <Chip size="sm" variant="bordered" className="border-white/20 text-[#4a85ff]">
                  Premium: ${Number(premium).toFixed(2)}/contract
                </Chip>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Step-by-Step Form */}
      <div className="space-y-4">
        {/* Asset Selection */}
        <motion.div variants={itemVariants}>
          <Card 
            className={cn(
              "border transition-all",
              currentStep === 'asset' 
                ? "bg-white/5 border-[#4a85ff]/50" 
                : isStepCompleted('asset')
                ? "bg-white/[0.02] border-green-500/30"
                : "bg-black/20 border-white/10"
            )}
          >
            <CardBody className="p-4">
              <div 
                className="flex items-start gap-3 cursor-pointer" 
                onClick={() => {
                  if (isStepEnabled('asset')) {
                    setCurrentStep('asset');
                    setVisitedSteps(prev => new Set([...prev, 'asset']));
                  }
                }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  isStepCompleted('asset') 
                    ? "bg-green-500/20 text-green-400" 
                    : currentStep === 'asset'
                    ? "bg-[#4a85ff]/20 text-[#4a85ff]"
                    : "bg-white/10 text-white/50"
                )}>
                  {isStepCompleted('asset') ? <CheckCircle2 className="w-4 h-4" /> : stepInfo.asset.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white">{stepInfo.asset.title}</h4>
                    <Tooltip content={stepInfo.asset.description}>
                      <HelpCircle className="w-3 h-3 text-white/40 hover:text-white/60" />
                    </Tooltip>
                  </div>
                  {currentStep === 'asset' && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 mt-3"
                      >
                        <p className="text-xs text-white/60">{stepInfo.asset.description}</p>
                        <AssetSelector assetPrice={assetPrice} />
                      </motion.div>
                    </AnimatePresence>
                  )}
                  {currentStep !== 'asset' && isStepCompleted('asset') && (
                    <p className="text-xs text-white/60">Selected: {selectedAsset}</p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Option Type Selection */}
        <motion.div variants={itemVariants}>
          <Card 
            className={cn(
              "border transition-all",
              !isStepEnabled('optionType') && "opacity-50",
              currentStep === 'optionType' 
                ? "bg-white/5 border-[#4a85ff]/50" 
                : isStepCompleted('optionType')
                ? "bg-white/[0.02] border-green-500/30"
                : "bg-black/20 border-white/10"
            )}
          >
            <CardBody className="p-4">
              <div 
                className={cn(
                  "flex items-start gap-3",
                  (isStepEnabled('optionType') || isStepCompleted('optionType')) ? "cursor-pointer" : "cursor-not-allowed"
                )}
                onClick={() => {
                  if (isStepEnabled('optionType') || isStepCompleted('optionType')) {
                    setCurrentStep('optionType');
                    setVisitedSteps(prev => new Set([...prev, 'optionType']));
                  }
                }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  isStepCompleted('optionType') 
                    ? "bg-green-500/20 text-green-400" 
                    : currentStep === 'optionType'
                    ? "bg-[#4a85ff]/20 text-[#4a85ff]"
                    : "bg-white/10 text-white/50"
                )}>
                  {isStepCompleted('optionType') ? <CheckCircle2 className="w-4 h-4" /> : stepInfo.optionType.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white">{stepInfo.optionType.title}</h4>
                    <Tooltip content={stepInfo.optionType.description}>
                      <HelpCircle className="w-3 h-3 text-white/40 hover:text-white/60" />
                    </Tooltip>
                  </div>
                  {currentStep === 'optionType' && isStepEnabled('optionType') && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 mt-3"
                      >
                        <p className="text-xs text-white/60">{stepInfo.optionType.description}</p>
                        <OptionTypeSelector />
                      </motion.div>
                    </AnimatePresence>
                  )}
                  {currentStep !== 'optionType' && isStepCompleted('optionType') && (
                    <p className="text-xs text-white/60">Selected: {optionType === 'call' ? 'Call Option' : 'Put Option'}</p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Strike Price Input */}
        <motion.div variants={itemVariants}>
          <Card 
            className={cn(
              "border transition-all",
              !isStepEnabled('strikePrice') && "opacity-50",
              currentStep === 'strikePrice' 
                ? "bg-white/5 border-[#4a85ff]/50" 
                : isStepCompleted('strikePrice')
                ? "bg-white/[0.02] border-green-500/30"
                : "bg-black/20 border-white/10"
            )}
          >
            <CardBody className="p-4">
              <div 
                className={cn(
                  "flex items-start gap-3",
                  (isStepEnabled('strikePrice') || isStepCompleted('strikePrice')) ? "cursor-pointer" : "cursor-not-allowed"
                )}
                onClick={() => {
                  if (isStepEnabled('strikePrice') || isStepCompleted('strikePrice')) {
                    setCurrentStep('strikePrice');
                    setVisitedSteps(prev => new Set([...prev, 'strikePrice']));
                  }
                }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  isStepCompleted('strikePrice') 
                    ? "bg-green-500/20 text-green-400" 
                    : currentStep === 'strikePrice'
                    ? "bg-[#4a85ff]/20 text-[#4a85ff]"
                    : "bg-white/10 text-white/50"
                )}>
                  {isStepCompleted('strikePrice') ? <CheckCircle2 className="w-4 h-4" /> : stepInfo.strikePrice.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white">{stepInfo.strikePrice.title}</h4>
                    <Tooltip content={stepInfo.strikePrice.description}>
                      <HelpCircle className="w-3 h-3 text-white/40 hover:text-white/60" />
                    </Tooltip>
                  </div>
                  {currentStep === 'strikePrice' && isStepEnabled('strikePrice') && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 mt-3"
                      >
                        <p className="text-xs text-white/60">{stepInfo.strikePrice.description}</p>
                        <StrikePriceInput assetPrice={assetPrice} />
                      </motion.div>
                    </AnimatePresence>
                  )}
                  {currentStep !== 'strikePrice' && isStepCompleted('strikePrice') && (
                    <p className="text-xs text-white/60">Strike Price: ${Number(strikePrice).toFixed(2)}</p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Quantity Input */}
        <motion.div variants={itemVariants}>
          <Card 
            className={cn(
              "border transition-all",
              !isStepEnabled('quantity') && "opacity-50",
              currentStep === 'quantity' 
                ? "bg-white/5 border-[#4a85ff]/50" 
                : isStepCompleted('quantity')
                ? "bg-white/[0.02] border-green-500/30"
                : "bg-black/20 border-white/10"
            )}
          >
            <CardBody className="p-4">
              <div 
                className={cn(
                  "flex items-start gap-3",
                  (isStepEnabled('quantity') || isStepCompleted('quantity')) ? "cursor-pointer" : "cursor-not-allowed"
                )}
                onClick={() => {
                  if (isStepEnabled('quantity') || isStepCompleted('quantity')) {
                    setCurrentStep('quantity');
                    setVisitedSteps(prev => new Set([...prev, 'quantity']));
                  }
                }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  isStepCompleted('quantity') 
                    ? "bg-green-500/20 text-green-400" 
                    : currentStep === 'quantity'
                    ? "bg-[#4a85ff]/20 text-[#4a85ff]"
                    : "bg-white/10 text-white/50"
                )}>
                  {isStepCompleted('quantity') ? <CheckCircle2 className="w-4 h-4" /> : stepInfo.quantity.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white">{stepInfo.quantity.title}</h4>
                    <Tooltip content={stepInfo.quantity.description}>
                      <HelpCircle className="w-3 h-3 text-white/40 hover:text-white/60" />
                    </Tooltip>
                  </div>
                  {currentStep === 'quantity' && isStepEnabled('quantity') && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 mt-3"
                      >
                        <p className="text-xs text-white/60">{stepInfo.quantity.description}</p>
                        <QuantityInput />
                      </motion.div>
                    </AnimatePresence>
                  )}
                  {currentStep !== 'quantity' && isStepCompleted('quantity') && (
                    <p className="text-xs text-white/60">Quantity: {quantity} contracts</p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Expiration Date */}
        <motion.div variants={itemVariants}>
          <Card 
            className={cn(
              "border transition-all",
              !isStepEnabled('expirationDate') && "opacity-50",
              currentStep === 'expirationDate' 
                ? "bg-white/5 border-[#4a85ff]/50" 
                : isStepCompleted('expirationDate')
                ? "bg-white/[0.02] border-green-500/30"
                : "bg-black/20 border-white/10"
            )}
          >
            <CardBody className="p-4">
              <div 
                className={cn(
                  "flex items-start gap-3",
                  (isStepEnabled('expirationDate') || isStepCompleted('expirationDate')) ? "cursor-pointer" : "cursor-not-allowed"
                )}
                onClick={() => {
                  if (isStepEnabled('expirationDate') || isStepCompleted('expirationDate')) {
                    setCurrentStep('expirationDate');
                    setVisitedSteps(prev => new Set([...prev, 'expirationDate']));
                  }
                }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  isStepCompleted('expirationDate') 
                    ? "bg-green-500/20 text-green-400" 
                    : currentStep === 'expirationDate'
                    ? "bg-[#4a85ff]/20 text-[#4a85ff]"
                    : "bg-white/10 text-white/50"
                )}>
                  {isStepCompleted('expirationDate') ? <CheckCircle2 className="w-4 h-4" /> : stepInfo.expirationDate.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white">{stepInfo.expirationDate.title}</h4>
                    <Tooltip content={stepInfo.expirationDate.description}>
                      <HelpCircle className="w-3 h-3 text-white/40 hover:text-white/60" />
                    </Tooltip>
                  </div>
                  {currentStep === 'expirationDate' && isStepEnabled('expirationDate') && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 mt-3"
                      >
                        <p className="text-xs text-white/60">{stepInfo.expirationDate.description}</p>
                        <ExpirationDatePicker />
                      </motion.div>
                    </AnimatePresence>
                  )}
                  {currentStep !== 'expirationDate' && isStepCompleted('expirationDate') && (
                    <p className="text-xs text-white/60">Expires: {format(expirationDate, 'MMM dd, yyyy')}</p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Premium Display */}
        <motion.div variants={itemVariants}>
          <Card 
            className={cn(
              "border transition-all",
              !isStepEnabled('premium') && "opacity-50",
              currentStep === 'premium' 
                ? "bg-white/5 border-[#4a85ff]/50" 
                : isStepCompleted('premium')
                ? "bg-white/[0.02] border-green-500/30"
                : "bg-black/20 border-white/10"
            )}
          >
            <CardBody className="p-4">
              <div 
                className={cn(
                  "flex items-start gap-3",
                  (isStepEnabled('premium') || isStepCompleted('premium')) ? "cursor-pointer" : "cursor-not-allowed"
                )}
                onClick={() => {
                  if (isStepEnabled('premium') || isStepCompleted('premium')) {
                    setCurrentStep('premium');
                    setVisitedSteps(prev => new Set([...prev, 'premium']));
                  }
                }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  isStepCompleted('premium') 
                    ? "bg-green-500/20 text-green-400" 
                    : currentStep === 'premium'
                    ? "bg-[#4a85ff]/20 text-[#4a85ff]"
                    : "bg-white/10 text-white/50"
                )}>
                  {isStepCompleted('premium') ? <CheckCircle2 className="w-4 h-4" /> : stepInfo.premium.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white">{stepInfo.premium.title}</h4>
                    <Tooltip content={stepInfo.premium.description}>
                      <HelpCircle className="w-3 h-3 text-white/40 hover:text-white/60" />
                    </Tooltip>
                  </div>
                  {currentStep === 'premium' && isStepEnabled('premium') && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 mt-3"
                      >
                        <p className="text-xs text-white/60">{stepInfo.premium.description}</p>
                        <PremiumDisplay 
                          lastUpdated={lastUpdated} 
                          manualRefresh={manualRefresh} 
                          isDebouncing={isDebouncing}
                          isCalculating={isCalculatingPremium}
                          onOrderTypeChange={(type) => methods.setValue('orderType', type)}
                        />
                        {premium && (
                          <div className="p-3 bg-[#4a85ff]/10 rounded-lg border border-[#4a85ff]/20">
                            <p className="text-sm text-white/80">
                              Total Premium Value: <span className="font-bold text-[#4a85ff]">${totalValue.toFixed(2)}</span>
                            </p>
                            <p className="text-xs text-white/60 mt-1">
                              This is the total amount you&apos;ll receive for selling {quantity} option contract{quantity > 1 ? 's' : ''}.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}
                  {currentStep !== 'premium' && isStepCompleted('premium') && (
                    <div>
                      <p className="text-xs text-white/60">Premium: ${Number(premium).toFixed(2)}/contract</p>
                      <p className="text-xs text-[#4a85ff] font-medium">Total Value: ${formatNumberWithCommas(totalValue)}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* Advanced Option Details - Always visible */}
      {premium && strikePrice && (
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
                <h4 className="text-sm font-medium text-white">Advanced Option Details</h4>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Implied Volatility</p>
                  <p className="text-sm font-medium text-white">{(SOL_PH_VOLATILITY * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Risk-Free Rate</p>
                  <p className="text-sm font-medium text-white">{(SOL_PH_RISK_FREE_RATE * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Moneyness</p>
                  <p className="text-sm font-medium text-white">
                    {assetPrice && strikePrice ? (
                      optionType === 'call' 
                        ? assetPrice > Number(strikePrice) ? 'ITM' : assetPrice < Number(strikePrice) ? 'OTM' : 'ATM'
                        : assetPrice < Number(strikePrice) ? 'ITM' : assetPrice > Number(strikePrice) ? 'OTM' : 'ATM'
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Option Premium</p>
                  <p className="text-sm font-medium text-blue-400">
                    ${premium ? Number(premium).toFixed(2) : '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Total Value</p>
                  <p className="text-sm font-medium text-white">
                    ${formatNumberWithCommas(totalValue)}
                  </p>
                </div>
              </div>
              
              {expirationDate && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/40">Days to Expiration</p>
                      <p className="text-sm font-medium text-white">
                        {Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Break-Even Price</p>
                      <p className="text-sm font-medium text-white">
                        ${optionType === 'call' 
                          ? (Number(strikePrice) + Number(premium)).toFixed(2)
                          : (Number(strikePrice) - Number(premium)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Max Profit</p>
                      <p className="text-sm font-medium text-green-400">
                        ${formatNumberWithCommas(totalValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Max Loss</p>
                      <p className="text-sm font-medium text-red-400">
                        {optionType === 'call' ? 'Unlimited' : `$${(Number(strikePrice) * quantity * 100).toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* Completion Message */}
      {isStepCompleted('premium') && (
        <motion.div 
          variants={itemVariants}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-4"
        >
          <p className="text-sm text-green-400 font-medium">
            ✨ Great job! Your option is configured. Click &quot;Next&quot; to proceed with collateral.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
