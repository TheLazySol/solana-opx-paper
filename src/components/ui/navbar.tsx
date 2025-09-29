'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import { 
  Navbar as HeroNavbar, 
  NavbarBrand, 
  NavbarContent, 
  NavbarItem, 
  NavbarMenuToggle, 
  NavbarMenu, 
  NavbarMenuItem 
} from '@heroui/navbar'
import { WalletButton } from '../solana/user-wallet/wallet-connect'
import { ClusterUiSelect } from '../solana/user-settings/rpc-dropdown-select'
import { useWallet } from '@solana/wallet-adapter-react'
import { ADMIN_WALLETS } from '@/constants/constants'

interface NavbarProps {
  links: { label: string; path: string }[]
}

export function Navbar({ links }: NavbarProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const { publicKey } = useWallet()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Check if current wallet is authorized for admin access
  const isAuthorized = mounted && publicKey && ADMIN_WALLETS.includes(publicKey.toString())
  
  // Filter links to include admin only for authorized wallets (only after mounting)
  const filteredLinks = React.useMemo(() => {
    const baseLinks = links.filter(link => link.path !== '/admin')
    if (mounted && isAuthorized) {
      return [...baseLinks, { label: 'Admin', path: '/admin' }]
    }
    return baseLinks
  }, [links, isAuthorized, mounted])

  // Always use the dark theme logo
  const logoSrc = '/epicentral-logo-light.png'

  const isActive = (path: string) => {
    return pathname === path || (path !== '/' && pathname.startsWith(path + '/'))
  }

  const getNavItemClasses = (label: string, path: string) => {
    const active = isActive(path)
    const isTrade = label.toLowerCase() === 'trade'
    
    if (isTrade && !active) {
      return `
        text-lg font-normal transition-all duration-300 relative
        bg-gradient-to-r from-[#4a85ff] to-[#1851c4] bg-clip-text text-transparent
        hover:from-[#5a95ff] hover:to-[#2861d4]
        after:absolute after:inset-0 after:rounded-lg 
        after:bg-gradient-to-r after:from-[#4a85ff]/20 after:to-[#1851c4]/20 
        after:blur-md after:opacity-60 after:-z-10
        after:animate-pulse after:transition-all after:duration-1000
      `
    }
    
    if (active) {
      return `
        text-lg font-normal transition-all duration-300 relative
        text-white
        after:absolute after:inset-0 after:rounded-lg 
        after:bg-white/10 after:blur-sm after:opacity-80 after:-z-10
        after:shadow-lg after:shadow-white/20
      `
    }
    
    return `
      text-lg font-normal transition-all duration-300 relative
      text-muted-foreground hover:text-white/90
      hover:after:absolute hover:after:inset-0 hover:after:rounded-lg 
      hover:after:bg-white/5 hover:after:blur-sm hover:after:opacity-60 hover:after:-z-10
    `
  }

  return (
    <HeroNavbar
      position="static"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      classNames={{
        base: "bg-transparent backdrop-blur-md border-none overflow-visible",
        wrapper: "max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[2000px] px-4 overflow-visible",
        brand: "w-[200px]",
        content: "data-[justify=center]:flex-1 data-[justify=end]:w-[200px] overflow-visible",
        item: "data-[active=true]:font-normal",
        menu: "bg-slate-950/95 backdrop-blur-md border-none",
        menuItem: "text-lg font-normal"
      }}
      height="4rem"
    >
      <NavbarBrand>
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
      </NavbarBrand>

      <NavbarContent className="hidden sm:flex gap-8" justify="center">
        {filteredLinks.map(({ label, path }) => (
          <NavbarItem key={path} isActive={isActive(path)}>
            <Link
              href={path}
              className={getNavItemClasses(label, path)}
            >
              {label}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem className="hidden sm:flex relative z-[9999]">
          <WalletButton />
        </NavbarItem>
        <NavbarItem className="hidden sm:flex">
          <ClusterUiSelect />
        </NavbarItem>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
        />
      </NavbarContent>

      <NavbarMenu>
        {filteredLinks.map(({ label, path }) => (
          <NavbarMenuItem key={path}>
            <Link
              href={path}
              className={`w-full transition-colors duration-200 ${
                isActive(path) 
                  ? 'text-white font-normal' 
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {label}
            </Link>
          </NavbarMenuItem>
        ))}
        <NavbarMenuItem>
          <div className="flex flex-col gap-4 pt-4 border-t border-slate-700">
            <WalletButton />
            <ClusterUiSelect />
          </div>
        </NavbarMenuItem>
      </NavbarMenu>
    </HeroNavbar>
  )
} 