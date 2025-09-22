'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { MyLendingPositions, type Position } from './my-lending-positions'
import { LendingPools, type Pool } from './lending-pools'
import { useState, useEffect, useCallback } from 'react'
import { useOmlpService } from '@/solana/utils/useOmlpService'
import { motion } from 'framer-motion'
import { Card, CardBody } from '@heroui/react'
import { Wallet, ArrowUpRight } from 'lucide-react'
import { useMouseGlow } from '@/hooks/useMouseGlow'
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
    refetchPositions
  } = useOmlpService()

  // Mouse glow effect hook
  const walletCardRef = useMouseGlow()

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
        <Card 
          ref={walletCardRef}
          className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out max-w-md"
          style={{
            background: `
              radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                transparent 75%
              ),
              linear-gradient(to bottom right, 
                rgb(15 23 42 / 0.4), 
                rgb(30 41 59 / 0.3), 
                rgb(51 65 85 / 0.2)
              )
            `,
            transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
          }}
        >
          <CardBody className="p-8">
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-12 rounded-full bg-[#4a85ff]/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-[#4a85ff]" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-[#4a85ff] to-[#5829f2] bg-clip-text text-transparent">
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="py-10 space-y-8"
    >
      <motion.div variants={itemVariants}>
        <MyLendingPositions 
          positions={positions}
          isLoading={isLoadingPositions}
          onRefresh={handleRefreshPositions}
        />
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <LendingPools 
          pools={pools}
          isLoading={isLoadingPools}
          onRefresh={handleRefreshPools}
        />
      </motion.div>
    </motion.div>
  )
} 