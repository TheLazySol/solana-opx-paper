import React from 'react';
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TOKENS } from '@/lib/api/tokens';
import { useFormContext } from 'react-hook-form';
import { useAssetPrice, useAssetPriceInfo } from '@/context/asset-price-provider';
import { getTokenDisplayDecimals } from '@/constants/token-list/token-list';

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
      <FormLabel className="pt-2 sm:pt-3 mb-1 sm:mb-2 flex items-center text-xs sm:text-sm">
        <span>Current Price:</span>
        {assetPrice > 0 && (
          <span className="ml-2 text-[#4a85ff] text-xs sm:text-sm font-normal">
            ${assetPrice.toFixed(getTokenDisplayDecimals(selectedAsset))}
          </span>
        )}
      </FormLabel>
      <Select 
        onValueChange={handleAssetChange}
        defaultValue={getValues('asset')}
      >
        <FormControl>
          <SelectTrigger className="h-9 sm:h-10 text-sm sm:text-base">
            <SelectValue placeholder="Select asset" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {Object.entries(TOKENS).map(([symbol, token]) => (
            <SelectItem key={symbol} value={symbol} className="text-sm">
              {token.name} ({token.symbol})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage className="text-xs sm:text-sm" />
    </FormItem>
  );
}; 