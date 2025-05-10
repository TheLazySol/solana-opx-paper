import './globals.css'
import {ClusterProvider} from '@/components/cluster/cluster-data-access'
import {SolanaProvider} from '@/components/solana/solana-provider'
import {UiLayout} from '@/components/ui/ui-layout'
import {ReactQueryProvider} from './react-query-provider'
import {ThemeProvider} from '@/components/theme-provider'
import { BackgroundWrapper } from '@/components/ui/background-wrapper'
import { AssetPriceProvider } from '@/context/asset-price-provider'
import type { Metadata } from 'next'

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
      <body className="min-h-screen bg-background antialiased dark:bg-gray-950">
        <div id="wallet-extension-root" />
        <BackgroundWrapper />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <ClusterProvider>
              <SolanaProvider>
                <AssetPriceProvider>
                  <UiLayout links={links}>{children}</UiLayout>
                </AssetPriceProvider>
              </SolanaProvider>
            </ClusterProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
