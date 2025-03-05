import React from 'react';
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TOKENS } from '@/lib/api/tokens';
import { useFormContext } from 'react-hook-form';

export const AssetSelector = () => {
  const { getValues } = useFormContext();

  return (
    <FormItem>
      <FormLabel>Asset</FormLabel>
      <Select onValueChange={getValues('asset')} defaultValue={getValues('asset')}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select asset" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {Object.entries(TOKENS).map(([symbol, token]) => (
            <SelectItem key={symbol} value={symbol}>
              {token.name} ({token.symbol})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );
}; 