"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody, Button, Progress, Switch, cn } from '@heroui/react';
import { ChevronLeft, ChevronRight, Check, Sparkles, Rocket } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { StepConfigure, StepCollateral, StepReview } from './wizard-steps';
import { CollateralState } from './collateral-provider';

interface WizardStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const steps: WizardStep[] = [
  {
    id: 'configure',
    title: 'Configure Option',
    subtitle: 'Set your option parameters',
    icon: <Sparkles className="w-5 h-5" />
  },
  {
    id: 'collateral',
    title: 'Provide Collateral',
    subtitle: 'Set leverage and collateral',
    icon: <Rocket className="w-5 h-5" />
  },
  {
    id: 'review',
    title: 'Review & Mint',
    subtitle: 'Confirm and create your option',
    icon: <Check className="w-5 h-5" />
  }
];

interface OptionLabWizardProps {
  assetPrice: number | null;
  onSubmitAction: (e?: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function OptionLabWizard({ assetPrice, onSubmitAction, isSubmitting }: OptionLabWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [proMode, setProMode] = useState(false);
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
  
  const methods = useFormContext();
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

  const handleStepClick = (index: number) => {
    // Allow going back to previous steps or current step
    if (index <= currentStep) {
      setCurrentStep(index);
    } else if (index === currentStep + 1 && canProceed(currentStep)) {
      // Allow going to next step if current step is valid
      setCurrentStep(index);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Header with Pro Mode Toggle */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl md:text-3xl font-thin text-white mb-1">
            Create Your Option Contract
          </h2>
          <p className="text-sm text-white/60">
            Follow the steps to configure and mint your option
          </p>
        </div>
        
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10"
        >
          <span className="text-sm text-white/80">Pro Mode</span>
          <Switch
            size="sm"
            checked={proMode}
            onValueChange={setProMode}
            classNames={{
              wrapper: "group-data-[selected=true]:bg-gradient-to-r from-[#4a85ff] to-[#5829f2]",
              thumb: "group-data-[selected=true]:bg-white"
            }}
          />
        </motion.div>
      </motion.div>

      {/* Progress Steps - Mobile Optimized */}
      <div className="mb-8">
        <div className="hidden sm:flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <motion.button
                onClick={() => handleStepClick(index)}
                className={cn(
                  "flex flex-col items-center gap-2 cursor-pointer transition-all",
                  index <= currentStep ? "opacity-100" : "opacity-40",
                  index === currentStep && "scale-105"
                )}
                whileHover={{ scale: index <= currentStep ? 1.05 : 1 }}
                whileTap={{ scale: index <= currentStep ? 0.95 : 1 }}
                disabled={index > currentStep + 1 || (index === currentStep + 1 && !canProceed(currentStep))}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                    index === currentStep
                      ? "bg-gradient-to-r from-[#4a85ff] to-[#5829f2] border-transparent text-white shadow-lg shadow-[#4a85ff]/30"
                      : index < currentStep
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : "bg-white/5 border-white/20 text-white/60"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="text-center">
                  <p className={cn(
                    "text-sm font-medium transition-colors",
                    index === currentStep ? "text-white" : "text-white/60"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-white/40 hidden lg:block">
                    {step.subtitle}
                  </p>
                </div>
              </motion.button>
              
              {index < steps.length - 1 && (
                <div className="flex-1 h-[2px] bg-white/10 relative mx-4">
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#4a85ff] to-[#5829f2]"
                    initial={{ width: 0 }}
                    animate={{ width: index < currentStep ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Mobile Progress */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium text-white">
              {steps[currentStep].title}
            </span>
          </div>
          <Progress 
            value={(currentStep + 1) / steps.length * 100}
            className="h-2"
            classNames={{
              indicator: "bg-gradient-to-r from-[#4a85ff] to-[#5829f2]",
              track: "bg-white/10"
            }}
          />
        </div>
      </div>

      {/* Step Content */}
      <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
        <CardBody className="p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={currentStep}
              custom={currentStep}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {currentStep === 0 && (
                <StepConfigure 
                  assetPrice={assetPrice}
                  proMode={proMode}
                />
              )}
              {currentStep === 1 && (
                <StepCollateral
                  proMode={proMode}
                  onStateChangeAction={setCollateralState}
                />
              )}
              {currentStep === 2 && (
                <StepReview
                  proMode={proMode}
                  collateralState={collateralState}
                  assetPrice={assetPrice}
                  isSubmitting={isSubmitting}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </CardBody>
      </Card>

      {/* Navigation Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between mt-6"
      >
        <Button
          variant="bordered"
          onPress={handlePrevious}
          isDisabled={currentStep === 0}
          startContent={<ChevronLeft className="w-4 h-4" />}
          className={cn(
            "border-white/20 hover:border-white/30 min-w-[100px]",
            currentStep === 0 && "opacity-40 cursor-not-allowed"
          )}
        >
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentStep
                  ? "w-8 bg-gradient-to-r from-[#4a85ff] to-[#5829f2]"
                  : "bg-white/20"
              )}
              animate={{ width: index === currentStep ? 32 : 8 }}
            />
          ))}
        </div>

        {currentStep < steps.length - 1 ? (
          <Button
            onPress={handleNext}
            isDisabled={!canProceed(currentStep)}
            endContent={<ChevronRight className="w-4 h-4" />}
            className={cn(
              "min-w-[100px] font-semibold transition-all",
              canProceed(currentStep)
                ? "bg-gradient-to-r from-[#4a85ff] to-[#5829f2] text-white shadow-lg shadow-[#4a85ff]/25 hover:shadow-[#4a85ff]/40"
                : "bg-white/10 text-white/40 border border-white/20"
            )}
          >
            Next
          </Button>
        ) : (
          <Button
            onPress={() => onSubmitAction()}
            isLoading={isSubmitting}
            isDisabled={!collateralState.hasEnoughCollateral}
            className={cn(
              "min-w-[120px] font-semibold transition-all",
              collateralState.hasEnoughCollateral
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
                : "bg-white/10 text-white/40 border border-white/20"
            )}
            endContent={<Rocket className="w-4 h-4" />}
          >
            Mint Option
          </Button>
        )}
      </motion.div>
    </div>
  );
}
