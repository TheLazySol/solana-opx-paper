
/**
 * Represents a Solana cluster configuration.
 * A cluster can have a name, an endpoint, and optional network and active status.
 * 
 * @interface
 * @property {string} name - The name of the cluster.
 * @property {string} endpoint - The URL endpoint for the cluster.
 * @property {ClusterNetwork} [network] - The network type of the cluster (optional).
 * @property {boolean} [active] - Whether the cluster is currently active (optional).
 */
export interface Cluster {
    name: string
    endpoint: string
    network?: ClusterNetwork
    active?: boolean
  }
  
  /**
   * Enum representing the available Solana cluster networks.
   * - Mainnet: The main Solana network.
   * - Testnet: A test environment for Solana.
   * - Devnet: A development network for Solana.
   * - Custom: A user-defined network.
   * 
   * @enum {string}
   */
  export enum ClusterNetwork {
    Mainnet = 'mainnet-beta',
    Testnet = 'testnet',
    Devnet = 'devnet',
    Custom = 'custom',
  }
  

/**
 * Context interface for managing Solana clusters.
 *
 * Provides the current cluster, a list of available clusters, and functions to add, delete,
 * and set the active cluster. It also includes a helper function to generate a URL for
 * the cluster's explorer based on a provided path.
 *
 * @interface ClusterProviderContext
 */
  export interface ClusterProviderContext {
    cluster: Cluster
    clusters: Cluster[]
    addCluster: (cluster: Cluster) => void
    deleteCluster: (cluster: Cluster) => void
    setCluster: (cluster: Cluster) => void
    getExplorerUrl(path: string): string
  }
