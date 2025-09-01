"use client"

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardBody, 
  Chip, 
  Button,
  Divider,
  Tooltip,
  cn 
} from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { CollateralState } from '../collateral-provider';
import { InteractivePnlChart } from '../interactive-pnl-chart';
import { calculateTotalPremium } from '@/constants/option-lab/calculations';
import { format } from 'date-fns';
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign,
  Hash,
  Zap,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Rocket,
  Receipt,
  Target
} from 'lucide-react';
import Image from 'next/image';

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
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  
  const options = formValues.strikePrice && formValues.premium ? [{
    quantity: formValues.quantity || 1,
    strikePrice: formValues.strikePrice,
    premium: formValues.premium,
    optionType: formValues.optionType,
    asset: formValues.asset,
    expirationDate: formValues.expirationDate
  }] : [];
  
  const totalPremium = calculateTotalPremium(options);
  const totalValue = Number(formValues.premium || 0) * Number(formValues.quantity || 1) * 100;
  
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

  const metrics = [
    {
      id: 'premium',
      label: 'Premium Income',
      value: `$${totalPremium.toFixed(2)}`,
      icon: <DollarSign className="w-4 h-4" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      description: 'Total premium you will receive'
    },
    {
      id: 'collateral',
      label: 'Collateral Provided',
      value: `$${Number(collateralState.collateralProvided).toFixed(2)}`,
      icon: <Shield className="w-4 h-4" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      description: 'Amount of collateral you are providing'
    },
    {
      id: 'leverage',
      label: 'Leverage',
      value: `${collateralState.leverage}x`,
      icon: <Zap className="w-4 h-4" />,
      color: collateralState.leverage > 5 ? 'text-orange-400' : 'text-purple-400',
      bgColor: collateralState.leverage > 5 ? 'bg-orange-500/20' : 'bg-purple-500/20',
      description: 'Multiplier on your collateral'
    },
    {
      id: 'maxProfit',
      label: 'Max Profit',
      value: `$${Math.abs(collateralState.maxProfitPotential).toFixed(2)}`,
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      description: 'Maximum potential profit after fees'
    }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Interactive P&L Chart */}
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

      {/* Key Metrics Grid */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((metric) => (
            <motion.div
              key={metric.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onHoverStart={() => setHoveredMetric(metric.id)}
              onHoverEnd={() => setHoveredMetric(null)}
            >
              <Card className="bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                <CardBody className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className={cn("p-1.5 rounded-lg", metric.bgColor)}>
                      {React.cloneElement(metric.icon, { className: cn("w-3 h-3", metric.color) })}
                    </div>
                    {hoveredMetric === metric.id && (
                      <Tooltip content={metric.description}>
                        <Info className="w-3 h-3 text-white/40" />
                      </Tooltip>
                    )}
                  </div>
                  <p className="text-xs text-white/60 mb-1">{metric.label}</p>
                  <p className={cn("text-lg font-bold", metric.color)}>
                    {metric.value}
                  </p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Option Contract Details */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-[#4a85ff]/10 to-[#5829f2]/10 border border-[#4a85ff]/20">
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-[#4a85ff]" />
              <h3 className="text-lg font-medium text-white">Option Contract Summary</h3>
            </div>
            
            <div className="space-y-4">
              {/* Contract Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {formValues.asset === 'SOL' && (
                    <Image 
                      src="/token-logos/solana_logo.png" 
                      alt="Solana" 
                      width={32} 
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{formValues.asset}</span>
                      <Chip
                        size="sm"
                        variant="flat"
                        className={cn(
                          "font-medium",
                          formValues.optionType === 'call'
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        )}
                      >
                        Short {formValues.optionType === 'call' ? 'Call' : 'Put'}
                      </Chip>
                    </div>
                    <p className="text-xs text-white/60 mt-0.5">
                      Strike: ${Number(formValues.strikePrice).toFixed(2)} | 
                      Premium: ${Number(formValues.premium).toFixed(4)} | 
                      Qty: {formValues.quantity}
                    </p>
                  </div>
                </div>
                
                {formValues.expirationDate && (
                  <Chip
                    size="sm"
                    variant="bordered"
                    className="border-white/20"
                    startContent={<Calendar className="w-3 h-3" />}
                  >
                    {format(formValues.expirationDate, 'MMM dd, yyyy')}
                  </Chip>
                )}
              </div>
              
              <Divider className="bg-white/10" />
              
              {/* Contract Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Total Value</p>
                  <p className="text-sm font-medium text-white">${totalValue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Break-Even</p>
                  <p className="text-sm font-medium text-white">
                    ${formValues.optionType === 'call' 
                      ? (Number(formValues.strikePrice) + Number(formValues.premium)).toFixed(2)
                      : (Number(formValues.strikePrice) - Number(formValues.premium)).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Days to Expiry</p>
                  <p className="text-sm font-medium text-white">
                    {formValues.expirationDate 
                      ? Math.ceil((formValues.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : 0} days
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Fees Breakdown */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border border-white/10">
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-white">Fee Breakdown</h4>
              <Chip size="sm" variant="flat" className="bg-white/10">
                Total: ${(
                  collateralState.borrowCost +
                  collateralState.optionCreationFee +
                  collateralState.borrowFee +
                  collateralState.transactionCost
                ).toFixed(4)}
              </Chip>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Borrow Cost</span>
                <span className="text-white">${collateralState.borrowCost.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Creation Fee</span>
                <span className="text-white">${collateralState.optionCreationFee.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Borrow Fee</span>
                <span className="text-white">${collateralState.borrowFee.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Transaction Cost</span>
                <span className="text-white">${collateralState.transactionCost.toFixed(4)}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Pro Mode Risk Analysis */}
      {proMode && (
        <motion.div 
          variants={itemVariants}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="bg-white/5 border border-white/10">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <h4 className="text-sm font-medium text-white">Risk Analysis</h4>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Max Loss</p>
                  <p className="text-sm font-medium text-red-400">
                    {formValues.optionType === 'call' 
                      ? 'Unlimited'
                      : `$${(Number(formValues.strikePrice) * formValues.quantity * 100).toFixed(2)}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Collateralization</p>
                  <p className={cn(
                    "text-sm font-medium",
                    collateralState.hasEnoughCollateral ? "text-green-400" : "text-red-400"
                  )}>
                    {collateralState.hasEnoughCollateral ? 'Sufficient' : 'Insufficient'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Risk Level</p>
                  <p className={cn(
                    "text-sm font-medium",
                    collateralState.leverage === 1 ? "text-green-400" :
                    collateralState.leverage <= 5 ? "text-yellow-400" :
                    "text-red-400"
                  )}>
                    {collateralState.leverage === 1 ? 'Low' :
                     collateralState.leverage <= 5 ? 'Medium' :
                     'High'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Assignment Risk</p>
                  <p className="text-sm font-medium text-yellow-400">
                    {assetPrice && formValues.strikePrice ? (
                      formValues.optionType === 'call' 
                        ? assetPrice > Number(formValues.strikePrice) ? 'High (ITM)' : 'Low (OTM)'
                        : assetPrice < Number(formValues.strikePrice) ? 'High (ITM)' : 'Low (OTM)'
                    ) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Margin Required</p>
                  <p className="text-sm font-medium text-white">
                    ${(Number(formValues.strikePrice) * formValues.quantity * 100 * 0.2).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">ROI Potential</p>
                  <p className="text-sm font-medium text-green-400">
                    {Number(collateralState.collateralProvided) > 0 
                      ? `${((collateralState.maxProfitPotential / Number(collateralState.collateralProvided)) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* Status Messages */}
      <motion.div variants={itemVariants}>
        {collateralState.hasEnoughCollateral ? (
          <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-400">Ready to Mint</p>
              <p className="text-xs text-green-300">
                Your option contract is configured correctly and you have sufficient collateral. 
                Click &quot;Mint Option&quot; to create your position.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-400">Insufficient Collateral</p>
              <p className="text-xs text-red-300">
                Please go back to the previous step and provide more collateral or increase your leverage.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
