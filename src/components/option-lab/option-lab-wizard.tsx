"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody, Button, Progress, cn, Switch, Tooltip } from '@heroui/react';
import { ChevronLeft, ChevronRight, Check, Circle, DollarSign, FileCheck } from 'lucide-react';
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
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
      </svg>
    )
  },
  {
    id: 'collateral',
    title: 'Provide Collateral',
    subtitle: 'Set leverage and collateral',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z"/>
      </svg>
    )
  },
  {
    id: 'review',
    title: 'Review & Mint',
    subtitle: 'Confirm and create your option',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
      </svg>
    )
  }
];

interface OptionLabWizardProps {
  assetPrice: number | null;
  onSubmitAction: (e?: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function OptionLabWizard({ assetPrice, onSubmitAction, isSubmitting }: OptionLabWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isProMode, setIsProMode] = useState(true);
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
      // Mark current step as completed when user proceeds to next step
      setCompletedSteps(prev => new Set([...prev, currentStep]));
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
      // Mark current step as completed when user proceeds to next step
      setCompletedSteps(prev => new Set([...prev, currentStep]));
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
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 md:mb-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-thin text-white mb-1">
              Create Your Option Contract
            </h2>
            <p className="text-sm text-white/60">
              Follow the steps to configure and mint your option
            </p>
          </div>
          
          {/* Mode Selector - Aligned with Header */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3 mt-1"
          >
            <Tooltip content="Coming Soon!" placement="bottom">
              <span className={cn(
                "text-sm font-medium transition-colors cursor-not-allowed",
                "text-white/30 line-through"
              )}>
                Degen Mode
              </span>
            </Tooltip>
            <Switch
              isSelected={isProMode}
              onValueChange={() => {}} // Disabled
              size="sm"
              isDisabled={true}
              classNames={{
                wrapper: cn(
                  "group-data-[selected=true]:bg-gradient-to-r",
                  "group-data-[selected=true]:from-[#4a85ff]",
                  "group-data-[selected=true]:to-[#5829f2]",
                  "opacity-50"
                ),
                thumb: cn(
                  "group-data-[selected=true]:ml-6",
                  "group-data-[selected=true]:bg-white"
                )
              }}
            />
            <span className={cn(
              "text-sm font-medium transition-colors",
              "text-[#5829f2]"
            )}>
              Pro Mode
            </span>
          </motion.div>
        </div>
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
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    index === currentStep
                      ? "bg-white/10 border-white text-white"
                      : completedSteps.has(index)
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : "bg-white/5 border-white/20 text-white/60"
                  )}
                >
                  {completedSteps.has(index) ? (
                    <Check className="w-4 h-4" />
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
                    animate={{ width: completedSteps.has(index) ? '100%' : '0%' }}
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
                  proMode={false}
                />
              )}
              {currentStep === 1 && (
                <StepCollateral
                  proMode={false}
                  onStateChangeAction={setCollateralState}
                />
              )}
              {currentStep === 2 && (
                <StepReview
                  proMode={false}
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
            endContent={<Check className="w-4 h-4" />}
          >
            Mint Option
          </Button>
        )}
      </motion.div>
    </div>
  );
}
