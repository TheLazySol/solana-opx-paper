export interface Token {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

export const TOKENS: { [key: string]: Token } = {
  SOL: {
    address: "So11111111111111111111111111111111111111112",
    decimals: 9,
    symbol: "SOL",
    name: "Solana"
  },
  LABS: {
    address: "LABSv1wQBPjF3urhHweumwmRYbf2VYkSdcKcz7vJz4T",
    decimals: 9,
    symbol: "LABS",
    name: "Epicentral Labs"
  }
} 