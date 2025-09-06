import React from 'react';
import { Button, ButtonGroup, cn } from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import type { FormData } from '@/types/mint/formOptionLabMint';

export const OptionTypeSelector = () => {
  const { setValue, watch } = useFormContext<FormData>();
  const optionType = watch('optionType');

  const handleOptionTypeChange = (type: 'call' | 'put') => {
    setValue('optionType', type, { shouldValidate: true });
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/80">Option Type</label>
      <div className="flex gap-3">
        <Button
          variant="bordered"
          onPress={() => handleOptionTypeChange('call')}
          className={cn(
            "flex-1 h-12 font-medium rounded-lg transition-all duration-300 border-[0.5px]",
            optionType === "call" 
              ? "bg-green-500/20 border-green-500/40 text-green-400 shadow-lg shadow-green-500/10" 
              : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/30"
          )}
        >
          Call
        </Button>
        <Button
          variant="bordered"
          onPress={() => handleOptionTypeChange('put')}
          className={cn(
            "flex-1 h-12 font-medium rounded-lg transition-all duration-300 border-[0.5px]",
            optionType === "put" 
              ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-lg shadow-red-500/10" 
              : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/30"
          )}
        >
          Put
        </Button>
      </div>
    </div>
  );
};