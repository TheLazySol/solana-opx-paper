import { Cluster, ClusterNetwork } from "@/solana/types/solanaClusters"
/**
 * Generates a URL query parameter for a given Solana cluster based on its network type.
 *
 * This function inspects the provided cluster's network and returns a query parameter string
 * that can be appended to a Solana explorer URL. It handles standard networks (Devnet, Mainnet,
 * Testnet) by returning their respective identifiers, and for custom networks it encodes the
 * cluster's endpoint.
 *
 * - For `ClusterNetwork.Devnet`, returns `"?cluster=devnet"`.
 * - For `ClusterNetwork.Mainnet`, returns an empty string (no parameter is added).
 * - For `ClusterNetwork.Testnet`, returns `"?cluster=testnet"`.
 * - For custom networks or if the network is unspecified, returns a parameter with a custom flag
 *   and the URL-encoded endpoint.
 *
 * @param {Cluster} cluster - The Solana cluster for which the URL parameter is generated.
 * @returns {string} A URL query parameter string to be appended to the explorer URL,
 *                   or an empty string if no parameter is necessary.
 *
 * @example
 * // For a devnet cluster:
 * // Returns "?cluster=devnet"
 * getClusterUrlParam({
 *   name: "devnet",
 *   endpoint: "https://api.devnet.solana.com",
 *   network: ClusterNetwork.Devnet
 * })
 */
export function getClusterUrlParam(cluster: Cluster): string {
  let suffix = ''
  switch (cluster.network) {
    case ClusterNetwork.Devnet:
      suffix = 'devnet'
      break
    case ClusterNetwork.Mainnet:
      suffix = 'mainnet'
      break
    case ClusterNetwork.Testnet:
      suffix = 'testnet'
      break
    default:
      suffix = `custom&customUrl=${encodeURIComponent(cluster.endpoint)}`
      break
  }

  return suffix.length ? `?cluster=${suffix}` : ''
}
