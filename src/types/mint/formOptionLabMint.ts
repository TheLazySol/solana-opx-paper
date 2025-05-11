import * as z from "zod";
import { TOKENS } from "@/constants/token-list/token-list";

/**
 * Zod schema for option minting form validation
 * 
 * This schema defines the structure and validation rules for the option minting form,
 * ensuring all required fields are properly validated before submission.
 */
export const formSchema = z.object({
  /**
   * The underlying asset for the option, must be one of the tokens defined in TOKENS constant
   */
  asset: z.enum(Object.keys(TOKENS) as [string, ...string[]]),
  
  /**
   * The type of option - either "call" (right to buy) or "put" (right to sell)
   */
  optionType: z.enum(["call", "put"]),
  
  /**
   * The date when the option expires and can no longer be exercised
   */
  expirationDate: z.date({
    required_error: "Expiration date is required",
  }),
  
  /**
   * The price at which the option can be exercised
   * Must be a non-empty string
   */
  strikePrice: z.string().refine(val => val !== '', {
    message: "Strike price is required",
  }),
  
  /**
   * The price paid for the option contract
   * Can be empty during form editing, but must be a valid non-negative number when provided
   */
  premium: z.string().refine(
    (val) => {
      if (val === '') return true;
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Premium must be a valid number" }
  ),
  
  /**
   * The number of option contracts to mint
   * Must be a whole number between 1 and 100
   */
  quantity: z.coerce
    .number()
    .int({ message: "Quantity must be a whole number" })
    .min(1, { message: "Quantity must be at least 1" })
    .max(100, { message: "Quantity must be at most 100" })
});

/**
 * Type definition derived from the form schema
 * Used for type checking form data throughout the application
 */
export type FormData = z.infer<typeof formSchema>; 