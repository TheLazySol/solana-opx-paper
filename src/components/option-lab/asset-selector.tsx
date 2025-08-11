import React from 'react';
import { Select, SelectItem } from '@heroui/react';
import { TOKENS } from '@/lib/api/tokens';
import { useFormContext } from 'react-hook-form';
import { useAssetPrice, useAssetPriceInfo } from '@/context/asset-price-provider';
import { getTokenDisplayDecimals } from '@/constants/token-list/token-list';

export const AssetSelector = ({ assetPrice: propAssetPrice }: { assetPrice: number | null }) => {
  const { setValue, getValues, watch } = useFormContext();
  const selectedAsset = watch('asset') || 'SOL'; // Default to SOL if undefined
  
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/80">Asset</label>
        {assetPrice > 0 && (
          <span className="text-sm text-blue-400 font-medium">
            ${assetPrice.toFixed(getTokenDisplayDecimals(selectedAsset) || 2)}
          </span>
        )}
      </div>
      <Select
        selectedKeys={[getValues('asset') || 'SOL']}
        onSelectionChange={(selection) => {
          const selected = Array.from(selection)[0] as string;
          if (selected) {
            handleAssetChange(selected);
          }
        }}
        placeholder="Select asset"
        variant="bordered"
        classNames={{
          trigger: "bg-white/5 border-white/20 hover:border-white/30 h-10",
          value: "text-white",
          popoverContent: "bg-black/90 border-white/10"
        }}
      >
        {Object.entries(TOKENS).map(([symbol, token]) => (
          <SelectItem key={symbol}>
            {token.name} ({token.symbol})
          </SelectItem>
        ))}
      </Select>
    </div>
  );
};