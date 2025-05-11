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
    if (!endpoint || (!endpoint.startsWith('http:') && !endpoint.startsWith('https:'))) {
      return {
        success: false,
        message: `Invalid RPC endpoint format: ${endpoint}. Must start with http: or https:`,
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        message: `RPC connection error: ${response.statusText}`,
        status: response.status,
      };
    }

    const data = await response.json();
    
    if (data.error) {
      return {
        success: false,
        message: `RPC error: ${data.error.message || 'Unknown error'}`,
      };
    }

    // Log successful connection
    console.log(`✅ Successfully connected to RPC endpoint: ${endpoint}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to RPC: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
} 