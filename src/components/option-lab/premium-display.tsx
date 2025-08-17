import React from 'react';
import { Input, Tooltip } from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { Info } from 'lucide-react';

export const PremiumDisplay = ({ 
  lastUpdated, 
  manualRefresh, 
  isDebouncing 
}: { 
  lastUpdated: Date | null, 
  manualRefresh: () => void,
  isDebouncing: boolean 
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
        value={getValues('premium') ? `$${getValues('premium')}` : 'Calculating...'}
        variant="flat"
        classNames={{
          input: "text-blue-400 font-medium",
          inputWrapper: "bg-white/5 border border-white/20 rounded-lg backdrop-blur-sm h-10 hover:bg-white/8 data-[hover=true]:bg-white/8 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:shadow-none data-[focus=true]:ring-0 data-[focus=true]:shadow-none border-[0.5px] hover:border-white/30"
        }}
      />
    </div>
  );
};