'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from 'gill'
import { address } from 'gill'
import { useEffect } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { ClusterNetwork } from '../cluster/cluster-data-access'
import { useGetBalance } from '../account/account-data-access'

export function WalletBalanceLogger() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const { cluster, setCluster, clusters } = useCluster()

  // Ensure we're on devnet
  useEffect(() => {
    const devnetCluster = clusters.find(c => c.network === ClusterNetwork.Devnet)
    if (devnetCluster && cluster.network !== ClusterNetwork.Devnet) {
      setCluster(devnetCluster)
      console.log('Switched to Devnet for balance check')
    }
  }, [cluster, clusters, setCluster])

  // Fetch and log balance when connected to a wallet
  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey) {
        try {
          const balance = await connection.getBalance(publicKey)
          const solBalance = balance / LAMPORTS_PER_SOL
          
          console.log('Connected wallet address:', publicKey.toString())
          console.log('Wallet SOL balance:', solBalance, 'SOL')
          console.log('Wallet lamports balance:', balance, 'lamports')
          console.log('Current network:', cluster.network || 'custom')
        } catch (error) {
          console.error('Error fetching wallet balance:', error)
        }
      } else {
        console.log('Wallet not connected')
      }
    }

    fetchBalance()
    
    // Set up an interval to check balance periodically (every 30 seconds)
    const intervalId = setInterval(fetchBalance, 30000)
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId)
  }, [publicKey, connection, cluster.network])

  // This component doesn't render anything
  return null
} 