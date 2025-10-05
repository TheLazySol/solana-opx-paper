"use client"

import { AdminFeature } from "@/components/admin/admin-feature"
import { RedisPoolProvider } from "@/components/omlp/redis-pool-provider"

export default function AdminPage() {
  return (
    <RedisPoolProvider>
      <AdminFeature />
    </RedisPoolProvider>
  )
}

