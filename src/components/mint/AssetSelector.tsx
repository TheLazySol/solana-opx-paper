import React from 'react';
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TOKENS } from '@/lib/api/tokens';
import { useFormContext } from 'react-hook-form';

export const AssetSelector = ({ assetPrice }: { assetPrice: number | null }) => {
  const { setValue, getValues } = useFormContext();

  const handleAssetChange = (value: string) => {
    setValue('asset', value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
    // Reset premium when asset changes
    setValue('premium', '', {
      shouldValidate: true
    });
  };

  return (
    <FormItem>
      <FormLabel>Asset</FormLabel>
      <Select 
        onValueChange={handleAssetChange}
        defaultValue={getValues('asset')}
      >
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
      <FormDescription>
        <span className="text-[#4a85ff]">Current Price: {assetPrice ? `$${assetPrice.toFixed(4)}` : 'Loading...'}</span>
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
}; 