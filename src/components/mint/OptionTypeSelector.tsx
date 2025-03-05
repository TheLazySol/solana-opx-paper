import React from 'react';
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useFormContext } from 'react-hook-form';
import type { FormData } from '@/types/mint/form';
import { cn } from "@/lib/misc/utils";

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
            variant="outline"
            onClick={() => handleOptionTypeChange('call')}
            className={cn(
              "flex-1 h-8 bg-[#4a85ff]/10 border border-[#4a85ff]/40",
              "hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60",
              "transition-all duration-200",
              methods.getValues('optionType') === "call" && "bg-[#4a85ff]/50 border-[#4a85ff]/60"
            )}
          >
            Call
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOptionTypeChange('put')}
            className={cn(
              "flex-1 h-8 bg-[#4a85ff]/10 border border-[#4a85ff]/40",
              "hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60",
              "transition-all duration-200",
              methods.getValues('optionType') === "put" && "bg-[#4a85ff]/50 border-[#4a85ff]/60"
            )}
          >
            Put
          </Button>
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}; 