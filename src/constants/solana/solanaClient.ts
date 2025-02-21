import { createSolanaClient } from "gill";

/**
 * Determine the Solana network or custom RPC URL based on the environment variables.
 * 
 * - If `process.env.CUSTOM_RPC` is 'TRUE' and `process.env.CUSTOM_RPC_URL` is defined, 
 *   it will use the `CUSTOM_RPC_URL`.
 * - If `process.env.CUSTOM_RPC` is 'FALSE' or not defined, it will fall back to `process.env.ENV`.
 * - If `process.env.ENV` is 'production', it will use the 'devnet'; otherwise, it defaults to 'mainnet'.
 */
let network: string | undefined;

if (process.env.CUSTOM_RPC === "TRUE" && process.env.CUSTOM_RPC_URL) {
  network = process.env.CUSTOM_RPC_URL;
} else if (process.env.ENV) {
  network = process.env.ENV === "production" ? "devnet" : "mainnet";
} else {
  throw new Error("Neither CUSTOM_RPC_URL nor ENV is defined. Please check your environment variables.");
}

/**
 * Initialize the Solana client with the appropriate network settings.
 * 
 * `createSolanaClient` is used to create an instance of a Solana client
 * based on the selected network (devnet, mainnet, or custom RPC URL).
 * 
 * @param {Object} config - Configuration object for the Solana client.
 * @param {string} config.urlOrMoniker - The network to connect to (e.g., 'devnet', 'mainnet', or custom RPC URL).
 * 
 * @returns {Object} Returns the Solana client with methods for RPC, subscriptions, and transactions.
 */
const { rpc, rpcSubscriptions, sendAndConfirmTransaction } = createSolanaClient({
  urlOrMoniker: network!,
});

export { rpc, rpcSubscriptions, sendAndConfirmTransaction, createSolanaClient };
