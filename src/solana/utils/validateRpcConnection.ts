/**
 * Utility function to validate a Solana RPC connection
 * 
 * This function makes a simple getHealth request to check if the RPC endpoint is accessible
 * and properly responding to requests.
 * 
 * @param {string} endpoint - The RPC endpoint URL to validate
 * @returns {Promise<{success: boolean, message?: string, status?: number}>} 
 *          Result object with success status and optional error details
 */
export async function validateRpcConnection(endpoint: string): Promise<{
  success: boolean;
  message?: string;
  status?: number;
}> {
  try {
    // Validate endpoint format first
    const validatedEndpoint = validateEndpointFormat(endpoint);
    if (validatedEndpoint !== endpoint) {
      return {
        success: false,
        message: `Invalid RPC endpoint format: ${endpoint}. Using ${validatedEndpoint} instead.`,
      };
    }

    // Make a JSON-RPC request to the Solana node's getHealth method
    // This is a lightweight method that checks if the node is operational
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',  // JSON-RPC protocol version
        id: 1,           // Request identifier
        method: 'getHealth',  // Solana RPC method to check node health
      }),
    });

    // Check if the HTTP response indicates a problem (non-200 status code)
    if (!response.ok) {
      return {
        success: false,
        message: `RPC connection error: ${response.statusText}`,
        status: response.status,
      };
    }

    // Parse the JSON response
    const data = await response.json();
    
    // Check if the RPC response contains an error object
    // This can happen even with a 200 HTTP status if the RPC method itself fails
    if (data.error) {
      return {
        success: false,
        message: `RPC error: ${data.error.message || 'Unknown error'}`,
      };
    }

    // Log successful connection for debugging and monitoring purposes
    console.log(`✅ Successfully connected to RPC endpoint: ${endpoint}`);
    return { success: true };
  } catch (error) {
    // Handle any unexpected errors during the connection attempt
    // This could include network errors, timeout issues, or parsing problems
    return {
      success: false,
      message: `Failed to connect to RPC: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validates that the provided endpoint is a valid URL starting with http: or https:
 * @param endpoint The endpoint to validate
 * @returns A valid endpoint URL or Solana's devnet as fallback
 */
export function validateEndpointFormat(endpoint: string | undefined): string {
  if (!endpoint) {
    console.warn('No RPC endpoint provided, falling back to devnet');
    return 'https://api.devnet.solana.com';
  }
  
  if (!endpoint.startsWith('http:') && !endpoint.startsWith('https:')) {
    console.warn(`Invalid RPC endpoint format: ${endpoint}, falling back to devnet`);
    return 'https://api.devnet.solana.com';
  }
  
  return endpoint;
} 