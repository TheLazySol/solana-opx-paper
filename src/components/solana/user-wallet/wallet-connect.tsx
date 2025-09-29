'use client'

import dynamic from 'next/dynamic'
import { AnchorProvider } from '@coral-xyz/anchor'
import { WalletError } from '@solana/wallet-adapter-base'
import {
  AnchorWallet,
  useConnection,
  useWallet,
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { ReactNode, useCallback, useEffect, useMemo } from 'react'
import { useCluster } from '../../../solana/clusters/clusterDataAccess'
import toast from 'react-hot-toast'
import { validateRpcConnection } from '@/solana/utils/validateRpcConnection'
import { clusterApiUrl } from '@solana/web3.js'

require('@solana/wallet-adapter-react-ui/styles.css')

export const WalletButton = dynamic(
  async () => {
    const { WalletMultiButton } = await import('@solana/wallet-adapter-react-ui')
    const React = await import('react')
    
    return function CustomWalletButton(props: any) {
      const buttonRef = React.useRef<HTMLDivElement>(null)
      
      React.useEffect(() => {
        const fixDropdownPositioning = () => {
          const dropdown = document.querySelector('.wallet-adapter-dropdown-list')
          const button = buttonRef.current?.querySelector('.wallet-adapter-button-trigger')
          
          if (dropdown && button) {
            const buttonRect = button.getBoundingClientRect()
            const dropdownEl = dropdown as HTMLElement
            
            // Position dropdown relative to button
            dropdownEl.style.position = 'fixed'
            dropdownEl.style.top = `${buttonRect.bottom + 8}px`
            dropdownEl.style.right = `${window.innerWidth - buttonRect.right}px`
            dropdownEl.style.left = 'auto'
            dropdownEl.style.zIndex = '999999'
            dropdownEl.style.transform = 'none'
          }
        }
        
        // Fix positioning when dropdown becomes active
        const observer = new MutationObserver(() => {
          fixDropdownPositioning()
        })
        
        if (buttonRef.current) {
          observer.observe(buttonRef.current, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
          })
        }
        
        return () => observer.disconnect()
      }, [])
      
      return (
        <div ref={buttonRef} style={{ position: 'relative', zIndex: 999999 }}>
          <WalletMultiButton 
            {...props} 
            className="bg-[#4a85ff] hover:bg-[#4a85ff]/90 text-white border-0 h-9"
          />
        </div>
      )
    }
  },
  { ssr: false }
)

// Function to validate and sanitize endpoint URLs
const getValidEndpoint = (endpoint: string | undefined): string => {
  // Default to devnet if endpoint is missing
  if (!endpoint) {
    console.warn('No endpoint provided, falling back to devnet');
    return clusterApiUrl('devnet');
  }
  
  // Make sure the endpoint starts with http: or https:
  if (!endpoint.startsWith('http:') && !endpoint.startsWith('https:')) {
    console.warn(`Invalid endpoint format: ${endpoint}, falling back to devnet`);
    return clusterApiUrl('devnet');
  }
  
  return endpoint;
};

export function SolanaProvider({ children }: { children: ReactNode }) {
  const { cluster, setCluster, clusters } = useCluster()
  
  // Apply validation to ensure we have a valid endpoint URL
  const endpoint = useMemo(() => {
    const validEndpoint = getValidEndpoint(cluster.endpoint);
    // Log the cluster and endpoint information when it changes
    console.log(`Connected to Solana cluster: ${cluster.name} (${validEndpoint})`);
    return validEndpoint;
  }, [cluster.endpoint, cluster.name]);
  
  const onError = useCallback((error: WalletError) => {
    console.error('Wallet error:', error)
    toast.error(`Wallet error: ${error.message}`)
  }, [])

  // Validate connection on mount and when endpoint changes
  useEffect(() => {
    const checkConnection = async () => {
      // Skip validation if we're not in a browser environment
      if (typeof window === 'undefined') return;
      
      const result = await validateRpcConnection(endpoint);
      
      if (!result.success) {
        console.error(result.message);
        toast.error(result.message || 'RPC connection failed');
        
        // If current endpoint fails and it's the triton endpoint, try to fall back to a default devnet
        if (cluster.name === 'triton-devnet') {
          const devnetCluster = clusters.find(c => c.name === 'devnet');
          if (devnetCluster) {
            toast.success('Falling back to Solana devnet');
            setCluster(devnetCluster);
          }
        }
      }
    };
    
    checkConnection();
  }, [endpoint, cluster.name, clusters, setCluster]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} onError={onError} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export function useAnchorProvider() {
  const { connection } = useConnection()
  const wallet = useWallet()

  return new AnchorProvider(connection, wallet as AnchorWallet, { commitment: 'confirmed' })
}
