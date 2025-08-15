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
      <ButtonGroup variant="bordered" className="w-full dropdown-thin-border">
        <Button
          onPress={() => handleOptionTypeChange('call')}
          className={cn(
            "flex-1 transition-all duration-300",
            optionType === "call" 
              ? "bg-blue-500/20 text-blue-400" 
              : "bg-white/5 text-white/60 hover:bg-white/10"
          )}
        >
          Call
        </Button>
        <Button
          onPress={() => handleOptionTypeChange('put')}
          className={cn(
            "flex-1 transition-all duration-300",
            optionType === "put" 
              ? "bg-blue-500/20 text-blue-400" 
              : "bg-white/5 text-white/60 hover:bg-white/10"
          )}
        >
          Put
        </Button>
      </ButtonGroup>
    </div>
  );
};