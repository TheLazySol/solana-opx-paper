import React from 'react';
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useFormContext } from 'react-hook-form';
import type { FormData } from '@/types/mint/form';

export const OptionTypeSelector = () => {
  const methods = useFormContext<FormData>();
  const debounceTimer = React.useRef<NodeJS.Timeout>();

  const handleOptionTypeChange = (type: 'call' | 'put') => {
    methods.setValue('optionType', type);
    const values = methods.getValues();
    if (values.strikePrice && values.expirationDate) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        // Trigger calculation after option type changes
        // calculateOptionPrice({...values, optionType: type});
      }, 2000);
    }
  };

  return (
    <FormItem>
      <FormLabel>Option Type</FormLabel>
      <FormControl>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={methods.getValues('optionType') === "call" ? "default" : "outline"}
            className="flex-1"
            onClick={() => handleOptionTypeChange('call')}
          >
            Call
          </Button>
          <Button
            type="button"
            variant={methods.getValues('optionType') === "put" ? "default" : "outline"}
            className="flex-1"
            onClick={() => handleOptionTypeChange('put')}
          >
            Put
          </Button>
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}; 