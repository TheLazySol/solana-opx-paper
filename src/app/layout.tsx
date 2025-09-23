import './globals.css'
import {ClusterProvider} from '@/solana/clusters/clusterDataAccess'
import {SolanaProvider} from '@/components/solana/user-wallet/wallet-connect'
import {UiLayout} from '@/components/ui/ui-layout'
import {ReactQueryProvider} from './react-query-provider'
import {ThemeProvider} from '@/components/theme-provider'
import { BackgroundWrapper } from '@/components/ui/background-wrapper'
import { AssetPriceProvider } from '@/context/asset-price-provider'

import {HeroUIProvider} from '@heroui/react'
import { Inter } from 'next/font/google'

import type { Metadata } from 'next'
import { Suspense } from 'react'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Solana OPX | Epicentral Labs',
  description: 'Decentralized Options Trading on Solana',
  icons: [
    { rel: 'icon', url: '/favicon.png' },
  ],
}

const links = [
  { label: 'Trade', path: '/trade' },
  { label: 'Option Lab', path: '/option-lab' },
  { label: 'OMLP', path: '/omlp' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" 
          rel="stylesheet" 
        />
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              if (localStorage.theme === 'light') {
                localStorage.setItem('theme', 'dark');
              }
              document.documentElement.classList.add('dark');
            } catch {}
          `
        }} />
      </head>
      <body className={`min-h-screen bg-background antialiased dark:bg-gray-950 ${inter.variable} font-sans`}>
        <div id="wallet-extension-root" />
        <BackgroundWrapper />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <HeroUIProvider>
            <ReactQueryProvider>
              <ClusterProvider>
                <SolanaProvider>
                  <Suspense fallback={
                    <div className="flex justify-center items-center min-h-screen">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  }>
                    <AssetPriceProvider>
                      <UiLayout links={links}>{children}</UiLayout>
                    </AssetPriceProvider>
                  </Suspense>
                </SolanaProvider>
              </ClusterProvider>
            </ReactQueryProvider>
          </HeroUIProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
