'use client'

import { 
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  Chip,
  Spinner
} from '@heroui/react'
import { X, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { cn } from '@/utils/utils'
import { motion } from 'framer-motion'
import React from 'react'

export type PoolHistoricalData = {
  timestamp: number // Unix timestamp
  supplyApy: number
  borrowApy: number
  utilization: number
}

interface OmlpChartProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  poolData: {
    token: string
    supply: number
    supplyApy: number
    borrowed: number
    borrowApy: number
    utilization: number
  }
  historicalData?: PoolHistoricalData[]
  isLoading?: boolean
  onChartOpen?: () => Promise<void>
}

export function OmlpChart({ 
  open, 
  onOpenChange, 
  poolData,
  historicalData = [],
  isLoading = false,
  onChartOpen
}: OmlpChartProps) {
  React.useEffect(() => {
    if (open && onChartOpen) {
      onChartOpen()
    }
  }, [open, onChartOpen])

  const chartData = historicalData.map(data => ({
    name: new Date(data.timestamp * 1000).toLocaleDateString('en-US', { month: 'short' }),
    supplyApy: data.supplyApy,
    borrowApy: data.borrowApy,
    utilization: data.utilization
  }))

  return (
    <Modal 
      isOpen={open} 
      onOpenChange={onOpenChange}
      size="5xl"
      classNames={{
        base: "bg-black/90 backdrop-blur-md border border-white/10",
        header: "border-b border-white/10",
        body: "py-6",
        footer: "border-t border-white/10"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 backdrop-blur-sm">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {poolData.token} Pool Performance
                    </h3>
                    <p className="text-sm text-white/60 mt-1">
                      Historical APY and utilization rates
                    </p>
                  </div>
                </div>
              </div>
            </ModalHeader>
            <ModalBody>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <div className="h-[400px] w-full">
                  {isLoading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-4">
                      <Spinner size="lg" color="primary" />
                      <span className="text-white/60">Loading historical data...</span>
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-4">
                      <div className="p-4 rounded-full bg-white/5">
                        <BarChart3 className="h-8 w-8 text-white/40" />
                      </div>
                      <span className="text-white/60">No historical data available</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 30,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="name" 
                          stroke="rgba(255,255,255,0.5)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          orientation="left"
                          stroke="rgba(255,255,255,0.5)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 100]}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: '#fff',
                            backdropFilter: 'blur(10px)'
                          }}
                          formatter={(value) => [`${value}%`, '']}
                        />
                        <Legend 
                          wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }}
                        />
                        <Line 
                          type="monotone"
                          dataKey="supplyApy" 
                          name="Supply APY" 
                          stroke="#4ade80" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line 
                          type="monotone"
                          dataKey="borrowApy" 
                          name="Borrow APY" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line 
                          type="monotone"
                          dataKey="utilization" 
                          name="Utilization" 
                          stroke="#4a85ff" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-white/5 backdrop-blur-sm border border-green-500/20">
                    <CardBody className="text-center p-4">
                      <div className="flex flex-col items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-400" />
                        <div className="text-sm text-white/60">Current Supply APY</div>
                        <Chip size="lg" variant="flat" className="bg-green-500/20 text-green-400 font-semibold">
                          {poolData.supplyApy}%
                        </Chip>
                      </div>
                    </CardBody>
                  </Card>
                  <Card className="bg-white/5 backdrop-blur-sm border border-red-500/20">
                    <CardBody className="text-center p-4">
                      <div className="flex flex-col items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-400" />
                        <div className="text-sm text-white/60">Current Borrow APY</div>
                        <Chip size="lg" variant="flat" className="bg-red-500/20 text-red-400 font-semibold">
                          {poolData.borrowApy}%
                        </Chip>
                      </div>
                    </CardBody>
                  </Card>
                  <Card className="bg-white/5 backdrop-blur-sm border border-blue-500/20">
                    <CardBody className="text-center p-4">
                      <div className="flex flex-col items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-400" />
                        <div className="text-sm text-white/60">Current Utilization</div>
                        <Chip size="lg" variant="flat" className="bg-blue-500/20 text-blue-400 font-semibold">
                          {poolData.utilization}%
                        </Chip>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </motion.div>
            </ModalBody>
            <ModalFooter>
              <Button 
                variant="flat" 
                onPress={onClose}
                className="bg-white/10 text-white/80 hover:bg-white/20"
              >
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
} 