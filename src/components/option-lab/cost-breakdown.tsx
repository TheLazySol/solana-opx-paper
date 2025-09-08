"use client"

import React from 'react';
import { useMouseGlow } from '@/hooks/useMouseGlow';
import { Card, CardBody, Chip } from '@heroui/react';
import { CollateralState } from './collateral-provider';
import { formatNumberWithCommas } from '@/utils/utils';
import { Receipt } from 'lucide-react';

interface CostBreakdownProps {
  collateralState: CollateralState;
  showTitle?: boolean;
  showDevModeChip?: boolean;
}

export function CostBreakdown({ 
  collateralState, 
  showTitle = true, 
  showDevModeChip = false 
}: CostBreakdownProps) {
  const cardRef = useMouseGlow();
  
  const totalCost = collateralState.borrowCost + 
                   collateralState.optionCreationFee + 
                   collateralState.borrowFee + 
                   collateralState.transactionCost;

  return (
    <Card 
      ref={cardRef}
      className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
      style={{
        background: `
          radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
            rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0))), 
            transparent 40%
          ),
          linear-gradient(to bottom right, 
            rgb(15 23 42 / 0.4), 
            rgb(30 41 59 / 0.3), 
            rgb(51 65 85 / 0.2)
          )
        `
      }}
    >
      <CardBody className="p-4">
        {showTitle && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                <Receipt className="w-3 h-3 text-[#4a85ff]" />
              </div>
              <h4 className="text-sm font-medium text-white">Fee Breakdown</h4>
            </div>
            <Chip size="sm" variant="flat" className="bg-white/10">
              Total: ${totalCost.toFixed(4)}
            </Chip>
            {showDevModeChip && (
              <Chip size="sm" variant="flat" className="bg-amber-500/20 text-amber-400 ml-2">
                Dev Mode
              </Chip>
            )}
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Borrow Cost</span>
            <span className="text-sm font-medium text-white">${collateralState.borrowCost.toFixed(4)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Option Creation Fee</span>
            <span className="text-sm font-medium text-white">${collateralState.optionCreationFee.toFixed(4)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Borrow Fee</span>
            <span className="text-sm font-medium text-white">${collateralState.borrowFee.toFixed(4)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Transaction Cost</span>
            <span className="text-sm font-medium text-white">${collateralState.transactionCost.toFixed(4)}</span>
          </div>
          
          <div className="pt-3 mt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Max Profit Potential</span>
              <span className="text-sm font-bold text-green-400">
                ${formatNumberWithCommas(Math.abs(collateralState.maxProfitPotential))}
              </span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
