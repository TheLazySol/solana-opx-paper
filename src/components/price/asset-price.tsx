'use client'

import { useEffect, useState } from 'react'
import { getTokenPrice } from '@/lib/birdeye'

export function AssetPrice({ asset }: { asset: string | undefined }) {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchPrice = async () => {
      if (!asset) return
      
      setLoading(true)
      try {
        const tokenPrice = await getTokenPrice(asset)
        setPrice(tokenPrice)
      } catch (error) {
        console.error('Error fetching price:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, 60000)
    return () => clearInterval(interval)
  }, [asset])

  if (!asset) return null
  if (loading) return <div className="text-sm text-muted-foreground">Loading price...</div>
  if (!price) return <div className="text-sm text-muted-foreground">Price unavailable</div>

  return (
    <div className="text-sm text-muted-foreground">
      Current market price: ${price.toFixed(2)}
    </div>
  )
} 