// Configuration for CCTP Bridge Application

const config = {
  // Network configurations
  networks: {
    base: {
      name: 'Base',
      rpcUrl: 'https://mainnet.base.org',
      chainId: '0x2105', // 8453 in decimal
      blockExplorerUrl: 'https://basescan.org',
      usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      tokenMessengerAddress: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
      domainId: 1653861089
    },
    polygon: {
      name: 'Polygon',
      rpcUrl: 'https://polygon-rpc.com',
      chainId: '0x89', // 137 in decimal
      blockExplorerUrl: 'https://polygonscan.com',
      messageTransmitterAddress: '0x6b25532e1060CE10CC58C90Ee87f19AC4d4867EE',
      domainId: 1886350457
    },
    solana: {
      name: 'Solana',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      blockExplorerUrl: 'https://explorer.solana.com',
      domainId: 1399811149 // Example value, verify with Circle docs
    }
  },

  // Default settings
  defaults: {
    sourceChain: 'base',
    destinationChain: 'polygon',
    recipientAddress: '', // To be filled with the connected wallet address
    amount: '1000000', // 1 USDC (6 decimals)
    gasLimit: 300000
  },

  // Circle API
  circleApi: {
    attestationUrl: 'https://iris-api.circle.com/v1/attestation/status'
  },

  // Polling settings for attestation
  polling: {
    intervalMs: 5000, // 5 seconds
    maxAttempts: 30 // 2.5 minutes total
  },

  // Debug settings
  debug: {
    enabled: true,
    logLevel: 'verbose' // 'normal', 'verbose', 'minimal'
  }
};

// Export the configuration
if (typeof module !== 'undefined') {
  module.exports = config;
} else {
  // For browser usage
  window.appConfig = config;
}
