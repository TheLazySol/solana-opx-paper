import React from 'react';
import { Input, Tooltip } from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { Info } from 'lucide-react';

export const QuantityInput = () => {
  const { getValues, setValue, setError, clearErrors } = useFormContext();

  const handleQuantityChange = (value: string) => {
    if (value === "") {
      setValue('quantity', '');
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 1000) {
      setError('quantity', { 
        message: `Quantity must be between 0.01 and 1000 for submission` 
      });
    } else if (num === 0) {
      // Allow zero but show a message that it needs to be at least 0.01 for submission
      setError('quantity', { 
        message: `Quantity must be at least 0.01 for submission` 
      });
    } else {
      clearErrors('quantity');
    }
    setValue('quantity', value);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-white/80">Quantity</label>
        <Tooltip content="The number of option contracts to sell. Fractional quantities are supported.">
          <Info className="w-4 h-4 text-white/40 cursor-help" />
        </Tooltip>
      </div>
      <Input
        type="number"
        max="10000"
        step="0.01"
        placeholder="Min Qty: 0.01"
        value={getValues('quantity')}
        onChange={(e) => handleQuantityChange(e.target.value)}
        variant="bordered"
        classNames={{
          input: "font-medium",
          inputWrapper: "bg-white/5 border-white/20 hover:border-white/30"
        }}
      />
    </div>
  );
};