import React from 'react';
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from 'react-hook-form';

export const QuantityInput = () => {
  const { getValues, setValue, setError, clearErrors } = useFormContext();

  const handleQuantityChange = (value: string) => {
    if (value === "") {
      setValue('quantity', '');
      return;
    }
    const num = parseInt(value);
    if (num < 1 || num > 10000) {
      setError('quantity', { 
        message: `Quantity must be between 1 and 10,000` 
      });
      return;
    }
    clearErrors('quantity');
    setValue('quantity', Math.floor(num));
  };

  return (
    <FormItem>
      <FormLabel>Quantity</FormLabel>
      <FormControl>
        <Input
          type="number"
          min="1"
          max="10000"
          step="1"
          placeholder="Enter quantity (1-10,000)"
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