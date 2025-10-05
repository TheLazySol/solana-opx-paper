"use client"

import { OMLPFeature } from "@/components/omlp/omlp-feature"
import { RedisPoolProvider } from "@/components/omlp/redis-pool-provider"

export default function OMLPPage() {
  return (
    <RedisPoolProvider>
      <OMLPFeature />
    </RedisPoolProvider>
  )
}