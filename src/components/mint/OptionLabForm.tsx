/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { format } from "date-fns";
import { useOptionsStore } from "@/stores/options/optionsStore";
import { OptionOrder } from "@/types/options/orderTypes";
import { calculateOption } from '@/lib/tests/option-calculator';
import { getTokenPrice } from '@/lib/api/getTokenPrice';
import { AssetSelector } from './AssetSelector';
import { OptionTypeSelector } from './OptionTypeSelector';
import { ExpirationDatePicker } from './ExpirationDatePicker';
import { StrikePriceInput } from './StrikePriceInput';
import { PremiumDisplay } from './PremiumDisplay';
import { QuantityInput } from './QuantityInput';
import { EDIT_REFRESH_INTERVAL, AUTO_REFRESH_INTERVAL } from '@/constants/mint/constants';
import { Button } from "@/components/ui/button";
import { MakerSummary, MakerSummaryState } from "./MakerSummary";
import { cn } from "@/lib/misc/utils";

const formSchema = z.object({
  asset: z.enum(["SOL", "LABS"]),
  optionType: z.enum(["call", "put"]),
  expirationDate: z.date({
    required_error: "Expiration date is required",
  }),
  strikePrice: z.string().refine(val => val !== '', {
    message: "Strike price is required",
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
  const addOption = useOptionsStore((state) => state.addOption);
  const [pendingOptions, setPendingOptions] = useState<Array<z.infer<typeof formSchema>>>([]);

  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      asset: "SOL",
      optionType: "call",
      strikePrice: '',
      premium: '',
      quantity: 1,
      expirationDate: undefined,
    },
  });

  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [isCalculatingPremium, setIsCalculatingPremium] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const [assetPrice, setAssetPrice] = useState<number | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const calculateOptionPrice = async (values: z.infer<typeof formSchema>) => {
    console.log('Calculating option price for values:', values);
    if (isCalculatingPremium) {
      console.log('Calculation already in progress, skipping');
      return;
    }
    const spotPrice = await getTokenPrice(values.asset);
    if (!spotPrice || !values.expirationDate) {
      console.log('Missing spot price or expiration date, cannot calculate');
      return;
    }
    setIsCalculatingPremium(true);
    const timeUntilExpiry = Math.floor(
      (values.expirationDate.getTime() - Date.now()) / 1000
    );
    try {
      const volatility = 0.35;
      const riskFreeRate = 0.08;
      const result = await calculateOption({
        isCall: values.optionType === 'call',
        strikePrice: Number(values.strikePrice),
        spotPrice: spotPrice.price,
        timeUntilExpirySeconds: timeUntilExpiry,
        volatility,
        riskFreeRate
      });
      const premium = result.price;
      setCalculatedPrice(premium);
      methods.setValue('premium', premium.toString());
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error calculating option:', error);
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
  }, [methods.watch('strikePrice'), methods.watch('expirationDate')]);

  useEffect(() => {
    if (calculatedPrice !== null) {
      methods.setValue('premium', calculatedPrice.toFixed(4), { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
    }
  }, [calculatedPrice, methods]);

  useEffect(() => {
    const fetchAssetPrice = async () => {
      const values = methods.getValues();
      console.log('Fetching asset price for:', values.asset);
      const priceData = await getTokenPrice(values.asset);
      if (priceData) {
        setAssetPrice(priceData.price);
      } else {
        setAssetPrice(null);
      }
    };
    fetchAssetPrice();
    const priceInterval = setInterval(fetchAssetPrice, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(priceInterval);
  }, [methods.watch('asset')]);

  const addOptionToSummary = () => {
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
    
    // Limit to only one option at a time
    if (pendingOptions.length >= 1) {
      // Replace the existing option instead of adding a new one
      setPendingOptions([values]);
    } else {
      setPendingOptions([values]);
    }
    
    // Don't reset the form values to allow for easy editing
    setCalculatedPrice(null);
    methods.clearErrors('root');
  
    // Recalculate the premium after adding the option
    setTimeout(() => {
      manualRefresh();
    }, 500);
  };

  const removeOptionFromSummary = (index: number) => {
    setPendingOptions(prev => prev.filter((_, i) => i !== index));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey || pendingOptions.length === 0) return;
    setIsSubmitting(true);
    try {
      pendingOptions.forEach(values => {
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
        addOption(newOption);
      });
      
      // Clear pending options but keep the form values
      setPendingOptions([]);
      
      router.push("/trade");
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
      debounceTimer.current = setTimeout(() => {
        calculateOptionPrice(values);
        setIsDebouncing(false);
      }, EDIT_REFRESH_INTERVAL);
    }
  };

  return (
    <div className="mx-auto max-w-xl w-full">
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} className="space-y-8">
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
          <div className="flex justify-end">
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
                !methods.formState.isValid || 
                !methods.getValues("strikePrice") || 
                !methods.getValues("premium") ||
                !methods.getValues("expirationDate")
              }
            >
              {pendingOptions.length > 0 ? "Update Option" : "Add Option"}
            </Button>
          </div>
          <MakerSummary 
            options={pendingOptions}
            onRemoveOption={removeOptionFromSummary}
            onStateChange={useCallback((state: MakerSummaryState) => {
              const hasEnoughCollateral = state.hasEnoughCollateral;
              if (!hasEnoughCollateral && !methods.formState.errors.root) {
                methods.setError('root', {
                  message: 'Not enough collateral provided'
                });
              } else if (hasEnoughCollateral && methods.formState.errors.root) {
                methods.clearErrors('root');
              }
            }, [methods])}
          />
          {pendingOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Please add at least 1 option contract to the summary before minting!
            </p>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting || pendingOptions.length === 0 || !!methods.formState.errors.root}
            className={cn(
              "w-full bg-white/95 hover:bg-white/100 text-black border border-white/20",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/10"
            )}
          >
            {isSubmitting 
              ? "Minting..." 
              : methods.formState.errors.root 
                ? "Not Enough Collateral Provided"
                : `Mint ${pendingOptions.length} Option${pendingOptions.length !== 1 ? 's' : ''}`
            }
          </Button>
        </form>
      </FormProvider>
    </div>
  );
}