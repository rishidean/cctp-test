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
    attestation: null,
    attestationAttempts: 0,
    maxAttestationAttempts: 30
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
        // Try to use ethers.js if available
        if (typeof ethers !== 'undefined') {
          state.provider = new ethers.providers.Web3Provider(window.ethereum);
        } else {
          // Fall back to just web3.js if ethers isn't available
          logEvent('warning', 'Ethers.js not detected, falling back to Web3.js only');
        }
        
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
    
    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      logEvent('error', 'Please enter a valid amount greater than 0');
      return;
    }
    
    // Check for potentially erroneous large amounts
    if (parsedAmount > 1000) {
      const confirmLargeAmount = confirm(`You're about to bridge ${parsedAmount} USDC (${parsedAmount * 1000000} base units). Are you sure this is correct? For example, to transfer $1.07, you should enter 1.07 (not 1070000).`);
      if (!confirmLargeAmount) {
        return;
      }
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
    
    // Log the human-readable and unit conversion
    logEvent('info', `Converting ${amount} USDC to ${amountInUnits} base units (6 decimals)`);
    
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
        },
        // allowance function
        {
          "constant": true,
          "inputs": [
            {
              "name": "owner",
              "type": "address"
            },
            {
              "name": "spender",
              "type": "address"
            }
          ],
          "name": "allowance",
          "outputs": [
            {
              "name": "",
              "type": "uint256"
            }
          ],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        }
      ];
      
      const usdcContract = new state.web3.eth.Contract(erc20Abi, usdcAddress);
      
      // Check current allowance
      const currentAllowance = await usdcContract.methods.allowance(state.currentAccount, tokenMessengerAddress).call();
      logEvent('info', `Current allowance: ${currentAllowance}`);
      
      // If there's an existing allowance, reset it to 0 first
      if (currentAllowance !== '0') {
        logEvent('info', 'Resetting allowance to 0');
        updateStepStatus(1, 'in-progress', 'Resetting previous allowance');
        
        // Estimate gas for the reset transaction
        const gasEstimateReset = await usdcContract.methods.approve(tokenMessengerAddress, '0').estimateGas({
          from: state.currentAccount
        });
        
        // Add 20% buffer to gas estimate
        const gasLimitReset = Math.floor(gasEstimateReset * 1.2);
        
        // Send reset transaction
        const resetTx = await usdcContract.methods.approve(tokenMessengerAddress, '0').send({
          from: state.currentAccount,
          gas: gasLimitReset
        });
        
        logEvent('success', `Reset allowance transaction: ${resetTx.transactionHash}`);
      }
      
      // Now set the new allowance
      updateStepStatus(1, 'in-progress', 'Setting new allowance');
      
      // Estimate gas for the approve transaction
      const gasEstimateApprove = await usdcContract.methods.approve(tokenMessengerAddress, state.amount).estimateGas({
        from: state.currentAccount
      });
      
      // Add 20% buffer to gas estimate
      const gasLimitApprove = Math.floor(gasEstimateApprove * 1.2);
      
      // Send approval transaction
      const tx = await usdcContract.methods.approve(tokenMessengerAddress, state.amount).send({
        from: state.currentAccount,
        gas: gasLimitApprove
      });
      
      // Update state with transaction result
      state.transactions.approval = tx.transactionHash;
      
      // Verify the new allowance
      const newAllowance = await usdcContract.methods.allowance(state.currentAccount, tokenMessengerAddress).call();
      if (BigInt(newAllowance) < BigInt(state.amount)) {
        throw new Error(`Allowance not set correctly. Expected ${state.amount}, got ${newAllowance}`);
      }
      
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
      
      // Debug logs
      logEvent('info', `Source Chain: ${state.sourceChain} (Domain: ${sourceChainConfig.domainId})`);
      logEvent('info', `Destination Chain: ${state.destinationChain} (Domain: ${destChainConfig.domainId})`);
      logEvent('info', `TokenMessenger Address: ${tokenMessengerAddress}`);
      logEvent('info', `USDC Address: ${usdcAddress}`);
      logEvent('info', `Amount to burn: ${state.amount}`);
      logEvent('info', `Recipient Address: ${state.recipientAddress}`);
      
      // Prepare depositForBurn parameters
      let mintRecipient = state.recipientAddress;
      if (mintRecipient.startsWith('0x')) {
        mintRecipient = mintRecipient.slice(2); // Remove 0x prefix
      }
      
      // Validate address format
      if (mintRecipient.length !== 40) {
        throw new Error(`Invalid recipient address length: ${mintRecipient.length}. Expected 40 characters (without 0x prefix).`);
      }
      if (!/^[0-9a-fA-F]{40}$/.test(mintRecipient)) {
        throw new Error('Invalid recipient address format. Address should only contain hex characters.');
      }
      
      // Convert address to bytes32
      const paddedRecipient = mintRecipient.padStart(64, '0');
      const mintRecipientBytes32 = '0x' + paddedRecipient;
      
      logEvent('info', `Converted recipient address to bytes32: ${mintRecipientBytes32}`);
      
      // Check ETH balance for gas
      const ethBalance = await state.web3.eth.getBalance(state.currentAccount);
      logEvent('info', `ETH Balance: ${state.web3.utils.fromWei(ethBalance, 'ether')} ETH`);
      
      // Check USDC balance and allowance
      const erc20Abi = [
        {
          "constant": true,
          "inputs": [{"name": "account", "type": "address"}],
          "name": "balanceOf",
          "outputs": [{"name": "", "type": "uint256"}],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "spender", "type": "address"}
          ],
          "name": "allowance",
          "outputs": [{"name": "", "type": "uint256"}],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        }
      ];
      
      const usdcContract = new state.web3.eth.Contract(erc20Abi, usdcAddress);
      const balance = await usdcContract.methods.balanceOf(state.currentAccount).call();
      const allowance = await usdcContract.methods.allowance(state.currentAccount, tokenMessengerAddress).call();
      
      logEvent('info', `USDC Balance: ${balance} base units (${balance/1000000} USDC)`);
      logEvent('info', `Current allowance: ${allowance} base units (${allowance/1000000} USDC)`);
      
      if (BigInt(balance) < BigInt(state.amount)) {
        throw new Error(`Insufficient USDC balance. Have ${balance/1000000} USDC, need ${state.amount/1000000} USDC`);
      }
      if (BigInt(allowance) < BigInt(state.amount)) {
        throw new Error(`Insufficient allowance. Have ${allowance/1000000} USDC, need ${state.amount/1000000} USDC`);
      }
      
      // Create TokenMessenger contract instance
      const tokenMessengerContract = new state.web3.eth.Contract([
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
      ], tokenMessengerAddress);
      
      const destinationDomain = Number(destChainConfig.domainId);
      
      // Validate destination domain
      if (!Number.isInteger(destinationDomain)) {
        throw new Error(`Invalid destination domain: ${destinationDomain}. Must be an integer.`);
      }
      
      // Log transaction parameters
      logEvent('info', 'Preparing depositForBurn transaction with parameters:');
      logEvent('info', `- Amount: ${state.amount} (${state.amount/1000000} USDC)`);
      logEvent('info', `- Destination Domain: ${destinationDomain}`);
      logEvent('info', `- Mint Recipient (bytes32): ${mintRecipientBytes32}`);
      logEvent('info', `- Burn Token: ${usdcAddress}`);
      
      // Estimate gas with a try-catch to get more information
      try {
        // Log all parameters in detail before estimation
        logEvent('info', 'Detailed transaction parameters:');
        logEvent('info', `Amount: ${state.amount} (${state.amount/1000000} USDC)`);
        logEvent('info', `Amount type: ${typeof state.amount}`);
        logEvent('info', `Destination Domain: ${destinationDomain}`);
        logEvent('info', `Domain type: ${typeof destinationDomain}`);
        logEvent('info', `Mint Recipient: ${mintRecipientBytes32}`);
        logEvent('info', `Burn Token: ${usdcAddress}`);
        
        // Try gas estimation with higher limit first
        const initialGasLimit = 500000; // Start with a higher gas limit
        
        logEvent('info', 'Attempting gas estimation...');
        const gasEstimate = await tokenMessengerContract.methods.depositForBurn(
          state.amount,
          destinationDomain,
          mintRecipientBytes32,
          usdcAddress
        ).estimateGas({
          from: state.currentAccount,
          gas: initialGasLimit
        });
        
        // Add 30% buffer to gas estimate for safety
        const gasLimit = Math.floor(gasEstimate * 1.3);
        logEvent('info', `Base gas estimate: ${gasEstimate}`);
        logEvent('info', `Using gas limit with 30% buffer: ${gasLimit}`);
        
        // Get gas price
        const gasPrice = await state.web3.eth.getGasPrice();
        logEvent('info', `Current gas price: ${gasPrice} wei`);

        // Calculate EIP-1559 gas parameters
        const maxPriorityFeePerGas = state.web3.utils.toWei('2.5', 'gwei'); // 2.5 GWEI priority fee
        const baseFeePerGas = await state.web3.eth.getBlock('latest').then(block => block.baseFeePerGas);
        const maxFeePerGas = BigInt(baseFeePerGas) * BigInt(2) + BigInt(maxPriorityFeePerGas); // 2x current base fee + priority fee

        logEvent('info', `Base fee: ${baseFeePerGas} wei`);
        logEvent('info', `Max priority fee: ${maxPriorityFeePerGas} wei`);
        logEvent('info', `Max fee per gas: ${maxFeePerGas} wei`);

        const gasCost = state.web3.utils.fromWei(
          (BigInt(maxFeePerGas) * BigInt(gasLimit)).toString(),
          'ether'
        );
        logEvent('info', `Estimated total max gas cost: ${gasCost} ETH`);
        
        // Send transaction with the calculated gas parameters
        logEvent('info', 'Sending depositForBurn transaction...');
        const tx = await tokenMessengerContract.methods.depositForBurn(
          state.amount,
          destinationDomain,
          mintRecipientBytes32,
          usdcAddress
        ).send({
          from: state.currentAccount,
          gas: gasLimit,
          maxFeePerGas: maxFeePerGas.toString(),
          maxPriorityFeePerGas: maxPriorityFeePerGas
        });
        
        // Get transaction receipt to extract message ID from logs
        const receipt = await state.web3.eth.getTransactionReceipt(tx.transactionHash);
        
        // Find MessageSent event
        const eventTopic = state.web3.utils.keccak256('MessageSent(bytes)');
        const messageSentEvent = receipt.logs.find(log => 
          log.topics && log.topics[0] === eventTopic
        );
        
        if (messageSentEvent) {
          // Extract message data from the event exactly as in Circle's example
          const messageBytes = state.web3.eth.abi.decodeParameters(['bytes'], messageSentEvent.data)[0];
          const messageHash = state.web3.utils.keccak256(messageBytes);
          
          // Store message data for later use
          state.messageId = messageHash;
          state.attestation = {
            message: messageBytes,
            attestation: null // Will be filled by waitForAttestation
          };
          
          // Add detailed logging
          logEvent('info', '=== Message ID Extraction Success ===');
          logEvent('info', `Message Hash: ${messageHash}`);
          logEvent('info', `Message Bytes: ${messageBytes}`);
        } else {
          // Log the full receipt for debugging if MessageSent event not found
          logEvent('error', 'MessageSent event not found in transaction logs. Full receipt:');
          logEvent('error', JSON.stringify(receipt, null, 2));
          logEvent('error', 'Transaction logs:');
          receipt.logs.forEach((log, index) => {
            logEvent('error', `Log ${index}:`);
            logEvent('error', `  Topics: ${JSON.stringify(log.topics)}`);
            logEvent('error', `  Data: ${log.data}`);
          });
          throw new Error('MessageSent event not found in transaction logs');
        }
        
        // Update state and UI
        state.transactions.burn = tx.transactionHash;
        updateStepStatus(2, 'complete', `Burned ${state.amount/1000000} USDC on ${sourceChainConfig.name}. Transaction: ${shortenTxHash(tx.transactionHash)}`);
        logEvent('success', `USDC burn successful. Transaction: ${tx.transactionHash}`);
        
        // Update transaction details
        updateTransactionDetails('Burn', {
          hash: tx.transactionHash,
          from: tx.from,
          to: tokenMessengerAddress,
          value: '0',
          status: 'confirmed'
        });
        
        return tx;
      } catch (error) {
        // Log detailed error information
        logEvent('error', `Transaction error: ${error.message}`);
        if (error.data) {
          logEvent('error', `Error data: ${JSON.stringify(error.data)}`);
        }
        if (error.code) {
          logEvent('error', `Error code: ${error.code}`);
        }
        throw error;
      }
    } catch (error) {
      updateStepStatus(2, 'failed', `Burn failed: ${error.message}`);
      throw new Error(`USDC burn failed: ${error.message}`);
    }
  }

  // Fetch Circle's public keys
  async function getCirclePublicKeys() {
    try {
      const response = await fetch(`${window.appConfig.circleApi.baseUrl}/attestations/public-keys`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch public keys: ${response.status}`);
      }

      const data = await response.json();
      if (!data.publicKeys || !data.publicKeys.length) {
        throw new Error('No public keys found in response');
      }

      logEvent('info', `Retrieved ${data.publicKeys.length} public keys from Circle`);
      return data.publicKeys;
    } catch (error) {
      logEvent('error', `Failed to get public keys: ${error.message}`);
      throw error;
    }
  }

  // Verify attestation signature using Circle's public keys
  async function verifyAttestation(attestation, message) {
    try {
      const publicKeys = await getCirclePublicKeys();
      
      // The attestation from Circle is in hex format, convert it to bytes
      const attestationBytes = ethers.utils.arrayify(attestation);
      const messageBytes = ethers.utils.arrayify(message);
      
      // Try each public key until we find one that verifies
      for (const key of publicKeys) {
        try {
          // Convert public key to address format
          const publicKeyBytes = ethers.utils.arrayify(key.key);
          const recoveredAddress = ethers.utils.recoverAddress(
            ethers.utils.keccak256(messageBytes),
            attestationBytes
          );
          
          const keyAddress = ethers.utils.computeAddress(publicKeyBytes);
          
          if (recoveredAddress.toLowerCase() === keyAddress.toLowerCase()) {
            logEvent('info', 'Attestation signature verified successfully');
            return true;
          }
        } catch (e) {
          continue; // Try next key if this one fails
        }
      }
      
      throw new Error('Attestation signature verification failed with all public keys');
    } catch (error) {
      logEvent('error', `Attestation verification failed: ${error.message}`);
      throw error;
    }
  }

  // Step 3: Wait for Circle's attestation
  async function waitForAttestation() {
    updateStepStatus(3, 'in-progress', 'Waiting for Circle attestation');
    
    try {
      if (!state.messageId) {
        throw new Error('No message ID found from burn transaction');
      }

      // Add detailed diagnostic logging
      logEvent('info', '=== Attestation Process Diagnostics ===');
      logEvent('info', `Message ID: ${state.messageId}`);
      logEvent('info', `Source Chain: ${state.sourceChain}`);
      logEvent('info', `Destination Chain: ${state.destinationChain}`);
      logEvent('info', `Burn Transaction: ${state.transactions.burn}`);
      
      // Check burn transaction status
      try {
        const burnReceipt = await state.web3.eth.getTransactionReceipt(state.transactions.burn);
        logEvent('info', `Burn Transaction Status: ${burnReceipt.status}`);
        logEvent('info', `Burn Transaction Block Number: ${burnReceipt.blockNumber}`);
        logEvent('info', `Burn Transaction Confirmations: ${burnReceipt.confirmations}`);
        
        // Log all events from burn transaction
        logEvent('info', 'Burn Transaction Events:');
        burnReceipt.logs.forEach((log, index) => {
          logEvent('info', `Event ${index}:`);
          logEvent('info', `  Address: ${log.address}`);
          logEvent('info', `  Topics: ${JSON.stringify(log.topics)}`);
          logEvent('info', `  Data: ${log.data}`);
        });
      } catch (error) {
        logEvent('error', `Failed to get burn transaction receipt: ${error.message}`);
      }

      state.attestationAttempts = 0;
      let attestationResponse = { status: 'pending' };
      
      while (state.attestationAttempts < state.maxAttestationAttempts) {
        state.attestationAttempts++;
        logEvent('info', `Polling attempt ${state.attestationAttempts}/${state.maxAttestationAttempts}`);
        
        try {
          // Log API request details
          const apiUrl = `https://iris-api.circle.com/v1/attestations/${state.messageId}`;
          logEvent('info', `Making API request to: ${apiUrl}`);
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          // Log response details
          logEvent('info', `API Response Status: ${response.status}`);
          logEvent('info', `API Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            logEvent('error', `API request failed with status ${response.status}: ${response.statusText}`);
            logEvent('error', `Error details: ${errorText}`);
            
            if (response.status === 404) {
              logEvent('info', 'Message ID not found yet, will retry...');
              // Add delay before retry
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else if (response.status === 429) {
              logEvent('warning', 'Rate limit hit, increasing delay...');
              await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
              throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
          } else {
            attestationResponse = await response.json();
            logEvent('info', `Current attestation status: ${attestationResponse.status}`);
            logEvent('info', `Full attestation response: ${JSON.stringify(attestationResponse, null, 2)}`);
            
            if (attestationResponse.status === 'complete' && attestationResponse.attestation) {
              state.attestation = {
                message: state.attestation.message,
                attestation: attestationResponse.attestation,
                timestamp: new Date().toISOString()
              };
              
              updateStepStatus(3, 'complete', 'Received attestation from Circle');
              logEvent('success', 'Attestation received');
              
              return state.attestation;
            }
          }
        } catch (error) {
          logEvent('error', `Polling attempt ${state.attestationAttempts} failed: ${error.message}`);
          if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            logEvent('error', 'Network error - possible connectivity issues with Circle API');
          }
          // Continue to next attempt
        }
        
        if (state.attestationAttempts < state.maxAttestationAttempts) {
          logEvent('info', 'Waiting 2 seconds before next attempt...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      throw new Error(`Attestation polling timed out after ${state.maxAttestationAttempts} attempts`);
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
      
      // Switch to destination network with more detailed logging
      logEvent('info', `Current network: ${state.currentNetwork}`);
      logEvent('info', `Target network (Polygon): ${destChainConfig.chainId}`);
      logEvent('info', `Switching to ${destChainConfig.name} network`);
      
      const switchResult = await switchToNetwork(destChainConfig.chainId);
      if (!switchResult) {
        throw new Error(`Failed to switch to ${destChainConfig.name} network. Please switch manually in your wallet.`);
      }

      // Verify we're on the correct network
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChainId !== destChainConfig.chainId) {
        throw new Error(`Network switch failed. Expected ${destChainConfig.chainId}, got ${currentChainId}`);
      }
      
      logEvent('info', `Successfully switched to ${destChainConfig.name}`);
      
      // Create MessageTransmitter contract instance
      const messageTransmitterAbi = [
        {
          "inputs": [
            {
              "internalType": "bytes",
              "name": "message",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "attestation",
              "type": "bytes"
            }
          ],
          "name": "receiveMessage",
          "outputs": [
            {
              "internalType": "bool",
              "name": "success",
              "type": "bool"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];
      
      // Ensure address is checksummed
      const messageTransmitterAddress = state.web3.utils.toChecksumAddress(destChainConfig.messageTransmitterAddress);
      
      logEvent('info', `Using MessageTransmitter at ${messageTransmitterAddress}`);
      
      const messageTransmitterContract = new state.web3.eth.Contract(
        messageTransmitterAbi,
        messageTransmitterAddress
      );
      
      // Validate attestation data
      if (!state.attestation || !state.attestation.message || !state.attestation.attestation) {
        throw new Error('Invalid attestation data');
      }

      // Log the parameters we'll use for minting
      logEvent('info', 'Preparing receiveMessage transaction with parameters:');
      logEvent('info', `- MessageTransmitter Address: ${messageTransmitterAddress}`);
      logEvent('info', `- Message: ${state.attestation.message}`);
      logEvent('info', `- Message length: ${state.attestation.message.length} bytes`);
      logEvent('info', `- Attestation: ${state.attestation.attestation}`);
      logEvent('info', `- Attestation length: ${state.attestation.attestation.length} bytes`);
      
      try {
        // Estimate gas for the mint transaction
        logEvent('info', 'Estimating gas for mint transaction...');
        const gasEstimate = await messageTransmitterContract.methods
          .receiveMessage(state.attestation.message, state.attestation.attestation)
          .estimateGas({
            from: state.currentAccount
          });
        
        // Add 30% buffer to gas estimate
        const gasLimit = Math.floor(gasEstimate * 1.3);
        logEvent('info', `Estimated gas: ${gasEstimate}, Using limit: ${gasLimit}`);
        
        // Get current gas price
        const gasPrice = await state.web3.eth.getGasPrice();
        logEvent('info', `Gas price: ${gasPrice} wei`);
        
        // Check MATIC balance
        const balance = await state.web3.eth.getBalance(state.currentAccount);
        logEvent('info', `MATIC Balance: ${state.web3.utils.fromWei(balance, 'ether')} MATIC`);
        
        // Use legacy transaction format
        logEvent('info', 'Sending receiveMessage transaction with legacy format...');
        const tx = await messageTransmitterContract.methods
          .receiveMessage(state.attestation.message, state.attestation.attestation)
          .send({
            from: state.currentAccount,
            gas: gasLimit,
            gasPrice: gasPrice
          });
        
        // Update state and UI
        state.transactions.mint = tx.transactionHash;
        updateStepStatus(4, 'complete', `Minted USDC on ${destChainConfig.name}. Transaction: ${shortenTxHash(tx.transactionHash)}`);
        logEvent('success', `USDC mint successful. Transaction: ${tx.transactionHash}`);
        
        // Update transaction details
        updateTransactionDetails('Mint', {
          hash: tx.transactionHash,
          from: tx.from,
          to: messageTransmitterAddress,
          value: '0',
          status: 'confirmed'
        });
        
        return tx;
      } catch (error) {
        // Log detailed error information
        logEvent('error', `Transaction error: ${error.message}`);
        if (error.data) {
          logEvent('error', `Error data: ${JSON.stringify(error.data)}`);
        }
        if (error.code) {
          logEvent('error', `Error code: ${error.code}`);
        }
        throw error;
      }
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
      // If we're in the attestation waiting phase, add a counter
      if (stepNumber === 3 && status === 'in-progress' && details.includes('Waiting for Circle attestation')) {
        const counter = document.createElement('span');
        counter.className = 'attestation-counter';
        counter.textContent = ` (Attempt ${state.attestationAttempts}/${state.maxAttestationAttempts})`;
        detailsElement.textContent = details;
        detailsElement.appendChild(counter);
      } else {
        detailsElement.textContent = details;
      }
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