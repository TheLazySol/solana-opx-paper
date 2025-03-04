import { TOKENS as CONST_TOKENS } from '@/constants/tokens/tokens'

export interface Token {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

export const TOKENS: { [key: string]: Token } = CONST_TOKENS