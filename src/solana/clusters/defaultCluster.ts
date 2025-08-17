import { clusterApiUrl } from '@solana/web3.js'
import { Cluster, ClusterNetwork } from '@/solana/types/solanaClusters'
import { validateEndpointFormat } from '@/solana/utils/validateRpcConnection'

/**
 * Get the Triton RPC URL from environment variables or use a default.
 * This helps ensure we have a valid endpoint even if the .env variable isn't set.
 */
const getTritonRpcUrl = (): string => {
  // Use environment variable or fall back to the Solana public devnet
  const url = process.env.NEXT_PUBLIC_TRITON_RPC_URL || 'https://api.devnet.solana.com';
  // Use the unified validation function
  return validateEndpointFormat(url);
};

/**
 * Default Solana clusters configuration.
 *
 * This array contains the pre-configured cluster settings used by the application,
 * including the development (devnet), local, and test (testnet) clusters.
 *
 * @constant {Cluster[]}
 */
export const defaultClusters: Cluster[] = [
    {
      name: 'devnet',
      endpoint: clusterApiUrl('devnet'),
      network: ClusterNetwork.Devnet,
    },
    { 
      name: 'local', 
      endpoint: validateEndpointFormat('http://localhost:8899')
    },
    {
      name: 'testnet',
      endpoint: clusterApiUrl('testnet'),
      network: ClusterNetwork.Testnet,
    },
  ]