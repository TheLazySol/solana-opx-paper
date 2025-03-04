import './globals.css'
import {ClusterProvider} from '@/components/cluster/cluster-data-access'
import {SolanaProvider} from '@/components/solana/solana-provider'
import {UiLayout} from '@/components/ui/ui-layout'
import {ReactQueryProvider} from './react-query-provider'
import {ThemeProvider} from '@/components/theme-provider'
import {Background} from '@/components/ui/background'
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
  { label: 'Portfolio', path: '/account' },
  { label: 'Option Lab', path: '/mint-option' },
  { label: 'OMLP', path: '/omlp' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Background />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <ClusterProvider>
              <SolanaProvider>
                <UiLayout links={links}>{children}</UiLayout>
              </SolanaProvider>
            </ClusterProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
