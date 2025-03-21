/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { format } from "date-fns";
import { OptionOrder } from "@/types/order";
import { calculateOption } from '@/lib/option-pricing-model/black-scholes-model';
import { AssetSelector } from './asset-selector';
import { OptionTypeSelector } from './option-type-select';
import { ExpirationDatePicker } from './expiration-date-select';
import { StrikePriceInput } from './strike-price-input';
import { PremiumDisplay } from './premium-display';
import { QuantityInput } from './quantity-input';
import { EDIT_REFRESH_INTERVAL } from '@/constants/option-lab/constants';
import { Button } from "@/components/ui/button";
import { MakerSummary } from "./maker-summary";
import { CollateralProvider, CollateralState } from "./collateral-provider";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { SOL_PH_VOLATILITY, SOL_PH_RISK_FREE_RATE } from "@/constants/constants";
import { useAssetPrice, useAssetPriceInfo } from "@/context/asset-price-provider";

const formSchema = z.object({
  asset: z.enum(["SOL", "LABS"]),
  optionType: z.enum(["call", "put"]),
  expirationDate: z.date({
    required_error: "Expiration date is required",
  }),
  strikePrice: z.coerce.number().min(0, {
    message: "Strike price must be a positive number",
  }),
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
    .int({ message: "Quantity must be a whole number" })
    .min(1, { message: "Quantity must be at least 1" })
    .max(100, { message: "Quantity must be at most 100" })
});

export function OptionLabForm() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingOptions, setPendingOptions] = useState<Array<z.infer<typeof formSchema>>>([]);

  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      asset: "SOL",
      optionType: "call",
      strikePrice: 0,
      premium: '',
      quantity: 1,
      expirationDate: undefined,
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

  const calculateOptionPrice = async (values: z.infer<typeof formSchema>) => {
    console.log('Calculating option price for values:', values);
    if (isCalculatingPremium) {
      console.log('Calculation already in progress, skipping');
      return;
    }
    
    if (!assetPrice || !values.expirationDate) {
      console.log('Missing spot price or expiration date, cannot calculate');
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
        strikePrice: Number(values.strikePrice),
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
    const strikePrice = values.strikePrice;
    if (strikePrice) {
      debounceTimer.current = setTimeout(() => {
        if (!values.expirationDate) {
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
  }, [methods.watch('strikePrice'), methods.watch('expirationDate'), assetPrice]);

  useEffect(() => {
    if (calculatedPrice !== null) {
      methods.setValue('premium', calculatedPrice.toFixed(4), { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
    }
  }, [calculatedPrice, methods]);

  const addOptionToSummary = async () => {
    const values = methods.getValues();
    if (!values.strikePrice || !values.expirationDate) {
      methods.setError('root', { 
        message: 'Please fill in all required fields' 
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey || pendingOptions.length === 0) return;
    setIsSubmitting(true);
    try {
      // Create options but don't add them to a store
      const createdOptions = pendingOptions.map(values => {
        const newOption: OptionOrder = {
          publicKey: new PublicKey(Keypair.generate().publicKey),
          strike: Number(values.strikePrice),
          price: Number(values.premium),
          bidPrice: 0,
          askPrice: Number(values.premium),
          type: 'sell',
          optionSide: values.optionType,
          timestamp: new Date(),
          owner: publicKey,
          status: 'pending',
          size: values.quantity,
          expirationDate: format(values.expirationDate, 'yyyy-MM-dd')
        };
        return newOption;
      });
      
      // Log created options instead of adding to store (as requested, don't send data anywhere yet)
      console.log('Options created:', createdOptions);
      
      // Clear pending options but keep the form values
      setPendingOptions([]);
      
      // Remove navigation to trade page
      // router.push("/trade");
    } catch (error) {
      console.error('Error minting options:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const manualRefresh = () => {
    console.log('Manual refresh triggered');
    const values = methods.getValues();
    if (values.strikePrice && values.expirationDate) {
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
    <div className="mx-auto max-w-[1400px] w-full px-6">
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} className="space-y-8">
          <div className="grid grid-cols-12 gap-4">
            {/* Left side - Option Form */}
            <div className="col-span-3">
              <Card className="h-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5 
                transition-all duration-300 hover:bg-transparent overflow-hidden shadow-lg">
                <CardContent className="space-y-6">
                  <AssetSelector assetPrice={assetPrice} />
                  <OptionTypeSelector />
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <ExpirationDatePicker />
                    </div>
                    <div className="flex-1">
                      <StrikePriceInput assetPrice={assetPrice} />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <PremiumDisplay lastUpdated={lastUpdated} manualRefresh={manualRefresh} isDebouncing={isDebouncing} />
                    </div>
                    <div className="flex-1">
                      <QuantityInput />
                    </div>
                  </div>
                  
                  {/* Moved buttons to the bottom of the card with added margin-top for spacing */}
                  <div className="flex flex-col justify-center gap-2 mt-auto">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={addOptionToSummary}
                      className="px-6 bg-[#4a85ff]/10 border border-[#4a85ff]/40 dark:border-[#4a85ff]/40
                        hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60 hover:scale-[0.98]
                        backdrop-blur-sm
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        disabled:hover:bg-[#4a85ff]/10 disabled:hover:border-[#4a85ff]/40
                        disabled:hover:scale-100"
                      disabled={
                        !methods.getValues("strikePrice") || 
                        !methods.getValues("premium") ||
                        !methods.getValues("expirationDate")
                      }
                    >
                      {pendingOptions.length > 0 ? "Update Option" : "Add Option"}
                    </Button>

                    {/* Horizontal divider */}
                    <div className="h-px w-full bg-[#e5e5e5]/20 dark:bg-[#393939]/50 my-3"></div>

                    {/* Option Contract Display */}
                    {pendingOptions.length > 0 && pendingOptions[pendingOptions.length - 1] && (
                      <div 
                        className={cn(
                          "group flex items-center justify-between py-1 px-2 mt-1",
                          "backdrop-blur-sm bg-white/5 dark:bg-black/20",
                          "border border-[#e5e5e5]/50 dark:border-[#393939] rounded-lg",
                          "hover:bg-[#4a85ff]/5 hover:border-[#4a85ff]/40",
                          "transition-all duration-200 hover:shadow-[0_0_15px_rgba(74,133,255,0.2)]"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-semibold tracking-tight">
                              {pendingOptions[pendingOptions.length - 1].quantity}
                            </span>
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500/10 text-red-500 rounded-md text-[10px]">SHORT</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium">
                              {pendingOptions[pendingOptions.length - 1].asset} {pendingOptions[pendingOptions.length - 1].optionType.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground font-normal">
                              ${Number(pendingOptions[pendingOptions.length - 1].strikePrice).toFixed(2)} Strike @ {Number(pendingOptions[pendingOptions.length - 1].premium).toFixed(4)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOptionFromSummary(pendingOptions.length - 1)}
                          className="h-6 w-6 p-0 transition-colors duration-200 
                            hover:bg-destructive/20 hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right side - Maker Summary & Collateral Provider */}
            <div className="col-span-9"> 
              <div className="grid grid-cols-9 gap-4">
                {/* Maker Summary - PnL Chart */}
                <div className="col-span-6">
                  <MakerSummary 
                    options={pendingOptions}
                    onRemoveOption={removeOptionFromSummary}
                    collateralProvided={Number(collateralState.collateralProvided) || 0}
                    leverage={collateralState.leverage}
                    assetPrice={assetPrice}
                  />
                  {pendingOptions.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Please add at least 1 option contract to the summary before minting!
                    </p>
                  )}
                </div>
                
                {/* Collateral Provider */}
                <div className="col-span-3">
                  <CollateralProvider 
                    options={pendingOptions}
                    onStateChange={handleCollateralStateChange}
                    onMint={onSubmit}
                    isSubmitting={isSubmitting}
                    hasValidationError={!!methods.formState.errors.root}
                    hasPendingOptions={pendingOptions.length > 0}
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
} 