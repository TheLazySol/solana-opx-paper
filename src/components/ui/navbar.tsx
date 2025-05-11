'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import { WalletButton } from '../solana/user-wallet/wallet-connect'
import { ClusterUiSelect } from '../solana/user-settings/rpc-dropdown-select'

interface NavbarProps {
  links: { label: string; path: string }[]
}

export function Navbar({ links }: NavbarProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Always use the dark theme logo
  const logoSrc = '/epicentral-logo-light.png'

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
        <div className="w-[200px]">
          <Link href="/" className="block transition-transform hover:scale-105 duration-200">
            {mounted ? (
              <Image 
                src={logoSrc}
                alt="Epicentral Labs Logo"
                width={120}
                height={35}
                className="h-[35px] w-auto object-contain"
                priority
                onError={(e) => {
                  console.error('Error loading image:', e);
                }}
              />
            ) : (
              <div className="h-[35px] w-[120px]" />
            )}
          </Link>
        </div>
        <div className="flex-1 flex justify-center">
          <nav className="flex items-center gap-8">
            {links.map(({ label, path }) => (
              <Link
                key={path}
                href={path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  (pathname === path || (path !== '/' && pathname.startsWith(path + '/'))) 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="w-[200px] flex justify-end items-center space-x-4">
          <WalletButton />
          <ClusterUiSelect />
        </div>
      </div>
    </div>
  )
} 