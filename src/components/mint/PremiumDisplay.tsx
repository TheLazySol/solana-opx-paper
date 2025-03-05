import React from 'react';
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useFormContext } from 'react-hook-form';

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
      <FormLabel>Option Premium</FormLabel>
      <div className="flex items-center gap-2">
        <FormControl>
          <Input
            disabled
            placeholder="Calculated premium"
            value={getValues('premium')}
          />
        </FormControl>
        <Button 
          type="button" 
          variant="outline" 
          size="icon"
          onClick={manualRefresh}
          disabled={isDebouncing}
          title={isDebouncing ? "Calculating..." : "Refresh premium calculation"}
        >
          <RefreshCcw className={`h-4 w-4 ${isDebouncing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <FormDescription>
        {lastUpdated ? (
          <>
            {getValues('premium') && <span className="text-[#4a85ff]">{` $${(Number(getValues('premium')) * 100).toFixed(2)} USD`}</span>}
          </>
        ) : 'Not calculated yet'}
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
}; 