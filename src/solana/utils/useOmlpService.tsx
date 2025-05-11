'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { OMLPService, PoolData, PositionData, PoolHistoricalData } from './omlpService'
import { TOKEN_MINTS } from '../constants/omlpProgram'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'react-hot-toast'
import { useTransactionToast } from '@/components/ui/ui-layout'

/**
 * Custom hook for interacting with the OMLP service
 * @returns OMLP service hooks for pools, positions, and transactions
 */
export function useOmlpService() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const queryClient = useQueryClient()
  const transactionToast = useTransactionToast()
  
  // Initialize OMLP service
  const omlpService = useMemo(() => new OMLPService(connection), [connection])
  
  // Query for fetching pools
  const {
    data: pools,
    isLoading: isLoadingPools,
    refetch: refetchPools,
  } = useQuery({
    queryKey: ['omlp-pools', connection.rpcEndpoint],
    queryFn: async () => {
      return await omlpService.fetchPools()
    },
    enabled: !!connection,
    staleTime: 60000, // 1 minute
  })
  
  // Query for fetching user positions
  const {
    data: positions,
    isLoading: isLoadingPositions,
    refetch: refetchPositions,
  } = useQuery({
    queryKey: ['omlp-positions', connection.rpcEndpoint, publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey) return []
      return await omlpService.fetchUserPositions(publicKey)
    },
    enabled: !!connection && !!publicKey,
    staleTime: 60000, // 1 minute
  })
  
  // Function to fetch historical data for a token
  const fetchHistoricalData = useCallback(
    async (token: string): Promise<PoolHistoricalData[]> => {
      return await omlpService.fetchHistoricalData(token)
    },
    [omlpService]
  )
  
  // Mutation for depositing tokens
  const depositMutation = useMutation({
    mutationFn: async ({
      tokenSymbol,
      amount,
    }: {
      tokenSymbol: string
      amount: number
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')
      
      const tokenMint = TOKEN_MINTS[tokenSymbol as keyof typeof TOKEN_MINTS]
      if (!tokenMint) throw new Error(`Token ${tokenSymbol} not supported`)
      
      // Create deposit transaction
      const transaction = await omlpService.createDepositTransaction(
        publicKey,
        tokenMint,
        amount
      )
      
      // Send transaction
      const signature = await sendTransaction(transaction, connection)
      
      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash()
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash,
      })
      
      return signature
    },
    onSuccess: (signature) => {
      // Show success toast
      transactionToast(signature)
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['omlp-pools'] })
      queryClient.invalidateQueries({ queryKey: ['omlp-positions'] })
      
      toast.success('Deposit successful')
    },
    onError: (error: Error) => {
      console.error('Deposit error:', error)
      toast.error(`Deposit failed: ${error.message}`)
    },
  })
  
  // Mutation for withdrawing tokens
  const withdrawMutation = useMutation({
    mutationFn: async ({
      tokenSymbol,
      amount,
    }: {
      tokenSymbol: string
      amount: number
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')
      
      const tokenMint = TOKEN_MINTS[tokenSymbol as keyof typeof TOKEN_MINTS]
      if (!tokenMint) throw new Error(`Token ${tokenSymbol} not supported`)
      
      // Create withdraw transaction
      const transaction = await omlpService.createWithdrawTransaction(
        publicKey,
        tokenMint,
        amount
      )
      
      // Send transaction
      const signature = await sendTransaction(transaction, connection)
      
      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash()
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash,
      })
      
      return signature
    },
    onSuccess: (signature) => {
      // Show success toast
      transactionToast(signature)
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['omlp-pools'] })
      queryClient.invalidateQueries({ queryKey: ['omlp-positions'] })
      
      toast.success('Withdrawal successful')
    },
    onError: (error: Error) => {
      console.error('Withdrawal error:', error)
      toast.error(`Withdrawal failed: ${error.message}`)
    },
  })
  
  return {
    // Data and loading states
    pools: pools || [],
    positions: positions || [],
    isLoadingPools,
    isLoadingPositions,
    
    // Refetch functions
    refetchPools,
    refetchPositions,
    fetchHistoricalData,
    
    // Mutations
    deposit: depositMutation.mutateAsync,
    withdraw: withdrawMutation.mutateAsync,
    isDepositing: depositMutation.isPending,
    isWithdrawing: withdrawMutation.isPending,
  }
} 