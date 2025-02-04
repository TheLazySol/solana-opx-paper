'use client'

import { PublicKey } from '@solana/web3.js'
import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '../ui/button'

import { useParams } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'

import { ExplorerLink } from '../cluster/cluster-ui'
import { AppHero, ellipsify } from '../ui/ui-layout'
import { AccountBalance, AccountButtons, AccountTransactions } from './account-ui'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AccountBalanceChart } from './account-balance-chart'
import { PositionsTable } from './account-positions'
import { PortfolioValueChart } from './portfolio-value-chart'
import { WalletButton } from '../wallet/wallet-button'

export default function AccountDetailFeature() {
  const params = useParams()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { publicKey } = useWallet()
  
  const address = useMemo(() => {
    if (!params.address) {
      return
    }
    try {
      return new PublicKey(params.address)
    } catch (e) {
      console.log(`Invalid public key`, e)
    }
  }, [params])

  const handleRefreshPositions = () => {
    setIsRefreshing(true)
    console.log('Refreshing positions...')
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <div className="flex flex-col items-center gap-6">
          <p className="text-lg text-muted-foreground">
            Connect wallet to view portfolio
          </p>
          <div className="flex justify-center">
            <WalletButton />
          </div>
        </div>
      </div>
    )
  }

  if (!address) {
    return <div>Error loading account</div>
  }

  return (
    <div className="max-w-[90%] mx-auto px-4">
      <div className="flex flex-col items-center justify-center mb-8">
        <AppHero
          title={<AccountBalance address={address} />}
          subtitle=""
        />
      </div>
      
      {/* Portfolio Value Chart */}
      <PortfolioValueChart />

      {/* Positions Container */}
      <Card className="border border-gray-200 dark:border-0 dark:bg-gradient-to-b dark:from-[#101010] dark:to-[#000000] mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold">Positions</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefreshPositions}
            className="h-8 w-8 text-gray-400 hover:text-gray-100 transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw 
              size={16} 
              className={`${isRefreshing ? 'animate-spin' : ''} transition-transform duration-300`}
            />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-custom">
            <PositionsTable />
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Container */}
      <Card className="border border-gray-200 dark:border-0 dark:bg-gradient-to-b dark:from-[#101010] dark:to-[#000000]">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountTransactions address={address} />
        </CardContent>
      </Card>
    </div>
  )
}
