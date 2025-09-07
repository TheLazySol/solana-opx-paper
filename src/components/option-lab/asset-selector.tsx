import React from 'react';
import { Select, SelectItem } from '@heroui/react';
import { TOKENS } from '@/lib/api/tokens';
import { useFormContext } from 'react-hook-form';
import { useAssetPrice, useAssetPriceInfo } from '@/context/asset-price-provider';
import { getTokenDisplayDecimals } from '@/constants/token-list/token-list';
import Image from 'next/image';

export const AssetSelector = ({ assetPrice: propAssetPrice }: { assetPrice: number | null }) => {
  const { setValue, getValues, watch } = useFormContext();
  const selectedAsset = watch('asset') || 'SOL'; // Default to SOL if undefined
  
  // Use the contextualized asset price
  const { setSelectedAsset } = useAssetPrice();
  const { price } = useAssetPriceInfo(selectedAsset);
  
  // Use either the prop asset price (for backward compatibility) or the contextualized price
  const assetPrice = propAssetPrice !== null ? propAssetPrice : price;

  const handleAssetChange = (keys: any) => {
    const value = Array.from(keys)[0] as string;
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

  const selectedToken = TOKENS[selectedAsset as keyof typeof TOKENS];
  const assets = Object.entries(TOKENS).map(([id, token]) => ({
    id,
    name: token.symbol,
    symbol: token.symbol,
    fullName: token.name
  }));

  if (!selectedToken) {
    return null; // Safety check
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/60">Asset</label>
        {assetPrice > 0 && (
          <span className="text-sm text-blue-400 font-medium">
            ${assetPrice.toFixed(getTokenDisplayDecimals(selectedAsset) || 2)}
          </span>
        )}
      </div>
      
      <Select
        label="Asset"
        selectedKeys={[selectedAsset]}
        onSelectionChange={handleAssetChange}
        className="w-full"
        classNames={{
          trigger: "bg-white/5 border-white/20 hover:border-white/30 data-[hover=true]:bg-white/10",
          value: "text-white",
          label: "text-white/60"
        }}
        renderValue={(items) => {
          return items.map((item) => {
            const asset = assets.find(a => a.id === item.key);
            if (!asset) return null;
            
            return (
              <div key={item.key} className="flex items-center">
                {asset.symbol.toUpperCase() === 'SOL' && (
                  <Image 
                    src="/token-logos/solana_logo.png" 
                    alt="Solana Logo" 
                    width={20} 
                    height={20} 
                    className="mr-2"
                  />
                )}
                {asset.symbol.toUpperCase() === 'LABS' && (
                  <Image 
                    src="/token-logos/epicentral_labs_logo.png" 
                    alt="Epicentral Labs Logo" 
                    width={20} 
                    height={20} 
                    className="mr-2"
                  />
                )}
                <span>{asset.name} ({asset.symbol})</span>
              </div>
            );
          });
        }}
      >
        {assets.map((asset) => (
          <SelectItem key={asset.id}>
            <div className="flex items-center">
              {asset.symbol.toUpperCase() === 'SOL' && (
                <Image 
                  src="/token-logos/solana_logo.png" 
                  alt="Solana Logo" 
                  width={20} 
                  height={20} 
                  className="mr-2"
                />
              )}
              {asset.symbol.toUpperCase() === 'LABS' && (
                <Image 
                  src="/token-logos/epicentral_labs_logo.png" 
                  alt="Epicentral Labs Logo" 
                  width={20} 
                  height={20} 
                  className="mr-2"
                />
              )}
              <span>{asset.fullName} ({asset.symbol})</span>
            </div>
          </SelectItem>
        ))}
      </Select>
    </div>
  );
};