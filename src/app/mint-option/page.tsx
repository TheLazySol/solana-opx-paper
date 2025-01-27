'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, InfoIcon } from 'lucide-react'

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AssetPrice } from '@/components/price/asset-price'

// Generate expiration dates (bi-weekly and monthly for a year)
const generateExpirationDates = () => {
  const dates: Date[] = []
  const uniqueDates = new Map<string, Date>()
  const today = new Date()
  
  // Generate bi-weekly dates
  for (let i = 0; i < 26; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + (i * 14))
    uniqueDates.set(date.toISOString(), date)
  }
  
  // Generate monthly dates
  for (let i = 1; i <= 12; i++) {
    const date = new Date(today)
    date.setMonth(today.getMonth() + i)
    uniqueDates.set(date.toISOString(), date)
  }
  
  return Array.from(uniqueDates.values())
    .sort((a, b) => a.getTime() - b.getTime())
    .map(date => format(date, 'PPP'))
}

const formSchema = z.object({
  asset: z.string({
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

export default function MintOptionPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
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
                render={({ field }: { field: FormField }) => (
                  <FormItem>
                    <FormLabel>Underlying Asset</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select underlying asset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SOL">SOL</SelectItem>
                        <SelectItem value="LABS">LABS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      <AssetPrice asset={field.value} />
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expirationDate"
                render={({ field }: { field: FormField }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expiration date" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {generateExpirationDates().map((date) => (
                          <SelectItem key={date} value={date}>
                            {date}
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
                name="strikePrice"
                render={({ field }: { field: FormField }) => (
                  <FormItem>
                    <FormLabel>Strike Price</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter strike price" 
                        onChange={(e) => field.onChange(e.target.value)}
                        value={field.value}
                        min="1"
                        step="1"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a positive whole number for the strike price.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }: { field: FormField }) => (
                  <FormItem>
                    <FormLabel>Number of Options</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter quantity" 
                        onChange={(e) => field.onChange(e.target.value)}
                        value={field.value}
                        min="1"
                        step="1"
                      />
                    </FormControl>
                    <FormDescription className="flex items-center gap-2">
                      <InfoIcon className="h-4 w-4" />
                      Each option represents 100 tokens of the underlying asset.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="premium"
                render={({ field }: { field: FormField }) => (
                  <FormItem>
                    <FormLabel>Premium per Option</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter premium amount" 
                        onChange={(e) => field.onChange(e.target.value)}
                        value={field.value}
                        min="0.000001"
                        step="0.000001"
                        max="999999999.999999"
                      />
                    </FormControl>
                    <FormDescription>
                      This is the total price a buyer would pay for 1 option.
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