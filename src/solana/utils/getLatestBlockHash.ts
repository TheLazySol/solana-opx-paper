import { createSolanaClient } from "gill";
import { rpc } from '@/solana/constants/solanaClient';
import { validateEndpointFormat } from "./validateRpcConnection";

/**
 * Utility function to interact with Solana's RPC methods.
 * This function allows fetching the latest blockhash or the current slot from a Solana network.
 *
 * @param {("devnet" | "mainnet" | "testnet" | string)} network - The Solana network to connect to (either 'devnet', 'mainnet', 'testnet', or a custom URL).
 * @param {("getSlot" | "getLatestBlockhash")} method - The RPC method to call (either 'getSlot' or 'getLatestBlockhash').
 * 
 * @returns {Promise<any>} The result of the RPC method call.
 * 
 * @throws {Error} Throws an error if an invalid method is provided.
 */
export const getSolanaData = async (
  network: "devnet" | "mainnet" | "testnet" | string,
  method: "getSlot" | "getLatestBlockhash"
): Promise<any> => {
  try {
    // Use the existing rpc client if network is null, or create a new one for a specific network
    let client;
    
    // Determine if network is a URL or a network name
    if (network.startsWith('http:') || network.startsWith('https:')) {
      // It's a URL, use it directly after validation
      const validatedUrl = validateEndpointFormat(network);
      client = createSolanaClient({
        urlOrMoniker: validatedUrl,
      }).rpc;
    } else {
      // It's a network name, convert to URL with clusterApiUrl if it's a standard network
      if (network === 'devnet' || network === 'mainnet' || network === 'testnet') {
        client = createSolanaClient({
          urlOrMoniker: network,
        }).rpc;
      } else {
        // Default to using the existing central client
        client = rpc;
      }
    }

    switch (method) {
      case "getSlot":
        return await client.getSlot().send();

      case "getLatestBlockhash": {
        const { value: latestBlockhash } = await client.getLatestBlockhash().send();
        return latestBlockhash;
      }

      default:
        throw new Error("Invalid method provided. Please use 'getSlot' or 'getLatestBlockhash'.");
    }
  } catch (error: any) {
    console.error(`Error in getSolanaData:`, error);
    throw new Error(`Error fetching Solana data: ${(error as Error).message}`);
  }
};
