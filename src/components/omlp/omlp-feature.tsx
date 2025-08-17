'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { MyLendingPositions, type Position } from './my-lending-positions'
import { LendingPools, type Pool } from './lending-pools'
import { type PoolHistoricalData } from './omlp-pool-chart'
import { useState, useEffect, useCallback } from 'react'
import { useOmlpService } from '@/solana/utils/useOmlpService'
import { motion } from 'framer-motion'
import { Card, CardBody } from '@heroui/react'
import { Wallet, ArrowUpRight } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import wallet button with ssr disabled to prevent hydration mismatch
const WalletButton = dynamic(
  () => import('../solana/user-wallet/wallet-button').then(mod => mod.WalletButton),
  { ssr: false }
)

export function OMLPFeature() {
  const { publicKey } = useWallet()
  const { 
    pools, 
    positions, 
    isLoadingPools, 
    isLoadingPositions, 
    refetchPools, 
    refetchPositions, 
    fetchHistoricalData
  } = useOmlpService()

  // Create wrapper functions with correct return type for components
  const handleRefreshPools = useCallback(async (): Promise<void> => {
    await refetchPools()
  }, [refetchPools])

  const handleRefreshPositions = useCallback(async (): Promise<void> => {
    await refetchPositions()
  }, [refetchPositions])

  if (!publicKey) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]"
      >
        <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl max-w-md">
          <CardBody className="p-8">
            <div className="flex flex-col items-center gap-6">
              <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm">
                <Wallet className="h-8 w-8 text-blue-400" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Wallet Connection Required
                </h2>
                <p className="text-white/60">
                  Connect your wallet to access the Option Margin Liquidity Pool
                </p>
              </div>
              <div className="flex justify-center">
                <WalletButton />
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="py-10 space-y-8"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center space-y-3"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Option Margin Liquidity Pool
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Lend tokens to provide liquidity for option market makers and earn competitive yields.
        </p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <MyLendingPositions 
          positions={positions}
          isLoading={isLoadingPositions}
          onRefresh={handleRefreshPositions}
        />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <LendingPools 
          pools={pools}
          isLoading={isLoadingPools}
          onRefresh={handleRefreshPools}
          onFetchHistoricalData={fetchHistoricalData}
        />
      </motion.div>
    </motion.div>
  )
} 