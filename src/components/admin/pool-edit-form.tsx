'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardBody, CardHeader, Button, Input, Select, SelectItem } from '@heroui/react'
import { Edit, AlertCircle, Settings, CheckCircle, RefreshCw } from 'lucide-react'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { RedisPoolData } from '@/lib/redis/omlp-pool-service'

interface PoolEditFormProps {
  pools: RedisPoolData[]
  onPoolUpdated?: () => void
}

export function PoolEditForm({ pools, onPoolUpdated }: PoolEditFormProps) {
  const cardRef = useMouseGlow()
  
  // Form state
  const [selectedPoolId, setSelectedPoolId] = useState<string>('')
  const [selectedPool, setSelectedPool] = useState<RedisPoolData | null>(null)
  const [formData, setFormData] = useState({
    baseSupplyApy: 0.0,
    baseBorrowApy: 0.0,
    utilizationRateMultiplier: 0.05,
    borrowSpread: 5.0,
    supplyLimit: 2500,
    minUtilizationForDynamicRates: 10,
    maxUtilizationThreshold: 90,
    liquidationThreshold: 100,
    liquidationPenalty: 1.5,
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  
  // Update form data when pool is selected
  useEffect(() => {
    if (selectedPoolId) {
      const pool = pools.find(p => p.poolId === selectedPoolId)
      if (pool) {
        setSelectedPool(pool)
        setFormData({
          baseSupplyApy: pool.baseSupplyApy,
          baseBorrowApy: pool.baseBorrowApy,
          utilizationRateMultiplier: pool.utilizationRateMultiplier,
          borrowSpread: pool.borrowSpread,
          supplyLimit: pool.supplyLimit,
          minUtilizationForDynamicRates: pool.minUtilizationForDynamicRates,
          maxUtilizationThreshold: pool.maxUtilizationThreshold,
          liquidationThreshold: pool.liquidationThreshold,
          liquidationPenalty: pool.liquidationPenalty,
        })
      }
    }
  }, [selectedPoolId, pools])

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }))
  }

  const handleSubmit = async () => {
    if (!selectedPoolId || !selectedPool) {
      setUpdateError('Please select a pool')
      return
    }
    
    setIsUpdating(true)
    setUpdateError(null)
    setUpdateSuccess(false)
    
    try {
      // Update pool via API
      const response = await fetch('/api/pools/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poolId: selectedPoolId,
          updates: formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update pool')
      }
      
      setUpdateSuccess(true)
      console.log('Pool updated successfully:', selectedPoolId)
      
      // Callback to refresh pools
      if (onPoolUpdated) {
        onPoolUpdated()
      }
      
      // Reset success state after 2 seconds
      setTimeout(() => {
        setUpdateSuccess(false)
      }, 2000)
    } catch (error) {
      console.error('Error updating pool:', error)
      setUpdateError(error instanceof Error ? error.message : 'Failed to update pool')
    } finally {
      setIsUpdating(false)
    }
  }

  const isFormValid = selectedPoolId && formData.supplyLimit > 0

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
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Edit className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Edit Existing OMLP Pool
          </h2>
          <p className="text-sm text-white/60">
            Modify configuration of an existing pool
          </p>
        </div>
      </CardHeader>
      
      <CardBody className="space-y-6">
        {/* Pool Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-medium text-white/80">Select Pool to Edit</h3>
          </div>
          
          <Select
            label="Select Pool"
            placeholder={pools.length > 0 ? "Choose a pool to edit" : "No pools available"}
            selectedKeys={selectedPoolId ? [selectedPoolId] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string
              setSelectedPoolId(selected)
            }}
            classNames={{
              trigger: "bg-slate-800/50 border-slate-600/50 hover:border-amber-500/50",
              popoverContent: "bg-slate-800/95 backdrop-blur-sm border-slate-600/50",
              value: "text-white/90"
            }}
            isDisabled={pools.length === 0}
          >
            {pools.map((pool) => (
              <SelectItem key={pool.poolId}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pool.asset}</span>
                  <span className="text-white/60">- {pool.poolId}</span>
                </div>
              </SelectItem>
            ))}
          </Select>
          
          {/* Pool info display */}
          {selectedPool && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-slate-800/30 border border-slate-600/30"
            >
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-white/60">Asset:</span>
                  <span className="ml-2 text-white/90 font-medium">{selectedPool.asset}</span>
                </div>
                <div>
                  <span className="text-white/60">Total Supply:</span>
                  <span className="ml-2 text-white/90 font-medium">{selectedPool.totalSupply.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-white/60">Utilization:</span>
                  <span className="ml-2 text-white/90 font-medium">{selectedPool.utilizationRate.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-white/60">Price:</span>
                  <span className="ml-2 text-white/90 font-medium">${selectedPool.assetPrice.toFixed(4)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Pool Parameters */}
        {selectedPool && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-medium text-white/80">Pool Configuration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                label="Supply Limit"
                placeholder="2500"
                value={formData.supplyLimit?.toString() || ''}
                onChange={(e) => handleInputChange('supplyLimit', e.target.value)}
                endContent={<span className="text-white/60 text-sm">{selectedPool.asset}</span>}
                classNames={{
                  input: "text-white/90",
                  inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-amber-500/50"
                }}
              />
              
              <Input
                type="number"
                label="Base Supply APY"
                placeholder="0.0"
                value={formData.baseSupplyApy?.toString() || ''}
                onChange={(e) => handleInputChange('baseSupplyApy', e.target.value)}
                endContent={<span className="text-white/60 text-sm">%</span>}
                classNames={{
                  input: "text-white/90",
                  inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-amber-500/50"
                }}
              />
              
              <Input
                type="number"
                label="Base Borrow APY"
                placeholder="0.0"
                value={formData.baseBorrowApy?.toString() || ''}
                onChange={(e) => handleInputChange('baseBorrowApy', e.target.value)}
                endContent={<span className="text-white/60 text-sm">%</span>}
                classNames={{
                  input: "text-white/90",
                  inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-amber-500/50"
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
                  inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-amber-500/50"
                }}
              />
              
              <Input
                type="number"
                label="Borrow Spread"
                placeholder="5.0"
                value={formData.borrowSpread?.toString() || ''}
                onChange={(e) => handleInputChange('borrowSpread', e.target.value)}
                endContent={<span className="text-white/60 text-sm">%</span>}
                classNames={{
                  input: "text-white/90",
                  inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-amber-500/50"
                }}
              />
              
              <Input
                type="number"
                label="Min Utilization for Dynamic Rates"
                placeholder="10"
                value={formData.minUtilizationForDynamicRates?.toString() || ''}
                onChange={(e) => handleInputChange('minUtilizationForDynamicRates', e.target.value)}
                endContent={<span className="text-white/60 text-sm">%</span>}
                classNames={{
                  input: "text-white/90",
                  inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-amber-500/50"
                }}
              />
              
              <Input
                type="number"
                label="Max Utilization Threshold"
                placeholder="90"
                value={formData.maxUtilizationThreshold?.toString() || ''}
                onChange={(e) => handleInputChange('maxUtilizationThreshold', e.target.value)}
                endContent={<span className="text-white/60 text-sm">%</span>}
                classNames={{
                  input: "text-white/90",
                  inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-amber-500/50"
                }}
              />
              
              <Input
                type="number"
                label="Liquidation Threshold"
                placeholder="100"
                value={formData.liquidationThreshold?.toString() || ''}
                onChange={(e) => handleInputChange('liquidationThreshold', e.target.value)}
                endContent={<span className="text-white/60 text-sm">%</span>}
                classNames={{
                  input: "text-white/90",
                  inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-amber-500/50"
                }}
              />
              
              <Input
                type="number"
                label="Liquidation Penalty"
                placeholder="1.5"
                value={formData.liquidationPenalty?.toString() || ''}
                onChange={(e) => handleInputChange('liquidationPenalty', e.target.value)}
                endContent={<span className="text-white/60 text-sm">%</span>}
                classNames={{
                  input: "text-white/90",
                  inputWrapper: "bg-slate-800/50 border-slate-600/50 hover:border-amber-500/50"
                }}
              />
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isUpdating || updateSuccess || !selectedPool}
              isLoading={isUpdating}
              className={`
                ${isFormValid && !updateSuccess
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white' 
                  : updateSuccess
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : 'bg-slate-700/50 text-white/50 cursor-not-allowed'
                }
                font-medium transition-all duration-200
              `}
              startContent={updateSuccess ? <CheckCircle className="h-4 w-4" /> : undefined}
            >
              {updateSuccess ? 'Pool Updated Successfully!' : isUpdating ? 'Updating Pool...' : 'Update Pool Configuration'}
            </Button>
          </div>
          
          {!selectedPool && pools.length > 0 && !updateError && (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Please select a pool to edit</span>
            </div>
          )}
          
          {pools.length === 0 && !updateError && (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>No pools available to edit. Create a pool first.</span>
            </div>
          )}
          
          {updateError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-400 text-sm p-3 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle className="h-4 w-4" />
              <span>{updateError}</span>
            </motion.div>
          )}
          
          {updateSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-green-400 text-sm p-3 rounded-lg bg-green-500/10 border border-green-500/20"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Pool configuration updated successfully!</span>
            </motion.div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

