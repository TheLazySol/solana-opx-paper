'use client'

import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, InfoIcon } from 'lucide-react'
import { getTokenPrice } from '@/lib/birdeye'
import { usePageVisibility } from '@/hooks/usePageVisibility'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssetPrice } from '@/components/price/asset-price'
import { EXPIRATION_DATES } from "@/lib/constants"

const formSchema = z.object({
  asset: z.enum(['SOL', 'LABS'], {
    required_error: "Please select an underlying asset.",
  }),
  expirationDate: z.string({
    required_error: "Please select an expiration date.",
  }),
  strikePrice: z.string().refine((val: string) => {
    const num = Number(val);
    return !isNaN(num) && num > 0 && num % 1 === 0;
  }, {
    message: "Strike price must be a positive whole number.",
  }),
  optionType: z.enum(['call', 'put'], {
    required_error: "Please select option type.",
  }),
  quantity: z.string().refine((val: string) => {
    const num = Number(val);
    return !isNaN(num) && num > 0 && num % 1 === 0;
  }, {
    message: "Quantity must be a positive whole number.",
  }),
  premium: z.string().refine((val: string) => {
    const num = Number(val);
    const decimalPlaces = val.includes('.') ? val.split('.')[1].length : 0;
    return !isNaN(num) && num >= 0.000001 && decimalPlaces <= 6;
  }, {
    message: "Premium must be at least 0.000001 and have maximum 6 decimal places.",
  }),
})

// Type for the form fields
type FormField = {
  onChange: (...event: any[]) => void;
  value: string;
  name: string;
  onBlur: () => void;
}

export function MintOptionFeature() {
  const [selectedAsset, setSelectedAsset] = useState<string>('')
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [previousPrice, setPreviousPrice] = useState<number | null>(null)
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const isPageVisible = usePageVisibility()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  useEffect(() => {
    let intervalId: NodeJS.Timeout
    let isSubscribed = true

    const fetchPrice = async () => {
      if (!selectedAsset || !isPageVisible) return
      
      if (initialLoad) setIsLoading(true)
      try {
        const priceData = await getTokenPrice(selectedAsset)
        if (priceData && isSubscribed) {
          if (currentPrice !== null && priceData.price !== currentPrice) {
            setPreviousPrice(currentPrice)
            setPriceChangeDirection(priceData.price > currentPrice ? 'up' : 'down')
            setTimeout(() => {
              if (isSubscribed) {
                setPriceChangeDirection(null)
              }
            }, 1000)
          }
          setCurrentPrice(priceData.price)
        }
      } catch (error) {
        console.error('Error fetching price:', error)
      } finally {
        if (initialLoad && isSubscribed) {
          setInitialLoad(false)
          setIsLoading(false)
        }
      }
    }

    if (selectedAsset && isPageVisible) {
      fetchPrice()
      intervalId = setInterval(fetchPrice, 5000)
    }

    return () => {
      isSubscribed = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [selectedAsset, isPageVisible])

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newOption = {
      strike: Number(values.strikePrice),
      call: {
        iv: Math.random() * 100,
        volume: 0,
        oi: 0,
        theta: -(Math.random() * 0.1),
        delta: Math.random(),
        bid: Number(values.premium) * 0.95,
        ask: Number(values.premium) * 1.05,
      },
      put: {
        iv: Math.random() * 100,
        volume: 0,
        oi: 0,
        theta: -(Math.random() * 0.1),
        delta: -Math.random(),
        bid: Number(values.premium) * 0.95,
        ask: Number(values.premium) * 1.05,
      }
    }

    // Here you would typically dispatch this to your state management solution
    console.log('New option created:', newOption)
  }

  const formatPriceWithAnimation = (currentPrice: number | null, previousPrice: number | null, symbol: string) => {
    if (!currentPrice) return 'N/A'
    
    const formatNumber = (num: number) => {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: symbol === 'SOL' ? 2 : 6
      })
    }

    const current = formatNumber(currentPrice)
    const previous = previousPrice ? formatNumber(previousPrice) : null

    if (!previous || !priceChangeDirection) {
      return <span>${current}</span>
    }

    // Split the price strings into characters
    const currentChars = current.split('')
    const previousChars = previous.split('')

    return (
      <span>
        $
        {currentChars.map((char, index) => {
          const hasChanged = char !== previousChars[index]
          const isDigit = /\d/.test(char)
          
          return (
            <span
              key={index}
              className={isDigit && hasChanged ? `price-${priceChangeDirection}` : undefined}
            >
              {char}
            </span>
          )
        })}
      </span>
    )
  }

  return (
    <div className="container max-w-2xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Mint an Option</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="asset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value)
                        setSelectedAsset(value)
                        setInitialLoad(true) // Reset initial load for new asset
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select asset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SOL">SOL</SelectItem>
                        <SelectItem value="LABS">LABS</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedAsset && (
                      <div className="mt-2">
                        {initialLoad && isLoading ? (
                          <div className="text-sm text-muted-foreground animate-pulse">
                            Loading price...
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Current market price: {formatPriceWithAnimation(currentPrice, previousPrice, selectedAsset)}
                          </div>
                        )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expirationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={EXPIRATION_DATES[0].value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expiration date" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXPIRATION_DATES.map((date) => (
                          <SelectItem 
                            key={date.value} 
                            value={date.value}
                            className="text-sm"
                          >
                            {date.label}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="put">Put</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <div className="relative">
                        <span className="absolute left-3 top-2.5">$</span>
                        <Input
                          {...field}
                          type="number"
                          placeholder="0"
                          className="pl-6"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter the strike price for the option
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
                      <Input {...field} type="number" placeholder="1" />
                    </FormControl>
                    <FormDescription>
                      Number of contracts to mint
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
                      <div className="relative">
                        <span className="absolute left-3 top-2.5">$</span>
                        <Input
                          {...field}
                          type="number"
                          step="0.000001"
                          placeholder="0.000000"
                          className="pl-6"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Set the premium price per contract
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">Mint Option</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
} 