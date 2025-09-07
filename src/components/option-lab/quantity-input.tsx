import React from 'react';
import { Input, Tooltip } from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { Info } from 'lucide-react';

export const QuantityInput = () => {
  const { getValues, setValue, setError, clearErrors } = useFormContext();

  const handleQuantityChange = (value: string) => {
    if (value === "") {
      setValue('quantity', '');
      clearErrors('quantity');
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
    if (isNaN(num) || num < 0 || num > 1000) {
      setError('quantity', { 
        message: `Quantity must be between 0.01 and 1000 for submission` 
      });
    } else if (num === 0) {
      setError('quantity', { 
        message: `Quantity must be at least 0.01 for submission` 
      });
    } else {
      clearErrors('quantity');
    }
    
    setValue('quantity', formattedValue);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-white/80">
          Contract Quantity <span className="opacity-50">(1 = 100 Underlying Tokens)</span>
        </label>
        <Tooltip 
          content={
            <div className="text-xs font-light text-white/70 max-w-xs">
              The number of option contracts to short sell
            </div>
          }
          placement="top"
        >
          <Info className="w-3 h-3 text-white/30 cursor-help" />
        </Tooltip>
      </div>
      <Input
        type="text"
        inputMode="decimal"
        max="10000"
        step="0.01"
        placeholder="Min Qty: 0.01 (2 decimal max)"
        value={getValues('quantity')}
        onChange={(e) => handleQuantityChange(e.target.value)}
        variant="flat"
        classNames={{
          input: "font-medium text-white bg-transparent",
          inputWrapper: "!bg-white/5 border-white/20 hover:border-white/30 h-10 border-[0.5px] rounded-lg data-[focus=true]:border-[#4a85ff]/60 data-[focus=true]:!bg-white/5"
        }}
      />
    </div>
  );
};