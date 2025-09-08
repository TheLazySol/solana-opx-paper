"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardBody, 
  Chip,
  cn 
} from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { CollateralState } from '../collateral-provider';
import { InteractivePnlChart } from '../interactive-pnl-chart';
import { OptionContractSummary } from '../option-contract-summary';
import { AdvancedOptionDetails } from '../advanced-option-details';
import { CostBreakdown } from '../cost-breakdown';
import { calculateTotalPremium } from '@/constants/option-lab/calculations';
import { 
  Target
} from 'lucide-react';

interface StepReviewProps {
  proMode: boolean;
  collateralState: CollateralState;
  assetPrice: number | null;
  isSubmitting: boolean;
}

export function StepReview({ 
  proMode, 
  collateralState, 
  assetPrice,
  isSubmitting 
}: StepReviewProps) {
  const methods = useFormContext();
  const formValues = methods.watch();
  
  const options = formValues.strikePrice && formValues.premium ? [{
    quantity: formValues.quantity || 1,
    strikePrice: formValues.strikePrice,
    premium: formValues.premium,
    optionType: formValues.optionType,
    asset: formValues.asset,
    expirationDate: formValues.expirationDate
  }] : [];
  
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
      {formValues.strikePrice && formValues.premium && (
        <motion.div variants={itemVariants}>
          <OptionContractSummary showDetailedInfo={true} />
        </motion.div>
      )}

      {/* 1. Interactive P&L Chart */}
      <motion.div variants={itemVariants}>
        <Card className="bg-black/40 border border-white/10">
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#4a85ff]" />
                <h3 className="text-lg font-medium text-white">Interactive P&L Analysis</h3>
              </div>
              {assetPrice && (
                <Chip size="sm" variant="flat" className="bg-blue-500/20 text-blue-400">
                  Current: ${assetPrice.toFixed(2)}
                </Chip>
              )}
            </div>
            <InteractivePnlChart
              options={options}
              collateralProvided={Number(collateralState.collateralProvided)}
              leverage={collateralState.leverage}
              assetPrice={assetPrice}
              proMode={proMode}
            />
          </CardBody>
        </Card>
      </motion.div>


      {/* 2. Advanced Option Details */}
      <motion.div variants={itemVariants}>
        <AdvancedOptionDetails assetPrice={assetPrice} />
      </motion.div>

      {/* 3. Cost Breakdown */}
      <motion.div variants={itemVariants}>
        <CostBreakdown collateralState={collateralState} />
      </motion.div>

    </motion.div>
  );
}
