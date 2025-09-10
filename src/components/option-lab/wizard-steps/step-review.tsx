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
import { OptionContractSummary } from '../option-contract-summary';
import { AdvancedOptionDetails } from '../advanced-option-details';
import { CostBreakdown } from '../cost-breakdown';
import { calculateTotalPremium } from '@/constants/option-lab/calculations';

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

      {/* 1. Advanced Option Details */}
      <motion.div variants={itemVariants}>
        <AdvancedOptionDetails 
          assetPrice={assetPrice} 
          showTitle={false}
          collateralInfo={{
            collateralProvided: collateralState.collateralProvided,
            collateralType: collateralState.collateralType,
            collateralPrice: collateralState.collateralType === 'SOL' ? (assetPrice || 100) : 1,
            borrowCost: collateralState.borrowCost,
            borrowFee: collateralState.borrowFee
          }}
        />
      </motion.div>

      {/* 2. Cost Breakdown */}
      <motion.div variants={itemVariants}>
        <CostBreakdown collateralState={collateralState} />
      </motion.div>

    </motion.div>
  );
}
