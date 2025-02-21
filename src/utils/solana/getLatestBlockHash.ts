import { createSolanaClient } from "gill";

/**
 * Utility function to interact with Solana's RPC methods.
 * This function allows fetching the latest blockhash or the current slot from a Solana network.
 *
 * @param {("devnet" | "mainnet")} network - The Solana network to connect to (either 'devnet' or 'mainnet').
 * @param {("getSlot" | "getLatestBlockhash")} method - The RPC method to call (either 'getSlot' or 'getLatestBlockhash').
 * 
 * @returns {Promise<any>} The result of the RPC method call.
 * 
 * @throws {Error} Throws an error if an invalid method is provided.
 */
export const getSolanaData = async (
  network: "devnet" | "mainnet",  // Restrict network to 'devnet' or 'mainnet'
  method: "getSlot" | "getLatestBlockhash"  // Restrict method to specific allowed RPC calls
): Promise<any> => {
  try {
    const { rpc } = createSolanaClient({
      urlOrMoniker: network,
    });

    switch (method) {
      case "getSlot":
        return await rpc.getSlot().send();

      case "getLatestBlockhash":
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
        return latestBlockhash;

      default:
        throw new Error("Invalid method provided. Please use 'getSlot' or 'getLatestBlockhash'.");
    }
  } catch (error: any) {
    throw new Error(`Error fetching Solana data: ${(error as Error).message}`);
  }
};
