'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardBody, CardHeader, Button, Input, Select, SelectItem } from '@heroui/react'
import { Plus, DollarSign, TrendingUp, AlertCircle, Settings, CheckCircle } from 'lucide-react'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { TOKENS } from '@/constants/token-list/token-list'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { BasePoolConfig } from '@/constants/omlp/omlp-pools'
// Removed Redis import - will use API instead

interface PoolCreationFormProps {
  onPoolCreated?: () => void
}

export function PoolCreationForm({ onPoolCreated }: PoolCreationFormProps) {
  const cardRef = useMouseGlow()
  
  // Form state
  const [selectedToken, setSelectedToken] = useState<string>('')
  const [formData, setFormData] = useState<Partial<BasePoolConfig>>({
    initialSupply: 1000,
    baseSupplyApy: 0.0,
    baseBorrowApy: 0.0,
    utilizationRateMultiplier: 0.05,
    borrowSpread: 5.0,
    supplyLimit: 2500,
    minUtilizationForDynamicRates: 10,
    maxUtilizationThreshold: 90,
    liquidationThreshold: 100,
    liquidationPenalty: 1.5,
    initialBorrowedPercentage: 0
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  
  // Get real-time price for selected token
  const { price, priceChange, priceChange24h } = useAssetPriceInfo(selectedToken)
  
  // Available tokens from token list
  const availableTokens = Object.values(TOKENS)

  // Update form data when token is selected
  useEffect(() => {
    if (selectedToken) {
      const token = TOKENS[selectedToken as keyof typeof TOKENS]
      if (token) {
        setFormData(prev => ({
          ...prev,
          token: token.symbol,
          tokenAddress: token.address
        }))
      }
    }
  }, [selectedToken])

  const handleInputChange = (field: keyof BasePoolConfig, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }))
  }

  const handleSubmit = async () => {
    if (!selectedToken || !formData.token) {
      setCreateError('Please select a token')
      return
    }
    
    if (price <= 0) {
      setCreateError('Waiting for asset price to be available')
      return
    }
    
    setIsCreating(true)
    setCreateError(null)
    setCreateSuccess(false)
    
    try {
      const token = TOKENS[selectedToken as keyof typeof TOKENS]
      
      // Create pool configuration
      const poolConfig = {
        token: token.symbol,
        tokenAddress: token.address,
        initialSupply: formData.initialSupply!,
        baseSupplyApy: formData.baseSupplyApy!,
        baseBorrowApy: formData.baseBorrowApy!,
        utilizationRateMultiplier: formData.utilizationRateMultiplier!,
        borrowSpread: formData.borrowSpread!,
        supplyLimit: formData.supplyLimit!,
        minUtilizationForDynamicRates: formData.minUtilizationForDynamicRates!,
        maxUtilizationThreshold: formData.maxUtilizationThreshold!,
        liquidationThreshold: formData.liquidationThreshold!,
        liquidationPenalty: formData.liquidationPenalty!,
        initialBorrowedPercentage: formData.initialBorrowedPercentage!,
      }
      
      // Create pool via API
      const response = await fetch('/api/redis/create-pool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: poolConfig,
          price,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create pool')
      }
      
      setCreateSuccess(true)
      console.log('Pool created successfully:', poolConfig)
      
      // Notify parent component to refresh pools (with small delay to ensure Redis is updated)
      if (onPoolCreated) {
        setTimeout(() => {
          onPoolCreated()
        }, 400)
      }
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setCreateSuccess(false)
        setSelectedToken('')
        setFormData({
          initialSupply: 1000,
          baseSupplyApy: 0.0,
          baseBorrowApy: 0.0,
          utilizationRateMultiplier: 0.05,
          borrowSpread: 5.0,
          supplyLimit: 2500,
          minUtilizationForDynamicRates: 10,
          maxUtilizationThreshold: 90,
          liquidationThreshold: 100,
          liquidationPenalty: 1.5,
          initialBorrowedPercentage: 0
        })
      }, 2000)
    } catch (error) {
      console.error('Error creating pool:', error)
      setCreateError(error instanceof Error ? error.message : 'Failed to create pool')
    } finally {
      setIsCreating(false)
    }
  }

  const isFormValid = selectedToken && (formData.initialSupply !== undefined && formData.initialSupply !== null) && formData.supplyLimit

  return (
    <Card 
      ref={cardRef}
      className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
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
      <CardHeader className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-[#4a85ff]/20 flex items-center justify-center">
          <Plus className="h-4 w-4 text-[#4a85ff]" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-[#4a85ff] to-[#1851c4] bg-clip-text text-transparent">
            Create New OMLP Pool
          </h2>
          <p className="text-sm text-white/60">
            Configure a new Option Margin Liquidity Pool
          </p>
        </div>
      </CardHeader>
      
      <CardBody className="space-y-6">
        {/* Token Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[#4a85ff]" />
            <h3 className="text-sm font-medium text-white/80">Asset Selection</h3>
          </div>
          
          <Select
            label="Select Token"
            placeholder="Choose a token for the pool"
            selectedKeys={selectedToken ? [selectedToken] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string
              setSelectedToken(selected)
            }}
            classNames={{
              trigger: "bg-slate-800/50 border-slate-600/50 hover:border-[#4a85ff]/50",
              popoverContent: "bg-slate-800/95 backdrop-blur-sm border-slate-600/50",
              value: "text-white/90"
            }}
          >
            {availableTokens.map((token) => (
              <SelectItem key={token.symbol}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{token.symbol}</span>
                  <span className="text-white/60">- {token.name}</span>
                </div>
              </SelectItem>
            ))}
          </Select>
          
          {/* Real-time price display */}
          {selectedToken && price > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/30 border border-slate-600/30"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${priceChange === 'up' ? 'text-green-400' : priceChange === 'down' ? 'text-red-400' : 'text-white/60'}`} />
                <span className="text-sm text-white/80">Current Price:</span>
              </div>
              <span className="font-mono text-white/90">${price.toFixed(4)}</span>
              {priceChange24h !== 0 && (
                <span className={`text-xs ${priceChange24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange24h > 0 ? '+' : ''}{priceChange24h.toFixed(2)}% (24h)
                </span>
              )}
            </motion.div>
          )}
        </div>

        {/* Pool Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#4a85ff]" />
            <h3 className="text-sm font-medium text-white/80">Pool Configuration</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Initial Supply"
              placeholder="0 (can be zero)"
              value={formData.initialSupply?.toString() || ''}
              onChange={(e) => handleInputChange('initialSupply', e.target.value)}
              endContent={<span className="text-white/60 text-sm" aria-label="Token unit">{selectedToken || 'tokens'}</span>}
              classNames={{
                input: "text-white/90",
                inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-[#4a85ff]/50"
              }}
            />
            
            <Input
              type="number"
              label="Supply Limit"
              placeholder="2500"
              value={formData.supplyLimit?.toString() || ''}
              onChange={(e) => handleInputChange('supplyLimit', e.target.value)}
              endContent={<span className="text-white/60 text-sm" aria-label="Token unit">{selectedToken || 'tokens'}</span>}
              classNames={{
                input: "text-white/90",
                inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-[#4a85ff]/50"
              }}
            />
            
            <Input
              type="number"
              label="Base Supply APY"
              placeholder="0.0"
              value={formData.baseSupplyApy?.toString() || ''}
              onChange={(e) => handleInputChange('baseSupplyApy', e.target.value)}
              endContent={<span className="text-white/60 text-sm" aria-label="Percentage">%</span>}
              classNames={{
                input: "text-white/90",
                inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-[#4a85ff]/50"
              }}
            />
            
            <Input
              type="number"
              label="Base Borrow APY"
              placeholder="0.0"
              value={formData.baseBorrowApy?.toString() || ''}
              onChange={(e) => handleInputChange('baseBorrowApy', e.target.value)}
              endContent={<span className="text-white/60 text-sm" aria-label="Percentage">%</span>}
              classNames={{
                input: "text-white/90",
                inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-[#4a85ff]/50"
              }}
            />
            
            <Input
              type="number"
              label="Utilization Rate Multiplier"
              placeholder="0.05"
              value={formData.utilizationRateMultiplier?.toString() || ''}
              onChange={(e) => handleInputChange('utilizationRateMultiplier', e.target.value)}
              classNames={{
                input: "text-white/90",
                inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-[#4a85ff]/50"
              }}
            />
            
            <Input
              type="number"
              label="Borrow Spread"
              placeholder="5.0"
              value={formData.borrowSpread?.toString() || ''}
              onChange={(e) => handleInputChange('borrowSpread', e.target.value)}
              endContent={<span className="text-white/60 text-sm" aria-label="Percentage">%</span>}
              classNames={{
                input: "text-white/90",
                inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-[#4a85ff]/50"
              }}
            />
            
            <Input
              type="number"
              label="Min Utilization for Dynamic Rates"
              placeholder="10"
              value={formData.minUtilizationForDynamicRates?.toString() || ''}
              onChange={(e) => handleInputChange('minUtilizationForDynamicRates', e.target.value)}
              endContent={<span className="text-white/60 text-sm" aria-label="Percentage">%</span>}
              classNames={{
                input: "text-white/90",
                inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-[#4a85ff]/50"
              }}
            />
            
            <Input
              type="number"
              label="Max Utilization Threshold"
              placeholder="90"
              value={formData.maxUtilizationThreshold?.toString() || ''}
              onChange={(e) => handleInputChange('maxUtilizationThreshold', e.target.value)}
              endContent={<span className="text-white/60 text-sm" aria-label="Percentage">%</span>}
              classNames={{
                input: "text-white/90",
                inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-[#4a85ff]/50"
              }}
            />
            
            <Input
              type="number"
              label="Liquidation Threshold"
              placeholder="100"
              value={formData.liquidationThreshold?.toString() || ''}
              onChange={(e) => handleInputChange('liquidationThreshold', e.target.value)}
              endContent={<span className="text-white/60 text-sm" aria-label="Percentage">%</span>}
              classNames={{
                input: "text-white/90",
                inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-[#4a85ff]/50"
              }}
            />
            
            <Input
              type="number"
              label="Liquidation Penalty"
              placeholder="1.5"
              value={formData.liquidationPenalty?.toString() || ''}
              onChange={(e) => handleInputChange('liquidationPenalty', e.target.value)}
              endContent={<span className="text-white/60 text-sm" aria-label="Percentage">%</span>}
              classNames={{
                input: "text-white/90",
                inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-[#4a85ff]/50"
              }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isCreating || createSuccess}
              isLoading={isCreating}
              className={`
                ${isFormValid && !createSuccess
                  ? 'bg-gradient-to-r from-[#4a85ff] to-[#1851c4] hover:from-[#5a95ff] hover:to-[#2861d4] text-white' 
                  : createSuccess
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : 'bg-slate-700/50 text-white/50 cursor-not-allowed'
                }
                font-medium transition-all duration-200
              `}
              startContent={createSuccess ? <CheckCircle className="h-4 w-4" /> : undefined}
            >
              {createSuccess ? 'Pool Created Successfully!' : isCreating ? 'Creating Pool...' : 'Create Pool in Redis'}
            </Button>
          </div>
          
          {!isFormValid && !createError && (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Please select a token and set supply limit (initial supply can be 0)</span>
            </div>
          )}
          
          {createError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-400 text-sm p-3 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle className="h-4 w-4" />
              <span>{createError}</span>
            </motion.div>
          )}
          
          {createSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-green-400 text-sm p-3 rounded-lg bg-green-500/10 border border-green-500/20"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Pool created successfully! The pool is now available in the edit form below.</span>
            </motion.div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
