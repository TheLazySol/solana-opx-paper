import React from 'react';
import { Input, Tooltip } from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { Info } from 'lucide-react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export const PremiumDisplay = ({ 
  lastUpdated, 
  manualRefresh, 
  isDebouncing,
  isCalculating 
}: { 
  lastUpdated: Date | null, 
  manualRefresh: () => void,
  isDebouncing: boolean,
  isCalculating?: boolean 
}) => {
  const { getValues } = useFormContext();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-white/80">Option Premium</label>
        <Tooltip 
          content={
            <div className="max-w-xs">
              <p className="text-xs">The price paid by the buyer, this is the max profit for the option seller at expiration.</p>
              {lastUpdated && getValues('premium') && (
                <p className="text-blue-400 mt-1 text-xs">${(Number(getValues('premium')) * 100).toFixed(2)} USD per contract</p>
              )}
            </div>
          }
        >
          <Info className="w-4 h-4 text-white/40 cursor-help" />
        </Tooltip>
      </div>
      <Input
        isReadOnly
        placeholder="Calculated premium"
        value={
          isCalculating || isDebouncing 
            ? 'Calculating...' 
            : getValues('premium') 
              ? `$${Number(getValues('premium')).toFixed(2)}` 
              : 'Enter option details'
        }
        variant="flat"
        startContent={
          (isCalculating || isDebouncing) && (
            <ArrowPathIcon className="w-4 h-4 text-blue-400 animate-spin" />
          )
        }
        classNames={{
          input: "font-medium text-white bg-transparent",
          inputWrapper: "!bg-white/5 border-white/20 hover:border-white/30 h-10 border-[0.5px] rounded-lg data-[focus=true]:border-[#4a85ff]/60 data-[focus=true]:!bg-white/5"
        }}
      />
    </div>
  );
};