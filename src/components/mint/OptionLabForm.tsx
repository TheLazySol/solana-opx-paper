/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/misc/utils"
import { format } from "date-fns"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useWallet } from "@solana/wallet-adapter-react"
import { useOptionsStore } from "@/stores/options/optionsStore"
import { PublicKey, Keypair } from "@solana/web3.js"
import { OptionOrder } from "@/types/options/orderTypes"
import { MakerSummary } from "./MakerSummary"
import { calculateOption } from '@/lib/tests/option-calculator'
import { AssetPrice } from '../price/asset-price'
import { getTokenPrice } from '@/lib/api/getTokenPrice'
import { TOKENS } from '@/lib/api/tokens'

const formSchema = z.object({
  asset: z.enum(["SOL", "LABS"]),
  optionType: z.enum(["call", "put"]),
  expirationDate: z.date({
    required_error: "Expiration date is required",
  }),
  strikePrice: z.string().refine(
    (val) => {
      const num = Number(val);
      if (isNaN(num) || num <= 0) return false;
      return true;
    },
    { message: "Strike price must be a positive number" }
  ),
  premium: z.string().refine(
    (val) => {
      // Allow empty string since the field will be filled automatically (for now)
      if (val === '') return true;
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Premium must be a valid number" }
  ),
  quantity: z.coerce
    .number()
    .int({ message: "Quantity must be a whole number" })
    .min(1, { message: "Quantity must be at least 1" })
})

// Get all bi-weekly expiration dates between two dates for the calendar
function getBiWeeklyDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    // Add 14 days (2 weeks)
    currentDate.setDate(currentDate.getDate() + 14);
  }
  return dates;
}

// Generate the allowed dates
const startDate = new Date(2025, 0, 1); // January 1st, 2025
const endDate = new Date(2026, 0, 1);   // January 1st, 2026
const allowedDates = getBiWeeklyDates(startDate, endDate);

const EDIT_REFRESH_INTERVAL = 1000; // 1 second debounce
const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

export function OptionLabForm() {
  const router = useRouter()
  const { publicKey } = useWallet()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addOption = useOptionsStore((state) => state.addOption)
  const [pendingOptions, setPendingOptions] = useState<Array<z.infer<typeof formSchema>>>([])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      asset: "SOL",
      optionType: "call",
      strikePrice: '',
      premium: '',
      quantity: 1,
      expirationDate: undefined,
    },
  })

  // Add state for calculated values
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null)
  // Add state to track when premium is being calculated
  const [isCalculatingPremium, setIsCalculatingPremium] = useState(false)
  // Add state to track when premium was last updated
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Add debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout>()
  // Add auto-refresh timer ref
  const autoRefreshTimer = useRef<NodeJS.Timeout>()

  // Add state for asset price
  const [assetPrice, setAssetPrice] = useState<number | null>(null)

  // Update the calculateOptionPrice function
  const calculateOptionPrice = useCallback(async (values: z.infer<typeof formSchema>) => {
    const spotPrice = await getTokenPrice(values.asset)
    if (!spotPrice || !values.expirationDate) return

    setIsCalculatingPremium(true)

    const timeUntilExpiry = Math.floor(
      (values.expirationDate.getTime() - Date.now()) / 1000 // Convert to seconds
    )

    try {
      // These values should ideally be fetched from an API in a production environment
      const volatility = 0.35  // 35% volatility
      const riskFreeRate = 0.08  // 8% risk-free rate

      const result = await calculateOption({
        isCall: values.optionType === 'call',
        strikePrice: Number(values.strikePrice),
        spotPrice: spotPrice.price,
        timeUntilExpirySeconds: timeUntilExpiry,
        volatility,
        riskFreeRate
      })

      console.log('Option calculation result:', result.price.toFixed(4));
      setCalculatedPrice(result.price)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error calculating option:', error)
    } finally {
      setIsCalculatingPremium(false)
    }
  }, [])

  // Watch for changes to strike price and expiration date
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    const values = form.getValues()
    const strikePrice = values.strikePrice
    
    // Only proceed if we have a strike price
    if (strikePrice) {
      debounceTimer.current = setTimeout(() => {
        // If no expiration date is set, use the first available date for calculation
        if (!values.expirationDate) {
          const tempValues = {...values};
          tempValues.expirationDate = allowedDates[0];
          calculateOptionPrice(tempValues);
        } else {
          calculateOptionPrice(values);
        }
      }, EDIT_REFRESH_INTERVAL); // 1 second debounce
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [calculateOptionPrice, form])

  // Watch for changes to strike price and expiration date to update premium
  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const values = form.getValues();
    if (values.strikePrice && values.expirationDate && !isCalculatingPremium) {
      // Set a new debounce timer
      debounceTimer.current = setTimeout(() => {
        console.log('Calculating premium...');
        calculateOptionPrice(values);
      }, EDIT_REFRESH_INTERVAL); // Use the 1 second constant
    }

    // Clean up the timer when component unmounts or dependencies change
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [form.watch('strikePrice'), form.watch('expirationDate'), calculateOptionPrice, isCalculatingPremium]);

  // Update the premium field when calculatedPrice changes
  useEffect(() => {
    if (calculatedPrice !== null) {
      form.setValue('premium', calculatedPrice.toFixed(4), { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      })
    }
  }, [calculatedPrice, form])

  // Auto-refresh premium calculation every 5 seconds
  useEffect(() => {
    // Clear any existing timer when component unmounts or dependencies change
    if (autoRefreshTimer.current) {
      clearInterval(autoRefreshTimer.current)
    }

    // Only set up auto-refresh if we have the necessary values
    const checkAndCalculate = () => {
      const currentValues = form.getValues()
      if (currentValues.strikePrice && currentValues.expirationDate && !isCalculatingPremium) {
        console.log('Auto-refreshing premium calculation...')
        calculateOptionPrice(currentValues)
      }
    }

    // Set up the interval to recalculate every 5 seconds if we have valid values
    const values = form.getValues()
    if (values.strikePrice && values.expirationDate) {
      autoRefreshTimer.current = setInterval(checkAndCalculate, AUTO_REFRESH_INTERVAL); // 5 seconds
    }

    // Clean up the interval when component unmounts or dependencies change
    return () => {
      if (autoRefreshTimer.current) {
        clearInterval(autoRefreshTimer.current)
      }
    }
  }, [form, calculateOptionPrice, isCalculatingPremium])

  useEffect(() => {
    const fetchAssetPrice = async () => {
      const values = form.getValues();
      const priceData = await getTokenPrice(values.asset);
      if (priceData) {
        setAssetPrice(priceData.price);
      } else {
        setAssetPrice(null);
      }
    };

    fetchAssetPrice();
    const priceInterval = setInterval(fetchAssetPrice, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(priceInterval);
  }, [form, form.watch('asset')]);

  const addOptionToSummary = () => {
    const values = form.getValues()
    
    // Validate all fields are present
    if (!values.strikePrice || !values.expirationDate) {
      form.setError('root', { 
        message: 'Please fill in all required fields' 
      })
      return
    }
    
    // Ensure premium is calculated
    if (isCalculatingPremium || calculatedPrice === null) {
      form.setError('root', { 
        message: 'Please wait for premium calculation to complete' 
      })
      return
    }
    
    // Get unique strikes and option types
    const uniqueStrikes = new Set(pendingOptions.map(opt => opt.strikePrice))
    const uniqueOptionTypes = new Set(pendingOptions.map(opt => opt.optionType))
    
    // Check if new option would exceed limits
    if (!uniqueStrikes.has(values.strikePrice)) {
      if (uniqueStrikes.size >= 4) {
        form.setError('root', { 
          message: 'Maximum of 4 different strike prices allowed' 
        })
        return
      }
    }
    
    if (!uniqueOptionTypes.has(values.optionType) && uniqueOptionTypes.size >= 2) {
      form.setError('root', { 
        message: 'Only calls and puts are allowed' 
      })
      return
    }
    
    // Add the option if it passes the checks
    setPendingOptions(prev => [...prev, values])
    
    // Reset form but keep the calculated premium state
    setCalculatedPrice(null)
    form.reset({
      asset: "SOL",
      optionType: "call",
      strikePrice: '',
      premium: '',
      quantity: 1,
      expirationDate: values.expirationDate // Keep the same date
    })
    form.clearErrors('root')
  }

  const removeOptionFromSummary = (index: number) => {
    setPendingOptions(prev => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault() // Prevent default form submission
    if (!publicKey || pendingOptions.length === 0) return

    setIsSubmitting(true)
    try {
      // Create all pending options
      pendingOptions.forEach(values => {
        const newOption: OptionOrder = {
          publicKey: new PublicKey(Keypair.generate().publicKey),
          strike: Number(values.strikePrice),
          price: Number(values.premium),
          bidPrice: 0,
          askPrice: Number(values.premium),
          type: 'sell',
          optionSide: values.optionType,
          timestamp: new Date(),
          owner: publicKey,
          status: 'pending',
          size: values.quantity,
          expirationDate: format(values.expirationDate, 'yyyy-MM-dd')
        }
        addOption(newOption)
      })

      setPendingOptions([])
      router.push("/trade")
    } catch (error) {
      console.error('Error minting options:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl w-full">
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-8">
          <FormField
            control={form.control}
            name="asset"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TOKENS).map(([symbol, token]) => (
                      <SelectItem key={symbol} value={symbol}>
                        {token.name} ({token.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="optionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Option Type</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === "call" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => field.onChange("call")}
                    >
                      Call
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "put" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => field.onChange("put")}
                    >
                      Put
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expirationDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Expiration Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        // Disable dates before current UTC time
                        const now = new Date();
                        if (date < now) return true;
                        
                        // Disable dates not in the allowed bi-weekly dates
                        return !allowedDates.some(allowedDate => 
                          allowedDate.getFullYear() === date.getFullYear() &&
                          allowedDate.getMonth() === date.getMonth() &&
                          allowedDate.getDate() === date.getDate()
                        );
                      }}
                      initialFocus
                      defaultMonth={startDate}
                      fromDate={new Date()} // Current date as minimum
                      toDate={endDate}      // January 1st, 2026 as maximum
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select from available bi-weekly expiration dates
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strikePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Strike Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step={form.watch("asset") === "SOL" ? "1" : "0.000001"}
                    min="0"
                    placeholder="Enter strike price"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      const asset = form.watch("asset");
                      
                      if (value === "") {
                        field.onChange(value);
                        return;
                      }

                      const num = Number(value);
                      if (num < 0) return;

                      if (asset === "SOL") {
                        // For SOL, only allow whole numbers
                        field.onChange(Math.floor(num).toString());
                      } else {
                        // For LABS, limit to 6 decimal places
                        field.onChange(Number(num.toFixed(6)).toString());
                      }
                      
                      // Trigger calculation after strike price changes
                      if (value) {
                        if (debounceTimer.current) {
                          clearTimeout(debounceTimer.current);
                        }
                        debounceTimer.current = setTimeout(() => {
                          const values = form.getValues();
                          // If no expiration date is set, use the first available date for calculation
                          if (!values.expirationDate) {
                            const tempValues = {...values};
                            tempValues.expirationDate = allowedDates[0];
                            calculateOptionPrice(tempValues);
                          } else {
                            calculateOptionPrice(values);
                          }
                        }, EDIT_REFRESH_INTERVAL); // 1 second debounce
                      }
                    }}
                  />
                </FormControl>
                <FormDescription>
                  The price at which the option can be exercised <span className="text-[#4a85ff]">(Current Price: {assetPrice ? `$${assetPrice.toFixed(4)}` : 'Loading...'})</span>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="premium"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Premium</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.0001"
                    disabled={true}
                    placeholder={isCalculatingPremium 
                      ? "Calculating premium..." 
                      : (calculatedPrice 
                        ? `$${calculatedPrice.toFixed(4)}` 
                        : "Waiting for strike price...")}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Premium is automatically calculated using the Black-Scholes model
                  {isCalculatingPremium && (
                    <span className="ml-1 text-[#4a85ff]">
                      (Calculating...)
                    </span>
                  )}
                  {!isCalculatingPremium && (
                    <span className="ml-1 text-[#4a85ff]">
                      (Auto-updates every 5s)
                    </span>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter quantity"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        field.onChange(value);
                        return;
                      }
                      
                      const num = parseInt(value);
                      if (num < 1) return;
                      field.onChange(Math.floor(num));
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Each option contract represents 100 tokens of the underlying asset
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}

          <Button 
            type="button" 
            variant="secondary"
            onClick={addOptionToSummary}
            disabled={
              !form.formState.isValid || 
              !form.getValues("strikePrice") || 
              !form.getValues("premium") ||
              !form.getValues("expirationDate")
            }
          >
            Add Option
          </Button>

          <MakerSummary 
            options={pendingOptions}
            onRemoveOption={removeOptionFromSummary}
          />

          {pendingOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Please add at least 1 option contract to the summary before minting!
            </p>
          )}

          <Button 
            type="submit" 
            disabled={isSubmitting || pendingOptions.length === 0}
            className="w-full"
          >
            {isSubmitting ? "Minting..." : `Mint ${pendingOptions.length} Option${pendingOptions.length !== 1 ? 's' : ''}`}
          </Button>
        </form>
      </Form>
    </div>
  )
} 