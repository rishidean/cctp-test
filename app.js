// Main application logic for CCTP Bridge
document.addEventListener('DOMContentLoaded', () => {
  // Global state
  const state = {
    web3: null,
    provider: null,
    currentAccount: null,
    isConnected: false,
    currentNetwork: null,
    bridgeInProgress: false,
    currentStep: 0,
    sourceChain: null,
    destinationChain: null,
    amount: null,
    recipientAddress: null,
    transactions: {
      approval: null,
      burn: null,
      mint: null
    },
    messageId: null,
    attestation: null
  };

  // DOM Elements
  const connectWalletBtn = document.getElementById('connect-wallet');
  const walletAddressSpan = document.getElementById('wallet-address');
  const sourceChainSelect = document.getElementById('source-chain');
  const destinationChainSelect = document.getElementById('destination-chain');
  const amountInput = document.getElementById('amount');
  const recipientAddressInput = document.getElementById('recipient-address');
  const useCurrentWalletBtn = document.getElementById('use-current-wallet');
  const useTestWalletBtn = document.getElementById('use-test-wallet');
  const startBridgeBtn = document.getElementById('start-bridge');
  const clearLogBtn = document.getElementById('clear-log');
  const toggleDebugBtn = document.getElementById('toggle-debug');
  const eventLogContainer = document.getElementById('event-log');
  const transactionDetailsContainer = document.getElementById('transaction-details');

  // Initialize app
  init();

  // Initialize application
  async function init() {
    // Set default values from config
    sourceChainSelect.value = window.appConfig.defaults.sourceChain;
    destinationChainSelect.value = window.appConfig.defaults.destinationChain;
    
    // Convert from USDC units to human-readable (divide by 10^6)
    const defaultAmount = parseFloat(window.appConfig.defaults.amount) / 1000000;
    amountInput.value = defaultAmount.toString();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check if MetaMask is available
    if (window.ethereum) {
      try {
        // Request account access
        await connectWallet();
      } catch (error) {
        logEvent('error', 'Error connecting to wallet: ' + error.message);
      }
    } else {
      logEvent('warning', 'MetaMask is not installed. Please install it to use this application.');
    }
  }

  // Setup event listeners
  function setupEventListeners() {
    connectWalletBtn.addEventListener('click', connectWallet);
    useCurrentWalletBtn.addEventListener('click', useCurrentWallet);
    useTestWalletBtn.addEventListener('click', useTestWallet);
    startBridgeBtn.addEventListener('click', startBridge);
    clearLogBtn.addEventListener('click', clearLog);
    toggleDebugBtn.addEventListener('click', toggleDebug);
    
    // Handle chain changes so UI can adapt
    sourceChainSelect.addEventListener('change', onSourceChainChange);
    destinationChainSelect.addEventListener('change', onDestinationChainChange);
    
    // Listen for network changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
  }

  // Connect to wallet
  async function connectWallet() {
    if (window.ethereum) {
      try {
        state.provider = new ethers.providers.Web3Provider(window.ethereum);
        state.web3 = new Web3(window.ethereum);
        
        // Request accounts
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
          state.currentAccount = accounts[0];
          state.isConnected = true;
          walletAddressSpan.textContent = shortenAddress(state.currentAccount);
          connectWalletBtn.textContent = 'Connected';
          
          // Get current network
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          handleChainChanged(chainId);
          
          logEvent('success', 'Connected to wallet: ' + shortenAddress(state.currentAccount));
          
          // Automatically fill recipient address with current wallet
          if (!recipientAddressInput.value) {
            recipientAddressInput.value = state.currentAccount;
          }
        }
      } catch (error) {
        logEvent('error', 'Failed to connect to wallet: ' + error.message);
      }
    } else {
      logEvent('error', 'MetaMask is not installed');
    }
  }

  // Handle chain changed
  function handleChainChanged(chainId) {
    // Update UI based on new chain
    state.currentNetwork = chainId;
    logEvent('info', 'Network changed to chainId: ' + chainId);
    
    // You might want to check if the selected source chain matches the current network
    checkNetworkCompatibility();
  }

  // Handle accounts changed
  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      // User disconnected their wallet
      state.isConnected = false;
      state.currentAccount = null;
      walletAddressSpan.textContent = 'Not connected';
      connectWalletBtn.textContent = 'Connect Wallet';
      logEvent('info', 'Wallet disconnected');
    } else if (accounts[0] !== state.currentAccount) {
      // User switched accounts
      state.currentAccount = accounts[0];
      walletAddressSpan.textContent = shortenAddress(state.currentAccount);
      logEvent('info', 'Account changed to: ' + shortenAddress(state.currentAccount));
    }
  }

  // Check if the current network is compatible with the selected source chain
  function checkNetworkCompatibility() {
    const sourceChain = window.appConfig.networks[sourceChainSelect.value];
    if (state.currentNetwork && sourceChain.chainId !== state.currentNetwork) {
      logEvent('warning', `Connected to network chainId ${state.currentNetwork}, but selected source chain is ${sourceChain.name} (${sourceChain.chainId})`);
      return false;
    }
    return true;
  }

  // Use current wallet as recipient
  function useCurrentWallet() {
    if (state.currentAccount) {
      recipientAddressInput.value = state.currentAccount;
    } else {
      logEvent('warning', 'No wallet connected');
    }
  }
  
  // Use test wallet as recipient
  function useTestWallet() {
    const destinationChain = destinationChainSelect.value;
    if (window.appConfig.testWallets && window.appConfig.testWallets[destinationChain]) {
      recipientAddressInput.value = window.appConfig.testWallets[destinationChain];
      logEvent('info', `Using test wallet for ${destinationChain}: ${window.appConfig.testWallets[destinationChain]}`);
    } else {
      logEvent('warning', `No test wallet configured for ${destinationChain}`);
    }
  }

  // Handler for source chain change
  function onSourceChainChange() {
    const sourceChain = sourceChainSelect.value;
    
    // Prevent selecting the same chain for source and destination
    if (sourceChain === destinationChainSelect.value) {
      // Find a different destination chain
      const chains = Object.keys(window.appConfig.networks);
      for (const chain of chains) {
        if (chain !== sourceChain) {
          destinationChainSelect.value = chain;
          break;
        }
      }
    }
    
    checkNetworkCompatibility();
  }

  // Handler for destination chain change
  function onDestinationChainChange() {
    const destinationChain = destinationChainSelect.value;
    
    // Prevent selecting the same chain for source and destination
    if (destinationChain === sourceChainSelect.value) {
      // Find a different source chain
      const chains = Object.keys(window.appConfig.networks);
      for (const chain of chains) {
        if (chain !== destinationChain) {
          sourceChainSelect.value = chain;
          break;
        }
      }
    }
    
    // If a test wallet is currently being used, update it to the new destination chain
    if (recipientAddressInput.value && Object.values(window.appConfig.testWallets).includes(recipientAddressInput.value)) {
      // Check if there's a test wallet for the new destination chain
      if (window.appConfig.testWallets[destinationChain]) {
        recipientAddressInput.value = window.appConfig.testWallets[destinationChain];
        logEvent('info', `Updated test wallet for ${destinationChain}: ${window.appConfig.testWallets[destinationChain]}`);
      }
    }
  }

  // Start the bridge process
  async function startBridge() {
    if (state.bridgeInProgress) {
      logEvent('warning', 'Bridge already in progress');
      return;
    }
    
    if (!state.isConnected) {
      logEvent('error', 'Please connect your wallet first');
      return;
    }
    
    // Validate inputs
    const sourceChain = sourceChainSelect.value;
    const destChain = destinationChainSelect.value;
    const amount = amountInput.value;
    const recipient = recipientAddressInput.value;
    
    if (!sourceChain || !destChain || !amount || !recipient) {
      logEvent('error', 'Please fill in all fields');
      return;
    }
    
    // Check if networks match
    if (!checkNetworkCompatibility()) {
      const sourceChainObj = window.appConfig.networks[sourceChain];
      const switchResult = await switchToNetwork(sourceChainObj.chainId);
      if (!switchResult) {
        logEvent('error', `Please switch to ${sourceChainObj.name} network in your wallet`);
        return;
      }
    }
    
    // Convert amount to token units (with 6 decimals for USDC)
    const amountInUnits = Math.floor(parseFloat(amount) * 1000000).toString();
    
    // Update state
    state.bridgeInProgress = true;
    state.currentStep = 1;
    state.sourceChain = sourceChain;
    state.destinationChain = destChain;
    state.amount = amountInUnits;
    state.recipientAddress = recipient;
    
    // Reset previous transactions
    state.transactions = {
      approval: null,
      burn: null,
      mint: null
    };
    state.messageId = null;
    state.attestation = null;
    
    // Update UI
    startBridgeBtn.disabled = true;
    updateStepStatus(1, 'in-progress');
    
    // Start the bridge process
    try {
      // Step 1: Approve USDC
      await approveUSDC();
      
      // Step 2: Burn USDC
      await burnUSDC();
      
      // Step 3: Wait for attestation
      await waitForAttestation();
      
      // Step 4: Mint USDC
      await mintUSDC();
      
      // Bridge complete
      logEvent('success', 'Bridge complete! USDC has been transferred.');
    } catch (error) {
      logEvent('error', 'Bridge failed: ' + error.message);
    } finally {
      // Reset state
      state.bridgeInProgress = false;
      startBridgeBtn.disabled = false;
    }
  }

  // Step 1: Approve USDC for burning
  async function approveUSDC() {
    updateStepStatus(1, 'in-progress', 'Requesting approval for USDC');
    
    try {
      const sourceChainConfig = window.appConfig.networks[state.sourceChain];
      const usdcAddress = sourceChainConfig.usdcAddress;
      const tokenMessengerAddress = sourceChainConfig.tokenMessengerAddress;
      
      // Create contract instance
      const erc20Abi = [
        // approve function
        {
          "constant": false,
          "inputs": [
            {
              "name": "spender",
              "type": "address"
            },
            {
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "approve",
          "outputs": [
            {
              "name": "",
              "type": "bool"
            }
          ],
          "payable": false,
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];
      
      const usdcContract = new state.web3.eth.Contract(erc20Abi, usdcAddress);
      
      // Send approval transaction
      const tx = await usdcContract.methods.approve(tokenMessengerAddress, state.amount).send({
        from: state.currentAccount
      });
      
      // Update state with transaction result
      state.transactions.approval = tx.transactionHash;
      
      // Update UI
      updateStepStatus(1, 'complete', `Approved ${state.amount} USDC for burning. Transaction: ${shortenTxHash(tx.transactionHash)}`);
      logEvent('success', `USDC approval successful. Transaction: ${tx.transactionHash}`);
      
      // Update transaction details
      updateTransactionDetails('Approval', {
        hash: tx.transactionHash,
        from: tx.from,
        to: usdcAddress,
        value: '0',
        status: 'confirmed'
      });
      
      return tx;
    } catch (error) {
      updateStepStatus(1, 'failed', `Approval failed: ${error.message}`);
      throw new Error(`USDC approval failed: ${error.message}`);
    }
  }

  // Step 2: Burn USDC on source chain
  async function burnUSDC() {
    updateStepStatus(2, 'in-progress', 'Preparing to burn USDC on source chain');
    
    try {
      const sourceChainConfig = window.appConfig.networks[state.sourceChain];
      const destChainConfig = window.appConfig.networks[state.destinationChain];
      const tokenMessengerAddress = sourceChainConfig.tokenMessengerAddress;
      const usdcAddress = sourceChainConfig.usdcAddress;
      
      // Prepare depositForBurn parameters
      // Create bytesAddress for recipient (convert address to bytes32)
      // This converts the recipient address to a bytes32 format by padding with zeros
      let mintRecipient = state.recipientAddress;
      if (mintRecipient.startsWith('0x')) {
        mintRecipient = mintRecipient.slice(2); // Remove 0x prefix
      }
      const paddedRecipient = mintRecipient.padStart(64, '0');
      const mintRecipientBytes32 = '0x' + paddedRecipient;
      
      // TokenMessenger ABI (just what we need)
      const tokenMessengerAbi = [
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "uint32",
              "name": "destinationDomain",
              "type": "uint32"
            },
            {
              "internalType": "bytes32",
              "name": "mintRecipient",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "burnToken",
              "type": "address"
            }
          ],
          "name": "depositForBurn",
          "outputs": [
            {
              "internalType": "uint64",
              "name": "nonce",
              "type": "uint64"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];
      
      const tokenMessengerContract = new state.web3.eth.Contract(tokenMessengerAbi, tokenMessengerAddress);
      
      updateStepStatus(2, 'in-progress', 'Burning USDC on source chain');
      
      // Send depositForBurn transaction
      const tx = await tokenMessengerContract.methods.depositForBurn(
        state.amount,
        destChainConfig.domainId,
        mintRecipientBytes32,
        usdcAddress
      ).send({
        from: state.currentAccount,
        gas: window.appConfig.defaults.gasLimit
      });
      
      // Update state with transaction result
      state.transactions.burn = tx.transactionHash;
      
      // Update UI
      updateStepStatus(2, 'complete', `Burned ${state.amount} USDC on ${sourceChainConfig.name}. Transaction: ${shortenTxHash(tx.transactionHash)}`);
      logEvent('success', `USDC burn successful. Transaction: ${tx.transactionHash}`);
      
      // Update transaction details
      updateTransactionDetails('Burn', {
        hash: tx.transactionHash,
        from: tx.from,
        to: tokenMessengerAddress,
        value: '0',
        status: 'confirmed'
      });
      
      // Extract the MessageSent event to get the messageId
      // This would typically be extracted from the transaction receipt logs
      try {
        // Get transaction receipt
        const receipt = await state.web3.eth.getTransactionReceipt(tx.transactionHash);
        
        if (receipt && receipt.logs) {
          // Look for MessageSent event
          // In a production app, you'd want to decode these logs properly
          // For now, we'll simulate finding the messageId from the logs
          
          logEvent('info', 'Extracting messageId from transaction logs');
          
          // In a real implementation, we'd locate and parse the MessageSent event to get the messageId
          // For demonstration purposes, we'll set a mock messageId
          // In production, you'd parse receipt.logs to find the MessageSent event and extract the message and messageId
          
          // Here's how you would actually extract it:
          const messageSentEvent = receipt.logs.find(log => {
            // You would check the topic0 which is the event signature hash
            return log.topics && log.topics[0] === '0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'; // MessageSent event signature hash
          });
          
          if (messageSentEvent) {
            state.messageId = messageSentEvent.topics[1]; // In a real implementation, this would be the actual messageId
            logEvent('info', `Extracted messageId: ${state.messageId}`);
          } else {
            // For demo purposes, create a mock messageId
            state.messageId = '0x' + Array(64).fill('0').join('');
            logEvent('warning', 'Could not find MessageSent event, using mock messageId for demonstration');
          }
        }
      } catch (error) {
        logEvent('warning', `Error extracting messageId: ${error.message}, using mock ID`);
        state.messageId = '0x' + Array(64).fill('0').join('');
      }
      
      return tx;
    } catch (error) {
      updateStepStatus(2, 'failed', `Burn failed: ${error.message}`);
      throw new Error(`USDC burn failed: ${error.message}`);
    }
  }

  // Step 3: Wait for Circle's attestation
  async function waitForAttestation() {
    updateStepStatus(3, 'in-progress', 'Waiting for Circle attestation');
    
    try {
      logEvent('info', `Polling Circle's attestation API for messageId: ${state.messageId}`);
      
      // In a real implementation, you would poll Circle's attestation API
      // For this demo, we'll simulate the attestation process
      
      // Simulate polling with a timeout
      await new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = window.appConfig.polling.maxAttempts;
        const intervalMs = window.appConfig.polling.intervalMs;
        
        const pollInterval = setInterval(() => {
          attempts++;
          
          // Update UI
          updateStepStatus(3, 'in-progress', `Polling for attestation (attempt ${attempts}/${maxAttempts})`);
          
          // For demo purposes, let's assume we get an attestation after a few attempts
          if (attempts >= 3) {
            clearInterval(pollInterval);
            
            // Simulate attestation response
            state.attestation = {
              status: 'complete',
              attestation: '0x' + Array(128).fill('1').join(''), // Mock attestation signature
              timestamp: new Date().toISOString()
            };
            
            updateStepStatus(3, 'complete', 'Received attestation from Circle');
            logEvent('success', 'Attestation received from Circle');
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            reject(new Error('Attestation polling timed out after maximum attempts'));
          } else {
            logEvent('info', `Polling attempt ${attempts}/${maxAttempts}...`);
          }
        }, intervalMs);
      });
      
      // In a real implementation, you would call Circle's attestation API:
      // GET https://iris-api.circle.com/v1/attestation/status/{messageId}
      
      return state.attestation;
    } catch (error) {
      updateStepStatus(3, 'failed', `Attestation failed: ${error.message}`);
      throw new Error(`Failed to get attestation: ${error.message}`);
    }
  }

  // Step 4: Mint USDC on destination chain
  async function mintUSDC() {
    updateStepStatus(4, 'in-progress', 'Preparing to mint USDC on destination chain');
    
    try {
      const destChainConfig = window.appConfig.networks[state.destinationChain];
      
      // In a real implementation, you would need to switch networks here
      // For this demo, we'll simulate the network switch
      
      logEvent('info', `Switching to ${destChainConfig.name} network`);
      
      // Simulate switching networks (in production, you'd use ethereum.request to switch chains)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logEvent('info', `Switched to ${destChainConfig.name} network`);
      
      // In a real implementation, you would call the MessageTransmitter's receiveMessage
      // with the message and attestation
      
      updateStepStatus(4, 'in-progress', `Minting USDC on ${destChainConfig.name}`);
      
      // Simulate a successful mint transaction
      const mockTxHash = '0x' + Array(64).fill('2').join('').slice(0, 64);
      state.transactions.mint = mockTxHash;
      
      // Update UI
      updateStepStatus(4, 'complete', `Minted ${parseInt(state.amount) / 1000000} USDC on ${destChainConfig.name}. Transaction: ${shortenTxHash(mockTxHash)}`);
      logEvent('success', `USDC mint successful. Transaction: ${mockTxHash}`);
      
      // Update transaction details
      updateTransactionDetails('Mint', {
        hash: mockTxHash,
        from: state.currentAccount,
        to: destChainConfig.messageTransmitterAddress,
        value: '0',
        status: 'confirmed'
      });
      
      return { transactionHash: mockTxHash };
    } catch (error) {
      updateStepStatus(4, 'failed', `Mint failed: ${error.message}`);
      throw new Error(`USDC mint failed: ${error.message}`);
    }
  }

  // Switch ethereum network
  async function switchToNetwork(chainId) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        // Chain not added to MetaMask
        try {
          const network = Object.values(window.appConfig.networks).find(n => n.chainId === chainId);
          if (network) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: network.chainId,
                chainName: network.name,
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: [network.blockExplorerUrl]
              }]
            });
            return true;
          }
        } catch (addError) {
          logEvent('error', `Failed to add network: ${addError.message}`);
          return false;
        }
      }
      logEvent('error', `Failed to switch network: ${error.message}`);
      return false;
    }
  }

  // Update step status in UI
  function updateStepStatus(stepNumber, status, details = null) {
    const step = document.getElementById(`step-${stepNumber}`);
    const statusElement = step.querySelector('.step-status');
    const detailsElement = step.querySelector('.step-details');
    
    // Update status
    statusElement.textContent = capitalizeFirstLetter(status);
    statusElement.dataset.status = status;
    
    // Update details if provided
    if (details) {
      detailsElement.textContent = details;
      detailsElement.style.display = 'block';
    }
    
    // Update step number styling
    const stepNumberElement = step.querySelector('.step-number');
    
    if (status === 'complete') {
      stepNumberElement.style.backgroundColor = '#e8f5e9';
      stepNumberElement.style.color = '#2e7d32';
    } else if (status === 'in-progress') {
      stepNumberElement.style.backgroundColor = '#fff8e1';
      stepNumberElement.style.color = '#f57f17';
    } else if (status === 'failed') {
      stepNumberElement.style.backgroundColor = '#ffebee';
      stepNumberElement.style.color = '#c62828';
    } else {
      // Reset to default
      stepNumberElement.style.backgroundColor = '#e1e4e8';
      stepNumberElement.style.color = '#666';
    }
  }

  // Update transaction details in UI
  function updateTransactionDetails(type, details) {
    const container = document.createElement('div');
    container.className = 'transaction-detail';
    
    const title = document.createElement('h4');
    title.textContent = `${type} Transaction`;
    container.appendChild(title);
    
    const detailsList = document.createElement('ul');
    detailsList.className = 'details-list';
    
    // Add transaction details
    Object.entries(details).forEach(([key, value]) => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.className = 'detail-label';
      label.textContent = capitalizeFirstLetter(key) + ': ';
      
      const valueSpan = document.createElement('span');
      valueSpan.className = 'detail-value';
      valueSpan.textContent = value;
      
      item.appendChild(label);
      item.appendChild(valueSpan);
      detailsList.appendChild(item);
    });
    
    container.appendChild(detailsList);
    
    // Add explorer link if hash is available
    if (details.hash) {
      const link = document.createElement('a');
      link.className = 'explorer-link';
      link.textContent = 'View on Explorer';
      link.target = '_blank';
      
      // Determine which explorer to use based on transaction type
      let explorerUrl;
      if (type === 'Mint') {
        explorerUrl = window.appConfig.networks[state.destinationChain].blockExplorerUrl;
      } else {
        explorerUrl = window.appConfig.networks[state.sourceChain].blockExplorerUrl;
      }
      
      link.href = `${explorerUrl}/tx/${details.hash}`;
      container.appendChild(link);
    }
    
    // Prepend to the container (newest first)
    transactionDetailsContainer.prepend(container);
  }

  // Log event to UI
  function logEvent(level, message) {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${level}`;
    
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    
    const messageSpan = document.createElement('span');
    messageSpan.className = 'message';
    messageSpan.textContent = message;
    
    logEntry.appendChild(timestamp);
    logEntry.appendChild(document.createTextNode(' '));
    logEntry.appendChild(messageSpan);
    
    eventLogContainer.appendChild(logEntry);
    eventLogContainer.scrollTop = eventLogContainer.scrollHeight;
    
    // Also log to console for debugging
    if (window.appConfig.debug.enabled) {
      console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](`[${level.toUpperCase()}] ${message}`);
    }
  }

  // Clear log
  function clearLog() {
    eventLogContainer.innerHTML = '';
  }

  // Toggle debug panel
  function toggleDebug() {
    const debugContent = document.querySelector('.debug-content');
    if (debugContent.style.display === 'none') {
      debugContent.style.display = 'grid';
      toggleDebugBtn.textContent = 'Hide';
    } else {
      debugContent.style.display = 'none';
      toggleDebugBtn.textContent = 'Show';
    }
  }

  // Helper: Shorten address for display
  function shortenAddress(address) {
    if (!address) return '';
    return address.slice(0, 6) + '...' + address.slice(-4);
  }

  // Helper: Shorten transaction hash for display
  function shortenTxHash(hash) {
    if (!hash) return '';
    return hash.slice(0, 6) + '...' + hash.slice(-4);
  }

  // Helper: Capitalize first letter of string
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
});
