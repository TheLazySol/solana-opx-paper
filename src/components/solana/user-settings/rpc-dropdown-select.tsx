'use client'

import { useConnection } from '@solana/wallet-adapter-react'
import { IconTrash } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { AppModal } from '../../ui/ui-layout'
import { ClusterNetwork, useCluster } from '../../../solana/clusters/clusterDataAccess'
import { createSolanaClient } from 'gill'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

/**
 * Creates a link to the Solana Explorer for a given path
 * @param path - The path to link to in the explorer
 * @param label - The text to display for the link
 * @param className - Optional CSS class to apply to the link
 * @returns A formatted link to the Solana Explorer
 */
export function ExplorerLink({ path, label, className }: { path: string; label: string; className?: string }) {
  const { getExplorerUrl } = useCluster()
  return (
    <a
      href={getExplorerUrl(path)}
      target="_blank"
      rel="noopener noreferrer"
      className={className ? className : `link font-mono`}
    >
      {label}
    </a>
  )
}

/**
 * Verifies connection to the selected Solana cluster
 * Renders children only if connection is successful
 * @param children - React components to render when connection is verified
 * @returns Either the children components or an error/loading state
 */
export function ClusterChecker({ children }: { children: ReactNode }) {
  const { cluster } = useCluster()
  const { connection } = useConnection()

  const query = useQuery({
    queryKey: ['version', { cluster, endpoint: connection.rpcEndpoint }],
    queryFn: () => connection.getVersion(),
    retry: 1,
  })
  if (query.isLoading) {
    return null
  }
  if (query.isError || !query.data) {
    return (
      <div className="alert alert-warning text-warning-content/80 rounded-none flex justify-center">
        <span>
          Error connecting to cluster <strong>{cluster.name}</strong> 
        </span>
        <button className="btn btn-xs btn-neutral" onClick={() => query.refetch()}>
          Refresh
        </button>
      </div>
    )
  }
  return children
}

/**
 * Dropdown component for selecting a Solana cluster
 * Displays the current cluster and allows switching between available clusters
 */
export function ClusterUiSelect() {
  const { clusters, setCluster, cluster } = useCluster()
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 text-sm 
        bg-background hover:bg-accent transition-colors rounded-md border border-input border-[0.5px]">
        {cluster.name}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {clusters.map((item) => (
          <DropdownMenuItem
            key={item.name}
            onClick={() => setCluster(item)}
            className={`${item.active ? 'bg-accent' : ''} cursor-pointer`}
          >
            <span className="flex-1">{item.name}</span>
            {item.active && (
              <span className="text-xs text-muted-foreground ml-2">Active</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Modal for adding a new Solana cluster configuration
 * @param hideModal - Function to close the modal
 * @param show - Boolean to control modal visibility
 */
export function ClusterUiModal({ hideModal, show }: { hideModal: () => void; show: boolean }) {
  const { addCluster } = useCluster()
  const [name, setName] = useState('')
  const [network, setNetwork] = useState<ClusterNetwork | undefined>()
  const [endpoint, setEndpoint] = useState('')

  return (
    <AppModal
      title={'Add Cluster'}
      hide={hideModal}
      show={show}
      submit={() => {
        try {
          // Validate the endpoint by attempting to create a Solana client
          const { rpc, rpcSubscriptions, sendAndConfirmTransaction } = createSolanaClient({
            urlOrMoniker: endpoint,
          });
          if (name) {
            addCluster({ name, network, endpoint })
            hideModal()
          } else {
            console.log('Invalid cluster name')
          }
        } catch {
          console.log('Invalid cluster endpoint')
        }
      }}
      submitLabel="Save"
    >
      <input
        type="text"
        placeholder="Name"
        className="flex h-10 w-full rounded-lg bg-white/5 backdrop-blur-sm px-4 py-3 text-sm transition-all duration-200 border border-transparent placeholder:text-white/40 hover:bg-white/8 focus:outline-none focus:bg-white/10"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Endpoint"
        className="flex h-10 w-full rounded-lg bg-white/5 backdrop-blur-sm px-4 py-3 text-sm transition-all duration-200 border border-transparent placeholder:text-white/40 hover:bg-white/8 focus:outline-none focus:bg-white/10"
        value={endpoint}
        onChange={(e) => setEndpoint(e.target.value)}
      />
      <select
        className="select select-bordered w-full"
        value={network}
        onChange={(e) => setNetwork(e.target.value as ClusterNetwork)}
      >
        <option value={undefined}>Select a network</option>
        <option value={ClusterNetwork.Devnet}>Devnet</option>
        <option value={ClusterNetwork.Testnet}>Testnet</option>
        <option value={ClusterNetwork.Mainnet}>Mainnet</option>
      </select>
    </AppModal>
  )
}

/**
 * Table displaying all configured Solana clusters
 * Allows selecting a cluster or deleting unused clusters
 */
export function ClusterUiTable() {
  const { clusters, setCluster, deleteCluster } = useCluster()
  return (
    <div className="overflow-x-auto">
      <table className="table border-4 border-separate border-base-300">
        <thead>
          <tr>
            <th>Name/ Network / Endpoint</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((item) => (
            <tr key={item.name} className={item?.active ? 'bg-base-200' : ''}>
              <td className="space-y-2">
                <div className="whitespace-nowrap space-x-2">
                  <span className="text-xl">
                    {item?.active ? (
                      item.name
                    ) : (
                      <button title="Select cluster" className="link link-secondary" onClick={() => setCluster(item)}>
                        {item.name}
                      </button>
                    )}
                  </span>
                </div>
                <span className="text-xs">Network: {item.network ?? 'custom'}</span>
                <div className="whitespace-nowrap text-gray-500 text-xs">{item.endpoint}</div>
              </td>
              <td className="space-x-2 whitespace-nowrap text-center">
                <button
                  disabled={item?.active}
                  className="btn btn-xs btn-default btn-outline"
                  onClick={() => {
                    if (!window.confirm('Are you sure?')) return
                    deleteCluster(item)
                  }}
                >
                  <IconTrash size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
