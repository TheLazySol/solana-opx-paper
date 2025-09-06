"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
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
import { useAssetPriceInfo } from '@/context/asset-price-provider';
import { Info, TrendingUp, TrendingDown, Calendar, DollarSign, Hash } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface StepConfigureProps {
  assetPrice: number | null;
  proMode: boolean;
}

export function StepConfigure({ assetPrice: propAssetPrice, proMode }: StepConfigureProps) {
  const methods = useFormContext();
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [isCalculatingPremium, setIsCalculatingPremium] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();
  
  const selectedAsset = methods.watch('asset');
  const { price: contextAssetPrice } = useAssetPriceInfo(selectedAsset);
  const assetPrice = propAssetPrice ?? contextAssetPrice;
  
  const strikePrice = useWatch({ control: methods.control, name: 'strikePrice' });
  const expirationDate = useWatch({ control: methods.control, name: 'expirationDate' });
  const optionType = useWatch({ control: methods.control, name: 'optionType' });
  const quantity = useWatch({ control: methods.control, name: 'quantity' });
  const premium = useWatch({ control: methods.control, name: 'premium' });

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
      
      methods.setValue('premium', premium.toFixed(2), {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
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

  // Immediate calculation for option type and expiration date changes (no debounce)
  useEffect(() => {
    const values = methods.getValues();
    if (values.strikePrice && values.strikePrice !== '' && values.expirationDate) {
      calculateOptionPrice(values);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionType, expirationDate]);

  // Debounced calculation for strike price and asset price changes
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    const values = methods.getValues();
    if (strikePrice && strikePrice !== '') {
      debounceTimer.current = setTimeout(() => {
        if (!expirationDate) {
          const tempValues = {...values};
          tempValues.expirationDate = new Date();
          calculateOptionPrice(tempValues);
        } else {
          calculateOptionPrice(values);
        }
      }, EDIT_REFRESH_INTERVAL);
    }
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strikePrice, assetPrice]);

  const manualRefresh = async () => {
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
          <Card className="bg-gradient-to-r from-[#4a85ff]/10 to-[#5829f2]/10 border border-[#4a85ff]/20">
            <CardBody className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedAsset === 'SOL' && (
                    <Image 
                      src="/token-logos/solana_logo.png" 
                      alt="Solana" 
                      width={32} 
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/60">Short</span>
                      <Chip
                        size="sm"
                        variant="flat"
                        className={cn(
                          "font-medium",
                          optionType === 'call'
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        )}
                        startContent={optionType === 'call' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      >
                        {optionType === 'call' ? 'Call' : 'Put'}
                      </Chip>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-white/40">Strike: ${Number(strikePrice).toFixed(2)}</span>
                      <span className="text-xs text-white/40">Premium: ${Number(premium).toFixed(2)}</span>
                      <span className="text-xs text-white/40">Qty: {quantity}</span>
                    </div>
                  </div>
                </div>
                
                {expirationDate && (
                  <Chip
                    size="sm"
                    variant="bordered"
                    className="border-white/20"
                    startContent={<Calendar className="w-3 h-3" />}
                  >
                    {format(expirationDate, 'MMM dd, yyyy')}
                  </Chip>
                )}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* Configuration Grid - Improved Layout */}
      <motion.div variants={itemVariants} className="space-y-6">
        {/* Section Headers and Inputs in a more compact layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Asset & Type */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                <DollarSign className="w-3 h-3 text-[#4a85ff]" />
              </div>
              <h3 className="text-sm font-medium text-white">Asset & Type</h3>
            </div>
            <div className="space-y-3">
              <AssetSelector assetPrice={assetPrice} />
              <OptionTypeSelector />
            </div>
          </div>

          {/* Right Column - Pricing & Size */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-[#5829f2]/20 flex items-center justify-center">
                <Hash className="w-3 h-3 text-[#5829f2]" />
              </div>
              <h3 className="text-sm font-medium text-white">Pricing & Size</h3>
            </div>
            <div className="space-y-3">
              <StrikePriceInput assetPrice={assetPrice} />
              <QuantityInput />
            </div>
          </div>
        </div>

        {/* Bottom Row - Expiration & Premium in a more compact layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <ExpirationDatePicker />
          </div>
          <div className="space-y-2">
            <PremiumDisplay 
              lastUpdated={lastUpdated} 
              manualRefresh={manualRefresh} 
              isDebouncing={isDebouncing}
              isCalculating={isCalculatingPremium}
            />
          </div>
        </div>
      </motion.div>

      {/* Pro Mode Details */}
      {proMode && premium && strikePrice && (
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
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <p className="text-xs text-white/40 mb-1">Total Value</p>
                  <p className="text-sm font-medium text-white">
                    ${premium && quantity ? (Number(premium) * quantity * 100).toFixed(2) : '0.00'}
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
                        ${(Number(premium) * quantity * 100).toFixed(2)}
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

      {/* Mobile-friendly help text */}
      <motion.div variants={itemVariants} className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-300">
          Configure your option parameters. The premium will be automatically calculated based on the Black-Scholes model.
          {proMode && ' Advanced details are shown below for professional traders.'}
        </p>
      </motion.div>
    </motion.div>
  );
}
