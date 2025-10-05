# Redis Integration for OPX Paper Trading

This directory contains the Redis client configuration and services for real-time data management in the OPX Paper Trading application.

## Overview

The Redis integration provides:
- Real-time pool state management for OMLP (Option Margin Liquidity Pools)
- Asset price synchronization
- High-performance data access for trading operations

## Setup

1. **Environment Variables**
   Add the following to your `.env` file:
   ```env
   REDIS_USERNAME=default
   REDIS_PASSWORD=your_redis_password_here
   REDIS_API_KEY=your_redis_api_key_here  # Alternative to REDIS_PASSWORD
   REDIS_HOST=your_redis_host
   REDIS_PORT=your_redis_port
   ```

2. **Initialize Redis in Your App**
   Wrap your OMLP components with the RedisPoolProvider:
   ```tsx
   import { RedisPoolProvider } from '@/components/omlp/redis-pool-provider';
   
   function OMLPPage() {
     return (
       <RedisPoolProvider>
         <OMLPFeature />
       </RedisPoolProvider>
     );
   }
   ```

## Core Components

### 1. Redis Client (`redis-client.ts`)
- Manages Redis connection with automatic reconnection
- Provides health checks
- Singleton pattern for connection reuse

### 2. OMLP Pool Service (`omlp-pool-service.ts`)
- Manages pool data (liquidity, utilization, interest rates)
- Calculates dynamic interest rates based on utilization
- Provides pool initialization and updates

### 3. Pool Price Sync (`pool-price-sync.ts`)
- Synchronizes pool asset prices with the price provider
- Configurable sync intervals

### 4. Redis Pool Provider (`redis-pool-provider.tsx`)
- React context for accessing pool data
- Automatic price synchronization
- Loading states and error handling

## Usage Examples

### Accessing Pool Data in Components
```tsx
import { useRedisPools } from '@/components/omlp/redis-pool-provider';

function MyComponent() {
  const { pools, isLoading, error } = useRedisPools();
  
  if (isLoading) return <div>Loading pools...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {pools.map(pool => (
        <div key={pool.poolId}>
          <h3>{pool.asset} Pool</h3>
          <p>Available: {pool.availableSupply}</p>
          <p>Utilization: {pool.utilizationRate}%</p>
          <p>Supply APY: {pool.currentSupplyApy}%</p>
        </div>
      ))}
    </div>
  );
}
```

### Updating Pool Utilization
```tsx
import { updatePoolUtilization } from '@/lib/redis/omlp-pool-service';

// When borrowing from pool
await updatePoolUtilization('SOL_POOL', borrowAmount, 'borrow');

// When returning to pool
await updatePoolUtilization('SOL_POOL', returnAmount, 'return');
```

### Manual Price Update
```tsx
import { updatePoolPrice } from '@/lib/redis/omlp-pool-service';

await updatePoolPrice('SOL_POOL', newSolPrice);
```

## Data Structure

### Pool Data in Redis
```typescript
{
  poolId: string;                // e.g., "SOL_POOL"
  asset: string;                 // e.g., "SOL"
  tokenAddress: string;          // Token contract address
  totalSupply: number;           // Total pool supply
  availableSupply: number;       // Available for borrowing
  utilizedSupply: number;        // Currently borrowed
  utilizationRate: number;       // Percentage utilized
  currentSupplyApy: number;      // Current supply APY
  currentBorrowApy: number;      // Current borrow APY
  assetPrice: number;            // Current asset price
  // ... additional config fields
}
```

## Future Enhancements

1. **User Position Tracking**
   - Track individual user positions in Redis
   - Real-time P&L calculations

2. **Option Contract Storage**
   - Store active option contracts
   - Real-time option pricing updates

3. **Trade Order Management**
   - Order book management
   - Trade execution tracking

4. **Analytics & Metrics**
   - Pool performance metrics
   - User activity tracking
