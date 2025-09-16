"use client"

import React, { useMemo } from 'react';
import { CostBreakdown } from '../option-lab/cost-breakdown';
import { CollateralState } from '../option-lab/collateral-provider';

interface TradeCostBreakdownProps {
  fees: {
    optionCreationFee: number;
    borrowFee: number;
    transactionCost: number;
    totalFees: number;
  };
  hasSelectedOptions: boolean;
  borrowedAmount: number;
  showTitle?: boolean;
  showDevModeChip?: boolean;
}

export function TradeCostBreakdown({ 
  fees,
  hasSelectedOptions,
  borrowedAmount,
  showTitle = true, 
  showDevModeChip = false 
}: TradeCostBreakdownProps) {
  
  // Convert trade fees structure to CollateralState interface
  const collateralState = useMemo((): CollateralState => {
    // Calculate a mock max profit potential for trading
    // This could be enhanced based on the specific trade strategy
    const maxProfitPotential = hasSelectedOptions ? 1000 : 0; // Placeholder value
    
    return {
      hasEnoughCollateral: true, // Not directly relevant for trade cost breakdown
      collateralProvided: "0", // Not directly relevant for trade cost breakdown
      leverage: 1, // Not directly relevant for trade cost breakdown
      collateralType: "USDC", // Not directly relevant for trade cost breakdown
      borrowCost: 0, // Trade context doesn't have explicit borrow cost separate from borrow fee
      optionCreationFee: fees.optionCreationFee,
      borrowFee: fees.borrowFee,
      transactionCost: fees.transactionCost,
      maxProfitPotential: maxProfitPotential
    };
  }, [fees, hasSelectedOptions]);

  return (
    <CostBreakdown
      collateralState={collateralState}
      showTitle={showTitle}
      showDevModeChip={showDevModeChip}
    />
  );
}
