import React from 'react';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { TOKENS } from '@/lib/api/tokens';
import { useFormContext } from 'react-hook-form';
import { useAssetPrice, useAssetPriceInfo } from '@/context/asset-price-provider';
import { getTokenDisplayDecimals } from '@/constants/token-list/token-list';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';

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
        <label className="text-sm font-medium text-white/80">Asset</label>
        {assetPrice > 0 && (
          <span className="text-sm text-blue-400 font-medium">
            ${assetPrice.toFixed(getTokenDisplayDecimals(selectedAsset) || 2)}
          </span>
        )}
      </div>
      
      <Dropdown>
        <DropdownTrigger>
          <Button 
            variant="bordered" 
            className="w-full justify-between bg-white/5 border-white/20 hover:border-white/30 h-10"
            endContent={<ChevronDown className="h-4 w-4 shrink-0 opacity-50" />}
          >
            <div className="flex items-center">
              {selectedToken.symbol.toUpperCase() === 'SOL' && (
                <Image 
                  src="/token-logos/solana_logo.png" 
                  alt="Solana Logo" 
                  width={20} 
                  height={20} 
                  className="mr-2"
                />
              )}
              {selectedToken.symbol.toUpperCase() === 'LABS' && (
                <Image 
                  src="/token-logos/epicentral_labs_logo.png" 
                  alt="Epicentral Labs Logo" 
                  width={20} 
                  height={20} 
                  className="mr-2"
                />
              )}
              <span className="text-white">{selectedToken.name} ({selectedToken.symbol})</span>
            </div>
          </Button>
        </DropdownTrigger>
        <DropdownMenu 
          aria-label="Asset selection"
          onAction={(key) => handleAssetChange(key as string)}
          className="bg-black/90 border-white/10"
        >
          {assets.map((asset) => (
            <DropdownItem key={asset.id}>
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
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
};