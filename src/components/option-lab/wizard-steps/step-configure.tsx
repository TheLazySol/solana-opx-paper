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
import { PremiumDisplay } from '../premium-display';
import { QuantityInput } from '../quantity-input';
import { calculateOption } from '@/lib/option-pricing-model/blackScholesModel';
import { SOL_PH_VOLATILITY, SOL_PH_RISK_FREE_RATE, EDIT_REFRESH_INTERVAL } from '@/constants/constants';
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
              </div>
            </CardBody>
          </Card>
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

      {/* Advanced Option Details - Always visible */}
      <motion.div variants={itemVariants}>
        <Card 
          ref={advancedCardRef}
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
              <Info className="w-4 h-4 text-[#4a85ff]" />
              <h4 className="text-sm font-medium text-white">Advanced Option Details</h4>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Implied Volatility</p>
                  <Tooltip 
                    content={
                      <div className="text-xs font-light text-white/70 max-w-xs">
                        Market expectation of future price movement for <span style={{ color: '#4a85ff', textShadow: '0 0 8px #4a85ff88, 0 0 2px #4a85ff' }}>{selectedAsset || 'the asset'}</span>. Higher volatility increases option premiums as larger price swings become more likely.
                      </div>
                    }
                    placement="top"
                  >
                    <Info className="w-3 h-3 text-white/30 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-sm font-medium text-white">{(SOL_PH_VOLATILITY * 100).toFixed(2)}%</p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Risk-Free Rate</p>
                  <Tooltip 
                    content={
                      <div className="text-xs font-light text-white/70 max-w-xs">
                        Interest rate of &quot;risk-free&quot; investments (like Lending USDC). Used as the baseline for pricing models to calculate theoretical option values.
                      </div>
                    }
                    placement="top"
                  >
                    <Info className="w-3 h-3 text-white/30 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-sm font-medium text-white">{(SOL_PH_RISK_FREE_RATE * 100).toFixed(2)}%</p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Moneyness</p>
                  <Tooltip 
                    content={
                      assetPrice && strikePrice && premium ? (
                        <div className="text-xs font-light space-y-1">
                          <div><span className="text-green-400/70 font-light" style={{ textShadow: '0 0 6px rgba(34, 197, 94, 0.4)' }}>Intrinsic</span> Value: ${calculateIntrinsicValue(optionType, assetPrice, Number(strikePrice)).toFixed(2)}</div>
                          <div><span className="text-red-400/70 font-light" style={{ textShadow: '0 0 6px rgba(248, 113, 113, 0.4)' }}>Extrinsic</span> Value: ${calculateExtrinsicValue(Number(premium), calculateIntrinsicValue(optionType, assetPrice, Number(strikePrice))).toFixed(2)}</div>
                        </div>
                      ) : <div className="text-xs font-light text-white/70">Option value breakdown available when all values are set</div>
                    }
                    placement="top"
                  >
                    <Info className="w-3 h-3 text-white/30 cursor-help" />
                  </Tooltip>
                </div>
                <p className={`text-sm font-medium ${
                  assetPrice && strikePrice ? 
                    calculateMoneyness(optionType, assetPrice, Number(strikePrice)) === 'ITM' ? 'text-green-400' :
                    calculateMoneyness(optionType, assetPrice, Number(strikePrice)) === 'ATM' ? 'text-yellow-400' :
                    'text-red-400'
                    : 'text-white'
                }`}>
                  {assetPrice && strikePrice ? calculateMoneyness(optionType, assetPrice, Number(strikePrice)) : '-'}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-xs text-white/40">Total Value</p>
                  <Tooltip 
                    content={
                      <div className="text-xs font-light text-white/70">
                        Quantity × Option Premium × 100 (contract multiplier)
                      </div>
                    }
                    placement="top"
                  >
                    <Info className="w-3 h-3 text-white/30 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-sm font-medium text-white">
                  ${premium && quantity ? (Number(premium) * quantity * 100).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-white/40">Days to Expiration</p>
                    <Tooltip 
                      content={
                        <div className="text-xs font-light text-white/70">
                          {expirationDate ? 
                            `Expires: ${expirationDate.toLocaleDateString()} at ${expirationDate.toLocaleTimeString()} UTC` 
                            : 'Expiration date and time in UTC'
                          }
                        </div>
                      }
                      placement="top"
                    >
                      <Info className="w-3 h-3 text-white/30 cursor-help" />
                    </Tooltip>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {expirationDate ? Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + ' days' : '-'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-white/40">Break-Even Price</p>
                    <Tooltip 
                      content={
                        <div className="text-xs font-light text-white/70">
                          {optionType === 'call' ? 'Strike Price + Premium' : 'Strike Price - Premium'}
                        </div>
                      }
                      placement="top"
                    >
                      <Info className="w-3 h-3 text-white/30 cursor-help" />
                    </Tooltip>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {strikePrice && premium ? 
                      `$${(optionType === 'call' 
                        ? (Number(strikePrice) + Number(premium))
                        : (Number(strikePrice) - Number(premium))).toFixed(2)}` 
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-white/40">Est. Max Profit</p>
                    <Tooltip 
                      content={
                        <div className="text-xs font-light text-white/70 max-w-xs">
                          Maximum profit earned if the option expires worthless to the buyer. This is an estimate and may not be accurate!
                        </div>
                      }
                      placement="top"
                    >
                      <Info className="w-3 h-3 text-white/30 cursor-help" />
                    </Tooltip>
                  </div>
                  <p className="text-sm font-medium text-green-400">
                    {premium && quantity ? `$${(Number(premium) * quantity * 100).toFixed(2)}` : '-'}
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

    </motion.div>
  );
}
