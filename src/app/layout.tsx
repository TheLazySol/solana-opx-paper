import './globals.css'
import {ClusterProvider} from '@/components/cluster/cluster-data-access'
import {SolanaProvider} from '@/components/solana/solana-provider'
import {UiLayout} from '@/components/ui/ui-layout'
import {ReactQueryProvider} from './react-query-provider'
import {ThemeProvider} from '@/components/theme-provider'

export const metadata = {
  title: 'Epicentral DOEX',
  description: 'A decentralized options exchange created by Epicentral Labs',
  icons: [
    { rel: 'icon', url: '/favicon.png' },
  ],
}

const links: { label: string; path: string }[] = [
  { label: 'Account', path: '/account' },
  { label: 'Mint Option', path: '/basic' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
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
