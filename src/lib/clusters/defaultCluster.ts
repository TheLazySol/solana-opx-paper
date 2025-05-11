import { createSolanaClient } from 'gill'
import { Connection, clusterApiUrl } from '@solana/web3.js'
import { Cluster, ClusterNetwork } from '@/types/solana/solanaClusters'

/**
 * Get the Triton RPC URL from environment variables or use a default.
 * This helps ensure we have a valid endpoint even if the .env variable isn't set.
 */
const getTritonRpcUrl = (): string => {
  // Use environment variable or fall back to the Solana public devnet
  const url = process.env.NEXT_PUBLIC_TRITON_RPC_URL || 'https://api.devnet.solana.com';
  
  // Validate URL format
  if (!url.startsWith('http:') && !url.startsWith('https:')) {
    console.warn('Invalid RPC URL format in environment variable, falling back to devnet');
    return 'https://api.devnet.solana.com';
  }
  
  return url;
};

/**
 * Validates that the provided endpoint starts with http:// or https://
 * @param endpoint The endpoint to validate
 * @returns A valid endpoint URL or Solana's devnet as fallback
 */
const validateEndpoint = (endpoint: string): string => {
  if (!endpoint.startsWith('http:') && !endpoint.startsWith('https:')) {
    console.warn(`Invalid endpoint format: ${endpoint}, using default devnet`);
    return clusterApiUrl('devnet');
  }
  return endpoint;
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
      name: 'triton-devnet',
      endpoint: getTritonRpcUrl(),
      network: ClusterNetwork.Custom,
    },
    { 
      name: 'local', 
      endpoint: validateEndpoint('http://localhost:8899')
    },
    {
      name: 'testnet',
      endpoint: clusterApiUrl('testnet'),
      network: ClusterNetwork.Testnet,
    },
  ]