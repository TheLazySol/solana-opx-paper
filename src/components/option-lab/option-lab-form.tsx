/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWallet } from "@solana/wallet-adapter-react";
import { Address, address } from 'gill';
import { Keypair } from '@solana/web3.js';
import { format, addDays } from "date-fns";
import { OptionOrder } from "@/types/options/optionTypes";
import { calculateOption } from '@/lib/option-pricing-model/blackScholesModel';
import { AssetSelector } from './asset-selector';
import { OptionTypeSelector } from './option-type-select';
import { ExpirationDatePicker } from './expiration-date-select';
import { StrikePriceInput } from './strike-price-input';
import { PremiumDisplay } from './premium-display';
import { QuantityInput } from './quantity-input';
import { EDIT_REFRESH_INTERVAL } from '@/constants/constants';
import { 
  Button, 
  Card, 
  CardBody, 
  CardHeader, 
  Chip,
  cn
} from "@heroui/react";
import { MakerSummary } from "./maker-summary";
import { CollateralProvider, CollateralState } from "./collateral-provider";
import { X, Plus, TrendingDown } from "lucide-react";
import { SOL_PH_VOLATILITY, SOL_PH_RISK_FREE_RATE } from "@/constants/constants";
import { useAssetPriceInfo } from "@/context/asset-price-provider";
import Image from "next/image";
import { motion } from 'framer-motion';

const formSchema = z.object({
  asset: z.enum(["SOL", "LABS"]),
  optionType: z.enum(["call", "put"]),
  expirationDate: z.date({
    required_error: "Expiration date is required",
  }),
  strikePrice: z.union([
    z.string().min(1, { message: "Strike price is required" }),
    z.coerce.number().min(0, {
      message: "Strike price must be a positive number",
    })
  ]),
  premium: z.string().refine(
    (val) => {
      if (val === '') return true;
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Premium must be a valid number" }
  ),
  quantity: z.coerce
    .number()
    .min(0, { message: "Quantity must be at least 0.01" })
    .max(10000, { message: "Quantity must be at most 10,000" })
});

// Helper functions for getting bi-weekly dates (same as in expiration-date-select.tsx)
function getBiWeeklyDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 14);
  }
  return dates;
}

// Helper function to get the next available bi-weekly date from the allowed dates
function getNextAvailableBiWeeklyDate(): Date {
  const startDate = new Date(2025, 0, 1); // January 1st, 2025
  const endDate = new Date(2026, 0, 1);   // January 1st, 2026
  const allowedDates = getBiWeeklyDates(startDate, endDate);
  
  // Find the first date that is in the future
  const now = new Date();
  const nextAvailableDate = allowedDates.find(date => date > now);
  
  // Return the next available date or default to the first date in the sequence
  return nextAvailableDate || allowedDates[0];
}

export function OptionLabForm() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingOptions, setPendingOptions] = useState<Array<z.infer<typeof formSchema>>>([]);

  // Get the next available expiration date
  const defaultExpirationDate = getNextAvailableBiWeeklyDate();

  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      asset: "SOL",
      optionType: "call",
      strikePrice: '',
      premium: '',
      quantity: 1.00,
      expirationDate: defaultExpirationDate,
    },
  });

  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [isCalculatingPremium, setIsCalculatingPremium] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get the selected asset from form
  const selectedAsset = methods.watch('asset');
  
  // Get asset price from context
  const { price: assetPrice, priceChange: priceChangeDirection } = useAssetPriceInfo(selectedAsset);

  // State for collateral information
  const [collateralState, setCollateralState] = useState<CollateralState>({
    hasEnoughCollateral: false,
    collateralProvided: "0",
    leverage: 1,
    collateralType: methods.getValues('asset'), // Use the selected asset from the form
    borrowCost: 0, // Will be calculated properly by CollateralProvider
    optionCreationFee: 0,
    borrowFee: 0,
    transactionCost: 0,
    maxProfitPotential: 0
  });

  // Use useWatch instead of methods.watch in dependency array
  const strikePrice = useWatch({ control: methods.control, name: 'strikePrice' });
  const expirationDate = useWatch({ control: methods.control, name: 'expirationDate' });

  const calculateOptionPrice = async (values: z.infer<typeof formSchema>) => {
    console.log('Calculating option price for values:', values);
    if (isCalculatingPremium) {
      console.log('Calculation already in progress, skipping');
      return;
    }
    
    if (!assetPrice || !values.expirationDate || !values.strikePrice || values.strikePrice === '') {
      console.log('Missing spot price, expiration date, or strike price, cannot calculate');
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
      
      // Update the form values synchronously
      methods.setValue('premium', premium.toString(), {
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
  };

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
  }, [strikePrice, expirationDate, assetPrice]);

  useEffect(() => {
    if (calculatedPrice !== null) {
      methods.setValue('premium', calculatedPrice.toFixed(2), { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
    }
  }, [calculatedPrice, methods]);

  const addOptionToSummary = async () => {
    const values = methods.getValues();
    if (!values.strikePrice || values.strikePrice === '' || !values.expirationDate) {
      methods.setError('root', { 
        message: 'Please fill in all required fields' 
      });
      return;
    }
    
    // Ensure quantity is at least 0.01
    if (values.quantity < 0.01) {
      methods.setError('quantity', {
        message: 'Quantity must be at least 0.01 to create an option'
      });
      return;
    }
    
    if (isCalculatingPremium || calculatedPrice === null) {
      methods.setError('root', { 
        message: 'Please wait for premium calculation to complete' 
      });
      return;
    }

    try {
      setIsDebouncing(true);
      // Calculate new premium first
      await calculateOptionPrice(values);
      
      // Get the updated values with new premium
      const updatedValues = methods.getValues();
      
      // Update pending options with the latest values
      setPendingOptions([updatedValues]);
      
      // Clear any form errors
      methods.clearErrors('root');
    } catch (error) {
      console.error('Error updating option:', error);
      methods.setError('root', { 
        message: 'Error updating option premium' 
      });
    } finally {
      setIsDebouncing(false);
    }
  };

  const removeOptionFromSummary = (index: number) => {
    setPendingOptions(prev => prev.filter((_, i) => i !== index));
  };

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!publicKey || pendingOptions.length === 0) return;
    
    // Ensure all options have valid quantities
    const hasInvalidQuantity = pendingOptions.some(option => option.quantity < 0.01);
    if (hasInvalidQuantity) {
      methods.setError('quantity', {
        message: 'All options must have a quantity of at least 0.01'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create options but don't add them to a store
      const createdOptions = pendingOptions.map(values => {
        const newOption: OptionOrder = {
          publicKey: address(new Keypair().publicKey.toString()),
          strike: typeof values.strikePrice === 'string' ? Number(values.strikePrice) : Number(values.strikePrice),
          price: Number(values.premium),
          bidPrice: 0,
          askPrice: Number(values.premium),
          type: 'sell',
          optionSide: values.optionType,
          timestamp: new Date(),
          owner: address(publicKey.toString()),
          status: 'pending',
          size: Number(values.quantity),
          expirationDate: format(values.expirationDate, 'yyyy-MM-dd')
        };
        return newOption;
      });
      
      // Save options to localStorage for orders-view-open.tsx
      try {
        // Format option leg for the orders view
        const formattedPositions = pendingOptions.map((option, index) => {
          const currentAssetPrice = assetPrice || 0;
          
          // Create an AssetPosition object for each created option
          return {
            asset: option.asset,
            marketPrice: currentAssetPrice,
            id: `${option.asset}-${Date.now()}-${index}`,
            legs: [{
              type: option.optionType === 'call' ? 'Call' : 'Put',
              strike: typeof option.strikePrice === 'string' ? Number(option.strikePrice) : Number(option.strikePrice),
              expiry: format(option.expirationDate, 'yyyy-MM-dd'),
              position: -1 * Number(option.quantity), // Negative to represent short position
              marketPrice: Number(option.premium),
              entryPrice: Number(option.premium),
              underlyingEntryPrice: currentAssetPrice,
              delta: 0, // Will be calculated in orders-view-open
              theta: 0,
              gamma: 0,
              vega: 0,
              rho: 0,
              collateral: 0,
              value: -1 * Number(option.premium) * 100 * Number(option.quantity), // Negative value for short
              pnl: 0,
              status: 'pending' // Add status field
            }],
            netDelta: 0,
            netTheta: 0,
            netGamma: 0,
            netVega: 0,
            netRho: 0,
            totalCollateral: 0,
            totalValue: -1 * Number(option.premium) * 100 * Number(option.quantity),
            totalPnl: 0
          };
        });
        
        // Get existing open orders, if any
        const existingOrdersJSON = localStorage.getItem('openOrders');
        const existingOrders = existingOrdersJSON ? JSON.parse(existingOrdersJSON) : [];
        
        // Combine with new orders
        const allOrders = [...existingOrders, ...formattedPositions];
        
        // Save to localStorage
        localStorage.setItem('openOrders', JSON.stringify(allOrders));
        
        // Also save the mint data to a separate localStorage key for the option chain to access
        const mintedOptions = pendingOptions.map(option => ({
          asset: option.asset,
          strike: typeof option.strikePrice === 'string' ? Number(option.strikePrice) : Number(option.strikePrice),
          expiry: format(option.expirationDate, 'yyyy-MM-dd'),
          price: Number(option.premium),
          quantity: Number(option.quantity),
          side: option.optionType,
          timestamp: new Date().toISOString(),
          status: 'pending'
        }));
        
        const existingMintedJSON = localStorage.getItem('mintedOptions');
        const existingMinted = existingMintedJSON ? JSON.parse(existingMintedJSON) : [];
        localStorage.setItem('mintedOptions', JSON.stringify([...existingMinted, ...mintedOptions]));
        
      } catch (error) {
        console.error('Error saving options to localStorage:', error);
      }
      
      // Log created options 
      console.log('Options created:', createdOptions);
      
      // Clear pending options but keep the form values
      setPendingOptions([]);
      
      // Navigate to trade page with query params to activate the orders tab and open positions
      router.push("/trade?view=orders&tab=open");
    } catch (error) {
      console.error('Error minting options:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const manualRefresh = () => {
    console.log('Manual refresh triggered');
    const values = methods.getValues();
    if (values.strikePrice && values.strikePrice !== '' && values.expirationDate) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      setIsDebouncing(true);
      setTimeout(async () => {
        try {
          await calculateOptionPrice(values);
        } finally {
          setIsDebouncing(false);
        }
      }, EDIT_REFRESH_INTERVAL); // 1.5 second delay
    }
  };

  // Handle collateral state changes
  const handleCollateralStateChange = (state: CollateralState) => {
    setCollateralState(state);
    // We're no longer setting form validation errors to prevent disabling the Add/Update Option button
  };

  return (
    <div className="mx-auto max-w-[1400px] w-full px-4 sm:px-6">
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Container for all components */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col space-y-6"
          >
            {/* 1. PnL Chart & Maker Summary at the top - Full width on all screens */}
            <div className="w-full">
              <MakerSummary 
                options={pendingOptions}
                onRemoveOption={removeOptionFromSummary}
                collateralProvided={Number(collateralState.collateralProvided) || 0}
                leverage={collateralState.leverage}
                assetPrice={assetPrice}
              />
              {pendingOptions.length === 0 && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-white/60 mt-4 text-center"
                >
                  Please add at least 1 option contract to the summary before minting!
                </motion.p>
              )}
            </div>
            
            {/* 2. Form Controls (Option inputs + Collateral Provider) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Option Form Inputs - Left side on desktop, top on mobile */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="col-span-1 lg:col-span-7"
              >
                <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl h-full">
                  <CardHeader className="pb-2">
                    <h3 className="text-lg font-semibold bg-gradient-to-r from-[#4a85ff] to-[#5829f2] bg-clip-text text-transparent">
                      Option Configuration
                    </h3>
                  </CardHeader>
                  <CardBody className="gap-4">
                    {/* Top row: Asset and Option Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <AssetSelector assetPrice={assetPrice} />
                      <OptionTypeSelector />
                    </div>
                    
                    {/* Middle row: Expiration and Strike */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ExpirationDatePicker />
                      <StrikePriceInput assetPrice={assetPrice} />
                    </div>
                    
                    {/* Bottom row: Premium and Quantity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <PremiumDisplay lastUpdated={lastUpdated} manualRefresh={manualRefresh} isDebouncing={isDebouncing} />
                      <QuantityInput />
                    </div>
                    
                    {/* Add/Update Option Button */}
                    <div className="flex flex-col justify-center mt-4">
                      <Button 
                        onPress={addOptionToSummary}
                        className={cn(
                          "w-full h-11 font-semibold transition-all duration-300",
                          (!methods.getValues("strikePrice") || 
                           methods.getValues("strikePrice") === "" ||
                           !methods.getValues("premium") ||
                           !methods.getValues("expirationDate") ||
                           methods.getValues("quantity") < 0.01)
                            ? "bg-white/10 text-white/40 border border-white/20"
                            : "bg-gradient-to-r from-[#4a85ff] to-[#5829f2] text-white shadow-lg shadow-[#4a85ff]/25 hover:shadow-[#4a85ff]/40 hover:scale-[1.02] active:scale-[0.98]"
                        )}
                        isDisabled={
                          !methods.getValues("strikePrice") || 
                          methods.getValues("strikePrice") === "" ||
                          !methods.getValues("premium") ||
                          !methods.getValues("expirationDate") ||
                          methods.getValues("quantity") < 0.01
                        }
                        startContent={<Plus className="w-4 h-4" />}
                      >
                        {pendingOptions.length > 0 ? "Update Option" : "Add Option"}
                      </Button>
                    </div>

                    {/* Option Contract Display - Only show when options exist */}
                    {pendingOptions.length > 0 && pendingOptions[pendingOptions.length - 1] && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-200">
                          <CardBody className="p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                {pendingOptions[pendingOptions.length - 1].asset.toUpperCase() === 'SOL' && (
                                  <Image 
                                    src="/token-logos/solana_logo.png" 
                                    alt="Solana" 
                                    width={24} 
                                    height={24}
                                    className="rounded-full"
                                  />
                                )}
                                <Chip size="sm" variant="flat" className="bg-white/10">
                                  {pendingOptions[pendingOptions.length - 1].asset}
                                </Chip>
                                <Chip 
                                  size="sm" 
                                  variant="flat"
                                  className="bg-red-500/20 text-red-400 font-medium"
                                  startContent={<TrendingDown className="w-3 h-3" />}
                                >
                                  Short {pendingOptions[pendingOptions.length - 1].optionType}
                                </Chip>
                                <Chip 
                                  size="sm" 
                                  variant="flat" 
                                  className="bg-blue-500/20 text-blue-400"
                                >
                                  ${Number(pendingOptions[pendingOptions.length - 1].strikePrice).toFixed(2)}
                                </Chip>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Chip 
                                  size="sm" 
                                  variant="flat" 
                                  className="bg-purple-500/20 text-purple-400"
                                >
                                  EXP: {format(pendingOptions[pendingOptions.length - 1].expirationDate, 'yyyy-MM-dd')}
                                </Chip>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  className="text-white/60 hover:text-red-400 hover:bg-red-500/10"
                                  onPress={() => removeOptionFromSummary(pendingOptions.length - 1)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white/60">Premium:</span>
                                <span className="text-sm font-medium text-red-400">
                                  ${Number(pendingOptions[pendingOptions.length - 1].premium).toFixed(2)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white/60">Qty:</span>
                                <span className="text-sm font-medium text-white">
                                  {Number(pendingOptions[pendingOptions.length - 1].quantity).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      </motion.div>
                    )}
                  </CardBody>
                </Card>
              </motion.div>
              
              {/* Collateral Provider - Right side on desktop, bottom on mobile */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="col-span-1 lg:col-span-5"
              >
                <CollateralProvider 
                  options={pendingOptions}
                  onStateChange={handleCollateralStateChange}
                  onMint={onSubmit}
                  isSubmitting={isSubmitting}
                  hasValidationError={!!methods.formState.errors.root}
                  hasPendingOptions={pendingOptions.length > 0}
                />
              </motion.div>
            </div>
          </motion.div>
        </form>
      </FormProvider>
    </div>
  );
}