# CCTP Bridge Demo

This is a proof-of-concept web application that demonstrates how to use Circle's Cross-Chain Transfer Protocol (CCTP) to bridge USDC from one blockchain to another.

## Overview

The CCTP Bridge Demo allows users to:

1. Connect their MetaMask wallet
2. Select source and destination chains
3. Specify an amount of USDC to transfer
4. Enter a recipient address
5. Execute the bridging process with real-time status updates

The application follows Circle's CCTP workflow:
- Burn USDC on the source chain
- Wait for Circle's attestation
- Mint USDC on the destination chain

## Supported Chains

- Base
- Polygon
- Solana (partial support for demonstration)

## Features

- MetaMask integration for wallet connection and transaction signing
- Real-time status updates for each step of the bridging process
- Debug panel with event logs and transaction details
- Configurable settings for easy customization

## Project Structure

- `index.html` - Main application HTML
- `styles.css` - Application styling
- `app.js` - Core application logic
- `config.js` - Configuration settings
- `setup.md` - Setup instructions

## Technical Implementation

The application uses:
- Web3.js for blockchain interactions
- Ethers.js for utility functions
- Circle's CCTP protocol for the actual bridging
- Pure JavaScript for UI manipulation

## Development Status

This is a proof-of-concept application intended for testing and demonstration purposes only. It includes some simulated behaviors for educational purposes.

## Getting Started

Please refer to the `setup.md` file for detailed setup and usage instructions.

## Disclaimer

This application is for demonstration and educational purposes only. Do not use it with real funds without thorough testing and security review. The implementation may not handle all edge cases or include all necessary security precautions required for a production application.

## License

MIT
