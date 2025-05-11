import { PublicKey } from '@solana/web3.js';
import { TOKENS } from '@/constants/token-list/token-list';

// OMLP Program ID - Replace with the actual deployed program ID
export const OMLP_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

// PDA seeds for deriving various accounts
export const SEEDS = {
  POOL: 'pool',
  USER_POSITION: 'user_position',
  POOL_AUTH: 'pool_authority',
};

// Token mints for the supported assets in the OMLP
export const TOKEN_MINTS = Object.entries(TOKENS).reduce((acc, [symbol, token]) => {
  try {
    acc[symbol] = new PublicKey(token.address);
  } catch (e) {
    console.error(`Invalid mint for ${symbol}:`, token.address);
  }
  return acc;
}, {} as Record<string, PublicKey>);

// Utility function to derive pool address for a token
export function derivePoolAddress(tokenMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.POOL), tokenMint.toBuffer()],
    OMLP_PROGRAM_ID
  );
}

// Utility function to derive user position address
export function deriveUserPositionAddress(
  userWallet: PublicKey,
  tokenMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.USER_POSITION), userWallet.toBuffer(), tokenMint.toBuffer()],
    OMLP_PROGRAM_ID
  );
}

// Utility function to derive pool authority
export function derivePoolAuthority(tokenMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.POOL_AUTH), tokenMint.toBuffer()],
    OMLP_PROGRAM_ID
  );
} 