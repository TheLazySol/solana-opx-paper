"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMouseGlow } from '@/hooks/useMouseGlow';
import { motion } from 'framer-motion';
import { Card, CardBody, Chip, Tooltip, Button, cn } from '@heroui/react';
import { useFormContext, useWatch } from 'react-hook-form';
import { AssetSelector } from '../asset-selector';
import { OptionTypeSelector } from '../option-type-select';
import { ExpirationDatePicker } from '../expiration-date-select';
import { StrikePriceInput } from '../strike-price-input';
import { PremiumDisplay } from '../premium-input';
import { QuantityInput } from '../quantity-input';
import { OptionContractSummary } from '../option-contract-summary';
import { AdvancedOptionDetails } from '../advanced-option-details';
import { calculateOption } from '@/lib/option-pricing-model/blackScholesModel';
import { SOL_PH_VOLATILITY, SOL_PH_RISK_FREE_RATE, EDIT_REFRESH_INTERVAL } from '@/constants/constants';
import { calculateTimeUntilExpiryUTC } from '@/utils/time-utils';
import { formatNumberWithCommas } from '@/utils/utils';
import { calculateIntrinsicValue, calculateExtrinsicValue, calculateMoneyness } from '@/constants/option-lab/calculations';
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
  
  // Mouse glow effect hooks for each card
  const assetCardRef = useMouseGlow();
  const pricingCardRef = useMouseGlow();
  const advancedCardRef = useMouseGlow();
  const [isCalculatingPremium, setIsCalculatingPremium] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Get order type from form context
  const premiumOrderType = methods.watch('orderType') || 'market';
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
    const timeUntilExpiry = calculateTimeUntilExpiryUTC(values.expirationDate);
    
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
    if (premiumOrderType === 'market') {
      const values = methods.getValues();
      if (values.strikePrice && values.strikePrice !== '' && values.expirationDate) {
        calculateOptionPrice(values);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionType, expirationDate, premiumOrderType]);

  // Debounced calculation for strike price and asset price changes
  useEffect(() => {
    if (premiumOrderType === 'market') {
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
    }
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strikePrice, assetPrice, premiumOrderType]);

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
          <OptionContractSummary />
        </motion.div>
      )}

      {/* Configuration Grid - Improved Layout */}
      <motion.div variants={itemVariants} className="space-y-6">
        {/* Section Headers and Inputs in a more compact layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Asset & Type */}
          <Card 
            ref={assetCardRef}
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
                  <DollarSign className="w-3 h-3 text-[#4a85ff]" />
                </div>
                <h3 className="text-sm font-medium text-white">Asset & Option Type</h3>
              </div>
              <div className="space-y-3">
                <AssetSelector assetPrice={assetPrice} />
                <OptionTypeSelector />
                <ExpirationDatePicker />
              </div>
            </CardBody>
          </Card>

          {/* Right Column - Pricing & Size */}
          <Card 
            ref={pricingCardRef}
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
                  <Hash className="w-3 h-3 text-[#4a85ff]" />
                </div>
                <h3 className="text-sm font-medium text-white">Pricing & Trade Quantity</h3>
              </div>
              <div className="space-y-3">
                <StrikePriceInput assetPrice={assetPrice} />
                <QuantityInput />
                <PremiumDisplay 
                  lastUpdated={lastUpdated} 
                  manualRefresh={manualRefresh} 
                  isDebouncing={isDebouncing}
                  isCalculating={isCalculatingPremium}
                  onOrderTypeChange={(type) => methods.setValue('orderType', type)}
                />
              </div>
            </CardBody>
          </Card>
        </div>

      </motion.div>

      {/* Advanced Option Details - Always visible */}
      <motion.div variants={itemVariants}>
        <AdvancedOptionDetails assetPrice={assetPrice} showTitle={false} />
      </motion.div>

    </motion.div>
  );
}
