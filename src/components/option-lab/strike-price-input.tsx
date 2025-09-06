import React from 'react';
import { Input, Tooltip } from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { Info } from 'lucide-react';

const getStepValue = (price: number | null): string => {
  return "1"; // Always use step of 1 for whole numbers only
};

const validateStrikePrice = (value: string, assetPrice: number | null): boolean => {
  if (!value) return true;
  const numValue = parseFloat(value);
  // Only allow whole numbers (integers)
  return Number.isInteger(numValue) && numValue > 0;
};

export const StrikePriceInput = ({ assetPrice }: { assetPrice: number | null }) => {
  const { getValues, setValue, setError, clearErrors } = useFormContext();
  const debounceTimer = React.useRef<NodeJS.Timeout>();

  // Cleanup timer on unmount
  React.useEffect(() => {
    const timer = debounceTimer.current;
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  const handleStrikePriceChange = (value: string) => {
    // Clear any existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Remove any non-digit characters (except empty string)
    const numericValue = value.replace(/[^\d]/g, '');
    
    if (numericValue === "") {
      setValue('strikePrice', "", { shouldValidate: false });
      clearErrors("strikePrice");
      return;
    }
    
    if (!validateStrikePrice(numericValue, assetPrice)) {
      setError("strikePrice", { message: "Please enter a whole number greater than 0" });
    } else {
      clearErrors("strikePrice");
    }
    
    // Only set value if it's different to prevent unnecessary updates
    const currentValue = getValues('strikePrice');
    if (currentValue !== numericValue) {
      setValue('strikePrice', numericValue, { shouldValidate: false });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-white/80">Strike Price</label>
        <Tooltip content="The market price at which the option can be exercised by the buyer.">
          <Info className="w-4 h-4 text-white/40 cursor-help" />
        </Tooltip>
      </div>
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        step="1"
        min="1"
        placeholder="Enter Strike Price"
        value={getValues('strikePrice')}
        onChange={(e) => handleStrikePriceChange(e.target.value)}
        variant="flat"
        classNames={{
          input: "font-medium text-white bg-transparent",
          inputWrapper: "!bg-white/5 border-white/20 hover:border-white/30 h-10 border-[0.5px] rounded-lg data-[focus=true]:border-[#4a85ff]/60 data-[focus=true]:!bg-white/5"
        }}
        startContent={<span className="text-white/40">$</span>}
      />
    </div>
  );
};