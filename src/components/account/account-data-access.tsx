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
import {useTransactionToast} from '../ui/ui-layout'

export function useGetBalance({ address: addressOrPublicKey }: { address: SolanaPublicKey | Address }) {
  const { connection } = useConnection()
  
  // Convert to SolanaPublicKey if it's an Address type from gill
  const publicKey = addressOrPublicKey instanceof SolanaPublicKey 
    ? addressOrPublicKey 
    : new SolanaPublicKey(addressOrPublicKey.toString())

  return useQuery({
    queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address: publicKey }],
    queryFn: () => connection.getBalance(publicKey),
  })
}

export function useGetSignatures({ address: addressValue }: { address: SolanaPublicKey | Address }) {
  const { connection } = useConnection()
  
  // Convert to SolanaPublicKey if it's an Address type from gill
  const publicKey = addressValue instanceof SolanaPublicKey 
    ? addressValue 
    : new SolanaPublicKey(addressValue.toString())

  return useQuery({
    queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address: publicKey }],
    queryFn: () => connection.getSignaturesForAddress(publicKey),
  })
}

export function useGetTokenAccounts({ address: addressValue }: { address: SolanaPublicKey | Address }) {
  const { connection } = useConnection()
  
  // Convert to SolanaPublicKey if it's an Address type from gill
  const publicKey = addressValue instanceof SolanaPublicKey 
    ? addressValue 
    : new SolanaPublicKey(addressValue.toString())

  return useQuery({
    queryKey: ['get-token-accounts', { endpoint: connection.rpcEndpoint, address: publicKey }],
    queryFn: async () => {
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ])
      return [...tokenAccounts.value, ...token2022Accounts.value]
    },
  })
}

export function useTransferSol({ address: addressValue }: { address: SolanaPublicKey | Address }) {
  const { connection } = useConnection()
  const transactionToast = useTransactionToast()
  const wallet = useWallet()
  const client = useQueryClient()
  
  // Convert to SolanaPublicKey if it's an Address type from gill
  const publicKey = addressValue instanceof SolanaPublicKey 
    ? addressValue 
    : new SolanaPublicKey(addressValue.toString())

  return useMutation({
    mutationKey: ['transfer-sol', { endpoint: connection.rpcEndpoint, address: publicKey }],
    mutationFn: async (input: { destination: SolanaPublicKey | Address; amount: number }) => {
      let signature: TransactionSignature = ''
      try {
        // Convert destination to SolanaPublicKey if needed
        const destinationKey = input.destination instanceof SolanaPublicKey 
          ? input.destination 
          : new SolanaPublicKey(input.destination.toString())
          
        const { transaction, latestBlockhash } = await createTransaction({
          publicKey,
          destination: destinationKey,
          amount: input.amount,
          connection,
        })

        // Send transaction and await for signature
        signature = await wallet.sendTransaction(transaction, connection)

        // Send transaction and await for signature
        await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')

        console.log(signature)
        return signature
      } catch (error: unknown) {
        console.log('error', `Transaction failed! ${error}`, signature)

        return
      }
    },
    onSuccess: (signature) => {
      if (signature) {
        transactionToast(signature)
      }
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
      toast.error(`Transaction failed! ${error}`)
    },
  })
}

export function useRequestAirdrop({ address: addressValue }: { address: SolanaPublicKey | Address }) {
  const { connection } = useConnection()
  const transactionToast = useTransactionToast()
  const client = useQueryClient()
  
  // Convert to SolanaPublicKey if it's an Address type from gill
  const publicKey = addressValue instanceof SolanaPublicKey 
    ? addressValue 
    : new SolanaPublicKey(addressValue.toString())

  return useMutation({
    mutationKey: ['airdrop', { endpoint: connection.rpcEndpoint, address: publicKey }],
    mutationFn: async (amount: number = 1) => {
      const [latestBlockhash, signature] = await Promise.all([
        connection.getLatestBlockhash(),
        connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL),
      ])

      await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')
      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      return Promise.all([
        client.invalidateQueries({
          queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address: publicKey }],
        }),
        client.invalidateQueries({
          queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address: publicKey }],
        }),
      ])
    },
  })
}

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
  // Get the latest blockhash to use in our transaction
  const latestBlockhash = await connection.getLatestBlockhash()

  // Create instructions to send, in this case a simple transfer
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: destination,
      lamports: amount * LAMPORTS_PER_SOL,
    }),
  ]

  // Create a new TransactionMessage with version and compile it to legacy
  const messageLegacy = new TransactionMessage({
    payerKey: publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions,
  }).compileToLegacyMessage()

  // Create a new VersionedTransaction which supports legacy and v0
  const transaction = new VersionedTransaction(messageLegacy)

  return {
    transaction,
    latestBlockhash,
  }
}
