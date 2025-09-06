import React from 'react';
import { Input, Tooltip } from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { Info } from 'lucide-react';

const getStepValue = (price: number | null): string => {
  if (!price) return "0.0001";
  if (price >= 100) return "1";
  if (price >= 1) return "0.5";
  if (price >= 0.01) return "0.005";
  return "0.0001";
};

const validateStrikePrice = (value: string, assetPrice: number | null): boolean => {
  if (!value || !assetPrice) return true;
  const numValue = parseFloat(value);
  if (assetPrice >= 100) return Number.isInteger(numValue);
  if (assetPrice >= 1) return (numValue * 2) % 1 === 0;
  if (assetPrice >= 0.01) return (numValue * 200) % 1 === 0;
  return (numValue * 10000) % 1 === 0;
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
    
    if (value === "") {
      setValue('strikePrice', "", { shouldValidate: false });
      clearErrors("strikePrice");
      return;
    }
    
    if (!validateStrikePrice(value, assetPrice)) {
      let errorMessage = "";
      if (assetPrice && assetPrice >= 100) {
        errorMessage = "For assets worth $100+, no decimal places are allowed";
      } else if (assetPrice && assetPrice >= 1) {
        errorMessage = "For assets between $1-$100, only $0.50 steps are allowed";
      } else if (assetPrice && assetPrice >= 0.01) {
        errorMessage = "For assets between $0.01-$1, only $0.005 steps are allowed";
      } else {
        errorMessage = "For assets worth less than $0.01, only $0.0001 steps are allowed";
      }
      setError("strikePrice", { message: errorMessage });
    } else {
      clearErrors("strikePrice");
    }
    
    // Only set value if it's different to prevent unnecessary updates
    const currentValue = getValues('strikePrice');
    if (currentValue !== value) {
      setValue('strikePrice', value, { shouldValidate: false });
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
        step={getStepValue(assetPrice)}
        min="0"
        placeholder="Enter Strike Price"
        value={getValues('strikePrice')}
        onChange={(e) => handleStrikePriceChange(e.target.value.replace('$', ''))}
        variant="flat"
        classNames={{
          input: "font-medium text-white",
          inputWrapper: "bg-white/5 border border-white/20 rounded-lg backdrop-blur-sm h-10 hover:bg-white/8 data-[hover=true]:bg-white/8 data-[focus=true]:bg-white/10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:shadow-none data-[focus=true]:ring-0 data-[focus=true]:shadow-none border-[0.5px] hover:border-white/30"
        }}
        startContent={<span className="text-white/40">$</span>}
      />
    </div>
  );
};