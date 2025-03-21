import React from 'react';
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TOKENS } from '@/lib/api/tokens';
import { useFormContext } from 'react-hook-form';
import { useAssetPrice, useAssetPriceInfo } from '@/context/asset-price-provider';
import { getTokenDisplayDecimals } from '@/constants/token-list/tokens';

export const AssetSelector = ({ assetPrice: propAssetPrice }: { assetPrice: number | null }) => {
  const { setValue, getValues, watch } = useFormContext();
  const selectedAsset = watch('asset');
  
  // Use the contextualized asset price
  const { setSelectedAsset } = useAssetPrice();
  const { price } = useAssetPriceInfo(selectedAsset);
  
  // Use either the prop asset price (for backward compatibility) or the contextualized price
  const assetPrice = propAssetPrice !== null ? propAssetPrice : price;

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
    
    // Update the selected asset in the context
    setSelectedAsset(value);
  };

  return (
    <FormItem>
      <FormLabel className="pt-3 mb-2 flex items-center">
        <span>Current Price:</span>
        {assetPrice > 0 && (
          <span className="ml-2 text-[#4a85ff] text-sm font-normal">
            ${assetPrice.toFixed(getTokenDisplayDecimals(selectedAsset))}
          </span>
        )}
      </FormLabel>
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
      <FormMessage />
    </FormItem>
  );
}; 