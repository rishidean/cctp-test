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
      messageTransmitterAddress: '0x9ff9a4da6f2157a9c82ce756f8fd7e0d75be8895',
      domainId: 6 // Updated to correct Base domain ID
    },
    polygon: {
      name: 'Polygon',
      rpcUrl: 'https://polygon-rpc.com',
      chainId: '0x89', // 137 in decimal
      blockExplorerUrl: 'https://polygonscan.com',
      messageTransmitterAddress: '0x6B25532E1060CE10CC58C90Ee87f19AC4d4867EE',
      domainId: 7 // Updated to correct Polygon domain ID
    },
    solana: {
      name: 'Solana',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      blockExplorerUrl: 'https://explorer.solana.com',
      messageTransmitterAddress: 'CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd',
      domainId: 5 // Updated to correct Solana domain ID
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
  
  // Test wallet addresses
  testWallets: {
    base: '0x7eac9f0Dcf81Ed413647D2B1c9b02620DA298A93',
    polygon: '0x6Bf48FFd5de59775ECFE324AF684f1A9E6D80e10',
    solana: 'E7pWCGxvvhHZ6XgdJkBvfnt4J4UJBRJwhRmWjNwannci'
  },

  // Circle API
  circleApi: {
    baseUrl: 'https://iris-api.circle.com/v1',
    attestationPolling: {
      interval: 45000, //45 seconds
      maxAttempts: 30  // 22.5 minutes total wait time
    }
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
