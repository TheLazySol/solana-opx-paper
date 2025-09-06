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
import { motion, AnimatePresence } from 'framer-motion';
import { getWeeklyFridayDates, startDate, endDate } from '@/constants/constants';
import { StepConfigureDegen } from './wizard-steps/step-configure-degen';
import { StepCollateral, StepReview } from './wizard-steps';
import { Card, CardBody, Button, Progress, Switch, cn } from '@heroui/react';
import { ChevronLeft, ChevronRight, Check, Circle, DollarSign, FileCheck } from 'lucide-react';
import { CollateralState } from './collateral-provider';

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
    .min(0.01, { message: "Quantity must be at least 0.01" })
    .max(10000, { message: "Quantity must be at most 10,000" })
});

// Helper function for getting next available weekly Friday date
function getNextAvailableWeeklyDate(): Date {
  const allowedDates = getWeeklyFridayDates(startDate, endDate);
  
  const now = new Date();
  const nextAvailableDate = allowedDates.find(date => date > now);
  
  return nextAvailableDate || allowedDates[0];
}

interface WizardStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const steps: WizardStep[] = [
  {
    id: 'configure',
    title: 'Build Your Option',
    subtitle: 'Step by step configuration',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
      </svg>
    )
  },
  {
    id: 'collateral',
    title: 'Add Collateral',
    subtitle: 'Back your option',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z"/>
      </svg>
    )
  },
  {
    id: 'review',
    title: 'Review & Create',
    subtitle: 'Confirm your option',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
      </svg>
    )
  }
];

export function OptionLabFormDegen() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [collateralState, setCollateralState] = useState<CollateralState>({
    hasEnoughCollateral: false,
    collateralProvided: "0",
    leverage: 1,
    collateralType: 'SOL',
    borrowCost: 0,
    optionCreationFee: 0,
    borrowFee: 0,
    transactionCost: 0,
    maxProfitPotential: 0
  });
  
  const defaultExpirationDate = getNextAvailableWeeklyDate();

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

  const selectedAsset = methods.watch('asset');
  const { price: assetPrice } = useAssetPriceInfo(selectedAsset);
  const formValues = methods.watch();

  const canProceed = (step: number): boolean => {
    switch (step) {
      case 0: // Configure step
        return !!(
          formValues.strikePrice && 
          formValues.strikePrice !== '' &&
          formValues.premium &&
          formValues.expirationDate &&
          formValues.quantity >= 0.01
        );
      case 1: // Collateral step
        return collateralState.hasEnoughCollateral;
      case 2: // Review step
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1 && canProceed(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!publicKey) return;
    
    const values = methods.getValues();
    
    // Ensure valid quantity
    if (values.quantity < 0.01) {
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
      
      // Navigate to trade page with orders view
      router.push("/trade?view=orders&tab=open");
    } catch (error) {
      console.error('Error minting option:', error);
      methods.setError('root', { 
        message: 'Failed to mint option. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...methods}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-7xl mx-auto px-4"
      >
          <Card className="bg-black/40 backdrop-blur-xl border border-white/10">
            <CardBody className="p-6 md:p-8 space-y-6">
              {/* Progress Bar */}
              <div className="space-y-4">
                <Progress
                  value={((currentStep + 1) / steps.length) * 100}
                  className="h-2"
                  classNames={{
                    indicator: "bg-gradient-to-r from-[#4a85ff] to-[#5829f2]"
                  }}
                />
                
                {/* Step Indicators */}
                <div className="flex justify-between">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={cn(
                        "flex flex-col items-center cursor-pointer transition-all",
                        index <= currentStep ? "opacity-100" : "opacity-50"
                      )}
                      onClick={() => index < currentStep && setCurrentStep(index)}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all",
                        index === currentStep
                          ? "bg-gradient-to-r from-[#4a85ff] to-[#5829f2] text-white"
                          : index < currentStep
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/10 text-white/50"
                      )}>
                        {index < currentStep ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-white hidden md:block">
                        {step.title}
                      </h3>
                      <p className="text-xs text-white/60 hidden md:block">
                        {step.subtitle}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                  {currentStep === 0 && (
                    <motion.div
                      key="configure"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                    >
                      <StepConfigureDegen assetPrice={assetPrice} />
                    </motion.div>
                  )}
                  
                  {currentStep === 1 && (
                    <motion.div
                      key="collateral"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                    >
                      <StepCollateral 
                        proMode={false}
                        onStateChangeAction={setCollateralState}
                      />
                    </motion.div>
                  )}
                  
                  {currentStep === 2 && (
                    <motion.div
                      key="review"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                    >
                      <StepReview 
                        assetPrice={assetPrice} 
                        collateralState={collateralState}
                        proMode={false}
                        isSubmitting={isSubmitting}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <Button
                  variant="bordered"
                  onClick={handlePrevious}
                  isDisabled={currentStep === 0}
                  startContent={<ChevronLeft className="w-4 h-4" />}
                  className="border-white/20 hover:bg-white/5"
                >
                  Previous
                </Button>
                
                {currentStep < steps.length - 1 ? (
                  <Button
                    color="primary"
                    onClick={handleNext}
                    isDisabled={!canProceed(currentStep)}
                    endContent={<ChevronRight className="w-4 h-4" />}
                    className="bg-gradient-to-r from-[#4a85ff] to-[#5829f2] text-white"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    color="success"
                    onClick={onSubmit}
                    isLoading={isSubmitting}
                    isDisabled={!publicKey || !canProceed(currentStep)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  >
                    {!publicKey ? 'Connect Wallet' : 'Create Option'}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </motion.div>
    </FormProvider>
  );
}
