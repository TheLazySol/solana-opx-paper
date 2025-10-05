'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardBody } from '@heroui/react'
import { Shield, Wallet } from 'lucide-react'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { ADMIN_WALLETS } from '@/constants/constants'
import { PoolCreationForm } from './pool-creation-form'
import { PoolEditForm } from './pool-edit-form'
import { useRedisPools } from '../omlp/redis-pool-provider'
import dynamic from 'next/dynamic'

// Dynamically import wallet button with ssr disabled to prevent hydration mismatch
const WalletButton = dynamic(
  () => import('../solana/user-wallet/wallet-button').then(mod => mod.WalletButton),
  { ssr: false }
)

export function AdminFeature() {
  const { publicKey } = useWallet()
  const [mounted, setMounted] = useState(false)
  const { pools, refetchPools } = useRedisPools()
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Mouse glow effect hook
  const walletCardRef = useMouseGlow()
  const unauthorizedCardRef = useMouseGlow()
  
  // Handle pool refresh after updates
  const handlePoolUpdated = useCallback(async () => {
    await refetchPools()
  }, [refetchPools])

  // Check if current wallet is authorized for admin access
  const isAuthorized = publicKey && ADMIN_WALLETS.includes(publicKey.toString())

  // Avoid SSR/client divergence by rendering nothing until mounted
  if (!mounted) {
    return null
  }

  if (!publicKey) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4">
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
                <h2 className="text-xl font-semibold bg-gradient-to-r from-[#4a85ff] to-[#1851c4] bg-clip-text text-transparent">
                  Wallet Connection Required
                </h2>
                <p className="text-white/60">
                  Connect your wallet to access the Admin Panel
                </p>
              </div>
              <div className="flex justify-center">
                <WalletButton />
              </div>
            </div>
          </CardBody>
        </Card>
        </motion.div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]"
        >
        <Card 
          ref={unauthorizedCardRef}
          className="bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-700/20 border border-red-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out max-w-md"
          style={{
            background: `
              radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                rgba(239, 68, 68, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                rgba(220, 38, 38, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                rgba(185, 28, 28, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                transparent 75%
              ),
              linear-gradient(to bottom right, 
                rgb(127 29 29 / 0.4), 
                rgb(153 27 27 / 0.3), 
                rgb(185 28 28 / 0.2)
              )
            `,
            transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
          }}
        >
          <CardBody className="p-8">
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-red-500" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                  Access Denied
                </h2>
                <p className="text-white/60">
                  Your wallet is not authorized to access the Admin Panel
                </p>
                <p className="text-white/40 text-sm">
                  Wallet: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
        </motion.div>
      </div>
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
    <div className="w-full max-w-6xl mx-auto px-4">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#4a85ff]/20 flex items-center justify-center">
              <Shield className="h-4 w-4 text-[#4a85ff]" />
            </div>
            <h1 className="text-2xl font-semibold bg-gradient-to-r from-[#4a85ff] to-[#1851c4] bg-clip-text text-transparent">
              Admin Panel
            </h1>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <PoolCreationForm />
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <PoolEditForm pools={pools} onPoolUpdated={handlePoolUpdated} />
        </motion.div>
      </motion.div>
    </div>
  )
}

