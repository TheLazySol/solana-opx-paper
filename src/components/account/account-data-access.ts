'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useCluster } from '../cluster/cluster-data-access'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'
import { useTransactionToast } from '../ui/ui-layout'
import { SystemProgram, Transaction } from '@solana/web3.js'

function useGetBalance({ address }: { address: PublicKey }) {
  const { connection } = useConnection()
  return useQuery({
    queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getBalance(address),
  })
}

function useGetSignatures({ address }: { address: PublicKey }) {
  const { connection } = useConnection()
  return useQuery({
    queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getSignaturesForAddress(address),
  })
}

function useGetTokenAccounts({ address }: { address: PublicKey }) {
  const { connection } = useConnection()
  return useQuery({
    queryKey: ['get-token-accounts', { endpoint: connection.rpcEndpoint, address }],
    queryFn: async () => {
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(address, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(address, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ])
      return [...tokenAccounts.value, ...token2022Accounts.value]
    },
  })
}

function useRequestAirdrop({ address }: { address: PublicKey }) {
  const { connection } = useConnection()
  const transactionToast = useTransactionToast()

  return useMutation({
    mutationFn: async (amount: number) => {
      const signature = await connection.requestAirdrop(address, amount * LAMPORTS_PER_SOL)
      await connection.confirmTransaction(signature)
      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
    },
    onError: (err) => {
      toast.error(`Failed to request airdrop: ${err}`)
    },
  })
}

function useTransferSol({ address }: { address: PublicKey }) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const transactionToast = useTransactionToast()

  return useMutation({
    mutationFn: async ({
      destination,
      amount,
    }: {
      destination: PublicKey
      amount: number
    }) => {
      if (!wallet.publicKey || !wallet.sendTransaction) {
        throw new Error('Wallet not connected')
      }

      const transaction = await connection.getLatestBlockhash()
        .then(({ blockhash }) => {
          const tx = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: wallet.publicKey!,
              toPubkey: destination,
              lamports: amount * LAMPORTS_PER_SOL,
            })
          )
          tx.recentBlockhash = blockhash
          tx.feePayer = wallet.publicKey
          return tx
        })

      const signature = await wallet.sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature)
      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
    },
    onError: (err) => {
      toast.error(`Failed to send SOL: ${err}`)
    },
  })
}

function useGetSolanaPrice() {
  return useQuery({
    queryKey: ['getSolanaPrice'],
    queryFn: async () => {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      const data = await response.json()
      return data.solana.usd
    },
    refetchInterval: 60000
  })
}

// Single export statement for all hooks
export {
  useGetBalance,
  useGetSignatures,
  useGetTokenAccounts,
  useRequestAirdrop,
  useTransferSol,
  useGetSolanaPrice,
} 