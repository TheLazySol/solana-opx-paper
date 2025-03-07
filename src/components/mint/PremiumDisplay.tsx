import React from 'react';
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useFormContext } from 'react-hook-form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const PremiumDisplay = ({ 
  lastUpdated, 
  manualRefresh, 
  isDebouncing 
}: { 
  lastUpdated: Date | null, 
  manualRefresh: () => void,
  isDebouncing: boolean 
}) => {
  const { getValues } = useFormContext();

  return (
    <FormItem>
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <FormLabel className="mb-2 cursor-help border-b border-dotted border-slate-500">Option Premium</FormLabel>
          </TooltipTrigger>
          <TooltipContent>
            <p>The price paid by the buyer, this is the max profit for the option seller at expiration.</p>
            {lastUpdated && getValues('premium') && (
              <p className="text-[#4a85ff] mt-1">${(Number(getValues('premium')) * 100).toFixed(2)} USD per contract</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex items-center gap-2">
        <FormControl>
          <Input
            disabled
            placeholder="Calculated premium"
            value={getValues('premium')}
            className="h-10"
          />
        </FormControl>
        <Button 
          type="button" 
          variant="outline" 
          size="icon"
          onClick={manualRefresh}
          disabled={isDebouncing}
          title={isDebouncing ? "Calculating..." : "Refresh premium calculation"}
          className="h-10 w-10"
        >
          <RefreshCcw className={`h-4 w-4 ${isDebouncing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <FormMessage />
    </FormItem>
  );
}; 