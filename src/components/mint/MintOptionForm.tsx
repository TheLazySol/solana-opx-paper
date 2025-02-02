"use client"

import { useState } from "react"
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
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useWallet } from "@solana/wallet-adapter-react"
import { useOptionsStore } from "@/stores/optionsStore"
import { PublicKey, Keypair } from "@solana/web3.js"
import { OptionOrder } from "@/types/order"

const formSchema = z.object({
  asset: z.enum(["SOL", "LABS"]),
  optionType: z.enum(["call", "put"]),
  expirationDate: z.date(),
  strikePrice: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Strike price must be a positive number" }
  ),
  premium: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Premium must be a positive number" }
  ),
})

export function MintOptionForm() {
  const router = useRouter()
  const { publicKey } = useWallet()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addOption = useOptionsStore((state) => state.addOption)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      asset: "SOL",
      optionType: "call",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!publicKey) return

    setIsSubmitting(true)
    try {
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
        size: 1,
        expirationDate: format(values.expirationDate, 'yyyy-MM-dd')
      }

      addOption(newOption)

      router.push("/trade")
    } catch (error) {
      console.error('Error minting option:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                  <SelectItem value="SOL">Solana (SOL)</SelectItem>
                  <SelectItem value="LABS">Epicentral Labs (LABS)</SelectItem>
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
                    disabled={(date) =>
                      date < new Date() || date > new Date(2025, 12, 31)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
                  step="0.01"
                  placeholder="Enter strike price"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The price at which the option can be exercised
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
                  step="0.01"
                  placeholder="Enter premium"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The price to purchase this option
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Minting..." : "Mint Option"}
        </Button>
      </form>
    </Form>
  )
} 