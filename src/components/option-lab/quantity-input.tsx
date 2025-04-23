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
    if (isNaN(num) || num < 0.001 || num > 10000) {
      setError('quantity', { 
        message: `Quantity must be between 0.001 and 10,000` 
      });
      return;
    }
    clearErrors('quantity');
    setValue('quantity', num);
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
          min="0.001"
          max="10000"
          step="0.001"
          placeholder="Enter quantity (0.001-10,000)"
          value={getValues('quantity')}
          onChange={(e) => handleQuantityChange(e.target.value)}
          className="h-9 sm:h-10 text-sm sm:text-base"
        />
      </FormControl>
      <FormMessage className="text-xs sm:text-sm" />
    </FormItem>
  );
}; 