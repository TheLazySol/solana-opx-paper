"use client"

import React from 'react';
import { Card, CardBody, Chip, cn } from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface OptionContractSummaryProps {
  showDetailedInfo?: boolean;
}

export function OptionContractSummary({ showDetailedInfo = false }: OptionContractSummaryProps) {
  const methods = useFormContext();
  const formValues = methods.watch();
  
  const {
    asset,
    optionType,
    strikePrice,
    premium,
    quantity,
    expirationDate
  } = formValues;

  // Don't render if essential data is missing
  if (!strikePrice || !premium) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-[#4a85ff]/10 to-[#1851c4]/10 border border-[#4a85ff]/20">
      <CardBody className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {asset === 'SOL' && (
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
                <span className="text-sm text-white/60">Short</span>
                <Chip
                  size="sm"
                  variant="flat"
                  className={cn(
                    "font-medium",
                    optionType === 'call'
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  )}
                  startContent={optionType === 'call' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                >
                  {optionType === 'call' ? 'Call' : 'Put'}
                </Chip>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-white/40">Strike: ${Number(strikePrice).toFixed(2)}</span>
                <span className="text-xs text-white/40">Premium: ${Number(premium).toFixed(2)}</span>
                <span className="text-xs text-white/40">Qty: {quantity}</span>
                {showDetailedInfo && (
                  <span className="text-xs text-white/40">
                    Asset: {asset}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {expirationDate && (
            <Chip
              size="sm"
              variant="bordered"
              className="border-white/20"
              startContent={<Calendar className="w-3 h-3" />}
            >
              {format(expirationDate, 'MMM dd, yyyy')}
            </Chip>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
