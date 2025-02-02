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

const links = [
  { label: 'Trade', path: '/trade' },
  { label: 'Portfolio', path: '/account' },
  { label: 'Mint Option', path: '/mint-option' },
  { label: 'OMLP', path: '/omlp' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div 
          className="fixed inset-0 z-[-1]"
          style={{
            backgroundImage: 'url("/WebPageBackground.png")',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            opacity: 0.15
          }}
        />
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
