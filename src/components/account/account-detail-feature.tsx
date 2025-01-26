'use client'

import { PublicKey } from '@solana/web3.js'
import { useMemo } from 'react'

import { useParams } from 'next/navigation'

import { ExplorerLink } from '../cluster/cluster-ui'
import { AppHero, ellipsify } from '../ui/ui-layout'
import { AccountBalance, AccountButtons, AccountTransactions } from './account-ui'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function AccountDetailFeature() {
  const params = useParams()
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
  if (!address) {
    return <div>Error loading account</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex flex-col items-center justify-center mb-8">
        <AppHero
          title={<AccountBalance address={address} />}
          subtitle={
            <div className="my-4">
              <ExplorerLink path={`account/${address}`} label={ellipsify(address.toString())} />
            </div>
          }
        >
          <div className="my-4">
            <AccountButtons address={address} />
          </div>
        </AppHero>
      </div>
      
      {/* Positions Container */}
      <Card className="border border-gray-200 dark:border-0 dark:bg-gradient-to-b dark:from-[#101010] dark:to-[#000000] mb-8">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Positions</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[200px]">
          {/* Content will go here */}
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
