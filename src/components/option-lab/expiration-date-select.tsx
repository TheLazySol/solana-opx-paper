import React from 'react';
import { 
  Button, 
  Popover, 
  PopoverTrigger, 
  PopoverContent,
  Tooltip
} from '@heroui/react';
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Info } from "lucide-react";
import { cn } from "@/utils/utils";
import { useFormContext } from 'react-hook-form';
import { format } from "date-fns";
import { getWeeklyFridayDates, startDate, endDate } from '@/constants/constants';

const allowedDates = getWeeklyFridayDates(startDate, endDate);

export const ExpirationDatePicker = () => {
  const { getValues, setValue } = useFormContext();
  const debounceTimer = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleDateChange = (date: Date | undefined) => {
    setValue('expirationDate', date);
    if (date) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        const values = getValues();
        if (values.strikePrice) {
          // calculateOptionPrice(values);
        }
      }, 2000); // 2 second debounce
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-white/80">Expiration Date</label>
        <Tooltip content="The date when the option expires. The option can only be exercised on or before this date.">
          <Info className="w-4 h-4 text-white/40 cursor-help" />
        </Tooltip>
      </div>
      <Popover placement="bottom">
        <PopoverTrigger>
          <Button
            variant="bordered"
            className={cn(
              "w-full justify-start text-left font-normal h-10 border-[0.5px] rounded-lg",
              "bg-white/5 border-white/20 hover:border-white/30",
              !getValues('expirationDate') && "text-white/40"
            )}
            endContent={<CalendarIcon className="h-4 w-4 opacity-50" />}
          >
            {getValues('expirationDate') ? (
              format(getValues('expirationDate'), "PPP")
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={getValues('expirationDate')}
            onSelect={handleDateChange}
            disabled={(date) => {
              const now = new Date();
              if (date < now) return true;
              return !allowedDates.some(allowedDate => 
                allowedDate.getFullYear() === date.getFullYear() &&
                allowedDate.getMonth() === date.getMonth() &&
                allowedDate.getDate() === date.getDate()
              );
            }}
            initialFocus
            defaultMonth={startDate}
            fromDate={new Date()}
            toDate={endDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};