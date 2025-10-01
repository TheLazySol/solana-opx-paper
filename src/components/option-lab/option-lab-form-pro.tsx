"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useWallet } from '@solana/wallet-adapter-react';
import { address } from 'gill';
import { Keypair } from '@solana/web3.js';
import { format, addDays } from 'date-fns';
import { OptionOrder } from '@/types/options/optionTypes';
import { OptionLabWizard } from './option-lab-wizard';
import { useAssetPriceInfo } from '@/context/asset-price-provider';
import { motion } from 'framer-motion';
import { getWeeklyFridayDates, startDate, endDate } from '@/constants/constants';
import { OptionSuccessModal } from './option-success-modal';

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
  quantity: z.union([
    z.string().refine((val) => val === '', { message: "Quantity is required" }),
    z.coerce.number().min(0.01, { message: "Quantity must be at least 0.01" }).max(10000, { message: "Quantity must be at most 10,000" })
  ])
});

// Helper function for getting next available weekly Friday date
function getNextAvailableWeeklyDate(): Date {
  const allowedDates = getWeeklyFridayDates(startDate, endDate);
  
  const now = new Date();
  const nextAvailableDate = allowedDates.find(date => date > now);
  
  return nextAvailableDate || allowedDates[0];
}

export function OptionLabFormPro() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOptionDetails, setSuccessOptionDetails] = useState<{
    token: string;
    type: 'Call' | 'Put';
    direction: 'Long' | 'Short';
    strikePrice: number;
    premium: number;
    quantity: number;
    expirationDate: string;
    totalValue: number;
    transactionHash?: string;
  } | null>(null);
  
  const defaultExpirationDate = getNextAvailableWeeklyDate();

  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      asset: "SOL",
      optionType: "call",
      strikePrice: '',
      premium: '',
      quantity: '',
      expirationDate: defaultExpirationDate,
    },
  });

  const selectedAsset = methods.watch('asset');
  const { price: assetPrice } = useAssetPriceInfo(selectedAsset);

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!publicKey) return;
    
    const values = methods.getValues();
    
    // Ensure valid quantity
    const quantityNum = typeof values.quantity === 'string' ? parseFloat(values.quantity) : values.quantity;
    if (isNaN(quantityNum) || quantityNum < 0.01) {
      methods.setError('quantity', {
        message: 'Quantity must be at least 0.01'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create option order
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
      
      // Save to localStorage for orders view
      const formattedPosition = {
        asset: values.asset,
        marketPrice: assetPrice || 0,
        id: `${values.asset}-${Date.now()}`,
        legs: [{
          type: values.optionType === 'call' ? 'Call' : 'Put',
          strike: Number(values.strikePrice),
          expiry: format(values.expirationDate, 'yyyy-MM-dd'),
          position: -1 * Number(values.quantity),
          marketPrice: Number(values.premium),
          entryPrice: Number(values.premium),
          underlyingEntryPrice: assetPrice || 0,
          delta: 0,
          theta: 0,
          gamma: 0,
          vega: 0,
          rho: 0,
          collateral: 0,
          value: -1 * Number(values.premium) * 100 * Number(values.quantity),
          pnl: 0,
          status: 'pending'
        }],
        netDelta: 0,
        netTheta: 0,
        netGamma: 0,
        netVega: 0,
        netRho: 0,
        totalCollateral: 0,
        totalValue: -1 * Number(values.premium) * 100 * Number(values.quantity),
        totalPnl: 0
      };
      
      // Get existing orders and combine
      const existingOrdersJSON = localStorage.getItem('openOrders');
      const existingOrders = existingOrdersJSON ? JSON.parse(existingOrdersJSON) : [];
      const allOrders = [...existingOrders, formattedPosition];
      localStorage.setItem('openOrders', JSON.stringify(allOrders));
      
      // Also save minted option data
      const mintedOption = {
        asset: values.asset,
        strike: Number(values.strikePrice),
        expiry: format(values.expirationDate, 'yyyy-MM-dd'),
        price: Number(values.premium),
        quantity: Number(values.quantity),
        side: values.optionType,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      const existingMintedJSON = localStorage.getItem('mintedOptions');
      const existingMinted = existingMintedJSON ? JSON.parse(existingMintedJSON) : [];
      localStorage.setItem('mintedOptions', JSON.stringify([...existingMinted, mintedOption]));
      
      console.log('Option created:', newOption);
      
      // Prepare success modal data
      const optionDetails = {
        token: values.asset,
        type: (values.optionType === 'call' ? 'Call' : 'Put') as 'Call' | 'Put',
        direction: 'Short' as 'Long' | 'Short', // Since we're minting/selling options
        strikePrice: Number(values.strikePrice),
        premium: Number(values.premium),
        quantity: Number(values.quantity),
        expirationDate: format(values.expirationDate, 'MMM dd, yyyy'),
        totalValue: Number(values.premium) * Number(values.quantity) * 100,
        transactionHash: `mock_tx_${Date.now()}` // Replace with actual transaction hash when available
      };
      
      setSuccessOptionDetails(optionDetails);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error minting option:', error);
      methods.setError('root', { 
        message: 'Failed to mint option. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setSuccessOptionDetails(null);
    // Navigate to trade page with orders view
    router.push("/trade?view=orders&tab=open");
  };

  return (
    <FormProvider {...methods}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <OptionLabWizard
          assetPrice={assetPrice}
          onSubmitAction={onSubmit}
          isSubmitting={isSubmitting}
        />
        
        <OptionSuccessModal
          isOpen={showSuccessModal}
          onOpenChange={handleSuccessModalClose}
          optionDetails={successOptionDetails}
        />
      </motion.div>
    </FormProvider>
  );
}
