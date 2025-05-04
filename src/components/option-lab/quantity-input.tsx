import React from 'react';
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from 'react-hook-form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipIndicator } from "./tooltip-icon";

export const QuantityInput = () => {
  const { getValues, setValue, setError, clearErrors } = useFormContext();

  const handleQuantityChange = (value: string) => {
    if (value === "") {
      setValue('quantity', '');
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 1000) {
      setError('quantity', { 
        message: `Quantity must be between 0.01 and 1000 for submission` 
      });
    } else if (num === 0) {
      // Allow zero but show a message that it needs to be at least 0.01 for submission
      setError('quantity', { 
        message: `Quantity must be at least 0.01 for submission` 
      });
    } else {
      clearErrors('quantity');
    }
    setValue('quantity', value);
  };

  return (
    <FormItem>
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <FormLabel className="mb-1 sm:mb-2 cursor-help border-b border-dotted border-slate-500 text-xs">
              Quantity
              <TooltipIndicator />
            </FormLabel>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs sm:text-sm">The number of option contracts to sell. Fractional quantities are supported.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <FormControl>
        <Input
          type="number"
          max="10000"
          step="0.01"
          placeholder="Min Qty: 0.01"
          value={getValues('quantity')}
          onChange={(e) => handleQuantityChange(e.target.value)}
          className="h-9 sm:h-10 text-sm sm:text-base"
        />
      </FormControl>
      <FormMessage className="text-xs sm:text-sm" />
    </FormItem>
  );
}; 