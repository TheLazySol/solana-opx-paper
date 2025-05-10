'use client'

import { defaultClusters } from '@/lib/clusters/defaultCluster'
import { getClusterUrlParam } from '@/lib/clusters/getClusterUrlParam'
import { Cluster, ClusterNetwork, ClusterProviderContext } from '@/types/solana/solanaClusters'

import { Connection, clusterApiUrl } from '@solana/web3.js'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createSolanaClient } from 'gill'



/**
 * Atom storing the currently selected cluster with persistent storage.
 * Key: 'solana-cluster'
 * Default value: first cluster in the defaultClusters array.
 */
const clusterAtom = atomWithStorage<Cluster>('solana-cluster', defaultClusters[0])

/**
 * Atom storing the list of available clusters with persistent storage.
 * Key: 'solana-clusters'
 * Default value: defaultClusters array.
 */
const clustersAtom = atomWithStorage<Cluster[]>('solana-clusters', defaultClusters)

/**
 * Derived atom that returns the list of clusters with the active cluster flagged.
 *
 * @returns {Cluster[]} An array of clusters where the active cluster has its `active` property set to true.
 */
const activeClustersAtom = atom<Cluster[]>((get) => {
  const clusters = get(clustersAtom)
  const cluster = get(clusterAtom)
  return clusters.map((item) => ({
    ...item,
    active: item.name === cluster.name,
  }))
})
/**
 * Derived atom that returns the currently active cluster.
 *
 * @returns {Cluster} The active cluster, defaulting to the first cluster if none is explicitly active.
 */
const activeClusterAtom = atom<Cluster>((get) => {
  const clusters = get(activeClustersAtom)

  return clusters.find((item) => item.active) || clusters[0]
})

/**
 * React context for managing Solana clusters.
 * Provides access to the current cluster, the list of clusters, and functions to modify them.
 */
const Context = createContext<ClusterProviderContext>({} as ClusterProviderContext)
/**
 * ClusterProvider component that supplies cluster state and actions to its children.
 *
 * This component uses Jotai atoms to manage state and provides methods for adding, deleting,
 * and setting the active cluster, as well as a helper function for constructing explorer URLs.
 *
 * @param {Object} props - Component props.
 * @param {ReactNode} props.children - Child components that require access to the cluster context.
 * @returns {JSX.Element} The provider component wrapping its children with cluster context.
 */
export function ClusterProvider({ children }: { children: ReactNode }) {
  const cluster = useAtomValue(activeClusterAtom)
  const clusters = useAtomValue(activeClustersAtom)
  const setCluster = useSetAtom(clusterAtom)
  const setClusters = useSetAtom(clustersAtom)

  const value: ClusterProviderContext = {
    cluster,
    clusters: clusters.sort((a, b) => (a.name > b.name ? 1 : -1)),
    addCluster: (cluster: Cluster) => {
      try {
        new Connection(cluster.endpoint)
        setClusters([...clusters, cluster])
      } catch (err) {
        toast.error(`${err}`)
      }
    },
    deleteCluster: (cluster: Cluster) => {
      setClusters(clusters.filter((item) => item.name !== cluster.name))
    },
    setCluster: (cluster: Cluster) => setCluster(cluster),
    getExplorerUrl: (path: string) => `https://explorer.solana.com/${path}${getClusterUrlParam(cluster)}`,
  }
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useCluster() {
  return useContext(Context)
}

export { ClusterNetwork }

