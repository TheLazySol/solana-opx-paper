'use client'

import {TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID} from '@solana/spl-token'
import {useConnection, useWallet} from '@solana/wallet-adapter-react'
import {
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
  PublicKey as SolanaPublicKey
} from '@solana/web3.js'
import { address, Address } from 'gill'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {useTransactionToast} from '../../components/ui/ui-layout'

// Helper function to convert gill Address to SolanaPublicKey
function toSolanaPublicKey(addressOrPublicKey: SolanaPublicKey | Address): SolanaPublicKey {
  return addressOrPublicKey instanceof SolanaPublicKey 
    ? addressOrPublicKey 
    : new SolanaPublicKey(addressOrPublicKey.toString());
}

/**
 * Hook to fetch the SOL balance for a given address
 * @param address - The Solana public key or Gill address to check balance for
 * @returns Query object with the account's SOL balance
 */
export function useGetBalance({ address: addressOrPublicKey }: { address: SolanaPublicKey | Address }) {
  const { connection } = useConnection()
  
  // Convert to SolanaPublicKey if it's an Address type from gill
  const publicKey = toSolanaPublicKey(addressOrPublicKey);

  return useQuery({
    queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address: publicKey }],
    queryFn: async () => {
      try {
        return await connection.getBalance(publicKey);
      } catch (error) {
        console.error("Error fetching balance:", error);
        throw error;
      }
    },
    retry: 3,
    staleTime: 10000, // 10 seconds
  })
}

/**
 * Hook to fetch transaction signatures for a given address
 * @param address - The Solana public key or Gill address to fetch signatures for
 * @returns Query object with the account's transaction signatures
 */
export function useGetSignatures({ address: addressValue }: { address: SolanaPublicKey | Address }) {
  const { connection } = useConnection()
  
  // Convert to SolanaPublicKey if it's an Address type from gill
  const publicKey = toSolanaPublicKey(addressValue);

  return useQuery({
    queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address: publicKey }],
    queryFn: async () => {
      try {
        return await connection.getSignaturesForAddress(publicKey);
      } catch (error) {
        console.error("Error fetching signatures:", error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to fetch token accounts owned by a given address
 * @param address - The Solana public key or Gill address to fetch token accounts for
 * @returns Query object with the account's token accounts from both TOKEN_PROGRAM_ID and TOKEN_2022_PROGRAM_ID
 */
export function useGetTokenAccounts({ address: addressValue }: { address: SolanaPublicKey | Address }) {
  const { connection } = useConnection()
  
  // Convert to SolanaPublicKey if it's an Address type from gill
  const publicKey = toSolanaPublicKey(addressValue);

  return useQuery({
    queryKey: ['get-token-accounts', { endpoint: connection.rpcEndpoint, address: publicKey }],
    queryFn: async () => {
      try {
        // Fetch token accounts from both the legacy token program and the Token-2022 program
        const [tokenAccounts, token2022Accounts] = await Promise.all([
          connection.getParsedTokenAccountsByOwner(publicKey, {
            programId: TOKEN_PROGRAM_ID,
          }),
          connection.getParsedTokenAccountsByOwner(publicKey, {
            programId: TOKEN_2022_PROGRAM_ID,
          }),
        ]);
        // Combine both types of token accounts into a single array
        return [...tokenAccounts.value, ...token2022Accounts.value];
      } catch (error) {
        console.error("Error fetching token accounts:", error);
        throw error;
      }
    },
    retry: 3,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to transfer SOL from the connected wallet to another address
 * @param address - The Solana public key or Gill address of the sender
 * @returns Mutation object for transferring SOL with success/error handling
 */
export function useTransferSol({ address: addressValue }: { address: SolanaPublicKey | Address }) {
  const { connection } = useConnection()
  const transactionToast = useTransactionToast()
  const wallet = useWallet()
  const client = useQueryClient()
  
  // Convert to SolanaPublicKey if it's an Address type from gill
  const publicKey = toSolanaPublicKey(addressValue);

  return useMutation({
    mutationKey: ['transfer-sol', { endpoint: connection.rpcEndpoint, address: publicKey }],
    mutationFn: async (input: { destination: SolanaPublicKey | Address; amount: number }) => {
      let signature: TransactionSignature = ''
      try {
        // Check wallet connection
        if (!wallet.publicKey || !wallet.signTransaction) {
          throw new Error("Wallet not connected or doesn't support signing");
        }
        
        // Convert destination to SolanaPublicKey if needed
        const destinationKey = toSolanaPublicKey(input.destination);
          
        // Create and prepare the transaction
        const { transaction, latestBlockhash } = await createTransaction({
          publicKey,
          destination: destinationKey,
          amount: input.amount,
          connection,
        })

        // Send transaction and get signature
        signature = await wallet.sendTransaction(transaction, connection)
        console.log(`Transaction sent: ${signature}`);

        // Wait for transaction confirmation
        const confirmationResult = await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')
        
        if (confirmationResult.value.err) {
          throw new Error(`Transaction confirmed but failed: ${JSON.stringify(confirmationResult.value.err)}`);
        }

        console.log(`Transaction confirmed: ${signature}`);
        return signature
      } catch (error: unknown) {
        console.error(`Transaction failed:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Transaction failed: ${errorMessage}`);
      }
    },
    onSuccess: (signature) => {
      if (signature) {
        // Show success toast with transaction signature
        transactionToast(signature)
      }
      // Invalidate queries to refresh balances and transaction history
      return Promise.all([
        client.invalidateQueries({
          queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address: publicKey }],
        }),
        client.invalidateQueries({
          queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address: publicKey }],
        }),
      ])
    },
    onError: (error) => {
      // Show error toast if transaction fails
      toast.error(`${error instanceof Error ? error.message : String(error)}`)
    },
  })
}

/**
 * Hook to request an SOL airdrop on devnet/testnet
 * @param address - The Solana public key or Gill address to receive the airdrop
 * @returns Mutation object for requesting an airdrop with success handling
 */
export function useRequestAirdrop({ address: addressValue }: { address: SolanaPublicKey | Address }) {
  const { connection } = useConnection()
  const transactionToast = useTransactionToast()
  const client = useQueryClient()
  
  // Convert to SolanaPublicKey if it's an Address type from gill
  const publicKey = toSolanaPublicKey(addressValue);

  return useMutation({
    mutationKey: ['airdrop', { endpoint: connection.rpcEndpoint, address: publicKey }],
    mutationFn: async (amount: number = 1) => {
      try {
        // Request airdrop and get latest blockhash in parallel for efficiency
        const [latestBlockhash, signature] = await Promise.all([
          connection.getLatestBlockhash(),
          connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL),
        ]);

        // Wait for transaction confirmation
        const confirmResult = await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
        
        if (confirmResult.value.err) {
          throw new Error(`Airdrop confirmed but failed: ${JSON.stringify(confirmResult.value.err)}`);
        }
        
        return signature;
      } catch (error) {
        console.error("Airdrop failed:", error);
        throw new Error(`Airdrop failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    onSuccess: (signature) => {
      // Show success toast with transaction signature
      transactionToast(signature)
      // Invalidate queries to refresh balances and transaction history
      return Promise.all([
        client.invalidateQueries({
          queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address: publicKey }],
        }),
        client.invalidateQueries({
          queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address: publicKey }],
        }),
      ])
    },
    onError: (error) => {
      toast.error(`${error instanceof Error ? error.message : String(error)}`);
    },
  })
}

/**
 * Helper function to create a versioned transaction for SOL transfer
 * @param publicKey - The sender's public key
 * @param destination - The recipient's public key
 * @param amount - Amount of SOL to transfer
 * @param connection - Solana connection object
 * @returns Object containing the transaction and latest blockhash
 */
async function createTransaction({
  publicKey,
  destination,
  amount,
  connection,
}: {
  publicKey: SolanaPublicKey
  destination: SolanaPublicKey
  amount: number
  connection: Connection
}): Promise<{
  transaction: VersionedTransaction
  latestBlockhash: { blockhash: string; lastValidBlockHeight: number }
}> {
  try {
    // Get the latest blockhash to use in our transaction
    const latestBlockhash = await connection.getLatestBlockhash();

    // Create instructions to send, in this case a simple transfer
    const instructions = [
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: destination,
        lamports: amount * LAMPORTS_PER_SOL,
      }),
    ];

    // Create a new TransactionMessage with version and compile it to legacy
    const messageLegacy = new TransactionMessage({
      payerKey: publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToLegacyMessage();

    // Create a new VersionedTransaction which supports legacy and v0
    const transaction = new VersionedTransaction(messageLegacy);

    return {
      transaction,
      latestBlockhash,
    };
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw new Error(`Error creating transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}
