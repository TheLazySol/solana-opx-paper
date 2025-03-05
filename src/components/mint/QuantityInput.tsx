import React from 'react';
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from 'react-hook-form';

export const QuantityInput = () => {
  const { getValues, setValue } = useFormContext();

  const handleQuantityChange = (value: string) => {
    if (value === "") {
      setValue('quantity', value);
      return;
    }
    const num = parseInt(value);
    if (num < 1) return;
    setValue('quantity', Math.floor(num));
  };

  return (
    <FormItem>
      <FormLabel>Quantity</FormLabel>
      <FormControl>
        <Input
          type="number"
          min="1"
          step="1"
          placeholder="Enter quantity"
          value={getValues('quantity')}
          onChange={(e) => handleQuantityChange(e.target.value)}
        />
      </FormControl>
      <FormDescription>
        Each option contract represents 100 tokens of the underlying asset
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
}; 