import React, { useState } from 'react';
import { Input, Tooltip, Button } from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { Info } from 'lucide-react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export const PremiumDisplay = ({ 
  lastUpdated, 
  manualRefresh, 
  isDebouncing,
  isCalculating,
  onOrderTypeChange 
}: { 
  lastUpdated: Date | null, 
  manualRefresh: () => void,
  isDebouncing: boolean,
  isCalculating?: boolean,
  onOrderTypeChange?: (type: 'market' | 'limit') => void
}) => {
  const { getValues, setValue, setError, clearErrors, watch } = useFormContext();
  
  // Get order type from form context, default to 'market' if not set
  const orderType = watch('orderType') || 'market';
  
  // Watch for strike price to determine if limit orders are allowed
  const strikePrice = watch('strikePrice');
  const hasStrikePrice = strikePrice && strikePrice !== '';

  const handleOrderTypeChange = (type: 'market' | 'limit') => {
    // Don't allow switching to limit if there's no strike price
    if (type === 'limit' && !hasStrikePrice) {
      return;
    }
    setValue('orderType', type);
    onOrderTypeChange?.(type);
  };

  // Switch back to market mode if user is in limit mode but strike price is cleared
  React.useEffect(() => {
    if (orderType === 'limit' && !hasStrikePrice) {
      setValue('orderType', 'market');
      onOrderTypeChange?.('market');
    }
  }, [hasStrikePrice, orderType, setValue, onOrderTypeChange]);

  const handlePremiumChange = (value: string) => {
    if (value === "") {
      setValue('premium', '');
      clearErrors('premium');
      return;
    }

    // Allow only numbers and one decimal point
    const sanitizedValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = sanitizedValue.split('.');
    if (parts.length > 2) {
      return; // Don't update if more than one decimal point
    }
    
    // Limit to 2 decimal places
    let formattedValue = sanitizedValue;
    if (parts.length === 2 && parts[1].length > 2) {
      formattedValue = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    const num = parseFloat(formattedValue);
    if (isNaN(num) || num < 0 || num > 10000) {
      setError('premium', { 
        message: `Premium must be between 0.01 and 10000` 
      });
    } else if (num === 0) {
      setError('premium', { 
        message: `Premium must be at least 0.01` 
      });
    } else {
      clearErrors('premium');
    }
    
    setValue('premium', formattedValue);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-white/60">
            Option Premium
          </label>
          <Tooltip 
            content={
              <div className="text-xs font-light text-white/70 max-w-xs">
                The price paid by the buyer, this is the max profit for the option seller at expiration.
                {lastUpdated && getValues('premium') && (
                  <div className="text-blue-400 mt-1">${(Number(getValues('premium')) * 100).toFixed(2)} USD per contract</div>
                )}
              </div>
            }
            placement="top"
          >
            <Info className="w-3 h-3 text-white/30 cursor-help" />
          </Tooltip>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={orderType === 'market' ? 'solid' : 'bordered'}
            className={`h-6 min-w-10 text-xs px-2 ${
              orderType === 'market' 
                ? 'bg-[#4a85ff]/20 text-[#4a85ff] border-[#4a85ff]/40' 
                : 'bg-transparent border-white/20 text-white/60 hover:border-white/30'
            }`}
            onClick={() => handleOrderTypeChange('market')}
          >
            MKT
          </Button>
          <Button
            size="sm"
            variant={orderType === 'limit' ? 'solid' : 'bordered'}
            isDisabled={!hasStrikePrice}
            className={`h-6 min-w-10 text-xs px-2 ${
              orderType === 'limit' 
                ? 'bg-[#4a85ff]/20 text-[#4a85ff] border-[#4a85ff]/40' 
                : !hasStrikePrice
                  ? 'bg-transparent border-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-transparent border-white/20 text-white/60 hover:border-white/30'
            }`}
            onClick={() => handleOrderTypeChange('limit')}
          >
            LMT
          </Button>
        </div>
      </div>
      <Input
        isReadOnly={orderType === 'market' || (orderType === 'limit' && !hasStrikePrice)}
        type="text"
        inputMode="decimal"
        placeholder={
          orderType === 'market' 
            ? "Calculated premium" 
            : !hasStrikePrice 
              ? "Enter strike price first"
              : "Enter premium"
        }
        value={
          orderType === 'market' 
            ? (isCalculating || isDebouncing 
                ? 'Calculating...' 
                : getValues('premium') 
                  ? `${Number(getValues('premium')).toFixed(2)}` 
                  : 'Enter option details')
            : getValues('premium') || ''
        }
        onChange={(e) => orderType === 'limit' && hasStrikePrice && handlePremiumChange(e.target.value)}
        variant="flat"
        startContent={
          orderType === 'market' 
            ? (isCalculating || isDebouncing) 
              ? <ArrowPathIcon className="w-4 h-4 text-blue-400 animate-spin" />
              : <span className="text-white/40">$</span>
            : <span className="text-white/40">$</span>
        }
        classNames={{
          base: "max-w-full",
          input: orderType === 'market' 
            ? (getValues('premium') ? "text-white" : "text-white/40") 
            : !hasStrikePrice 
              ? "text-white/40"
              : "text-white",
          inputWrapper: "bg-white/5 border-white/20 hover:border-white/30 data-[hover=true]:bg-white/10 data-[focus=true]:!bg-white/10 data-[focus-visible=true]:!bg-white/10 focus:!bg-white/10"
        }}
      />
    </div>
  );
};