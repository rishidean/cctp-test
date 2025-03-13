# CCTP Bridge Demo Setup Guide

This guide provides detailed, step-by-step instructions for setting up and running the CCTP Bridge Demo application. It's designed for beginners, so no step is considered too trivial.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setting Up with Replit](#setting-up-with-replit)
3. [Setting Up with GitHub and Cursor](#setting-up-with-github-and-cursor)
4. [Understanding the Application Structure](#understanding-the-application-structure)
5. [Customizing Configuration](#customizing-configuration)
6. [Testing the Application](#testing-the-application)
7. [Making Changes and Re-testing](#making-changes-and-re-testing)
8. [Using AI to Debug](#using-ai-to-debug)
9. [Frequently Asked Questions](#frequently-asked-questions)

## Prerequisites

Before you begin, make sure you have:

- A web browser (Chrome or Firefox recommended)
- A MetaMask wallet installed as a browser extension
- Basic understanding of blockchain concepts
- Some test ETH on the Base and/or Polygon networks for gas fees
- Some test USDC on the source chain for bridging

## Setting Up with Replit

Replit is a browser-based development environment that makes it easy to get started without installing anything on your local machine.

### Step 1: Create a Replit Account

1. Go to [Replit.com](https://replit.com)
2. Click "Sign Up" and follow the registration process
3. Verify your email if required

### Step 2: Create a New Repl

1. Click on the "+" button to create a new Repl
2. Select "HTML, CSS, JS" as the template
3. Name your Repl (e.g., "CCTP-Bridge-Demo")
4. Click "Create Repl"

### Step 3: Set Up the Project Structure

1. In the Files panel, you'll see `index.html`, `script.js`, and `style.css` already created
2. Rename `script.js` to `app.js`
3. Rename `style.css` to `styles.css`
4. Create a new file called `config.js` by clicking on the "+" button next to "Files"

### Step 4: Add the Code

1. Copy the code from each file in the project:
   - Copy the content of `index.html` into the `index.html` file in Replit
   - Copy the content of `app.js` into the renamed `app.js` file in Replit
   - Copy the content of `styles.css` into the renamed `styles.css` file in Replit
   - Copy the content of `config.js` into the newly created `config.js` file in Replit

2. Make sure to update the references in `index.html`:
   - Change `<script src="script.js">` to `<script src="app.js">`
   - Change `<link rel="stylesheet" href="style.css">` to `<link rel="stylesheet" href="styles.css">`
   - Add `<script src="config.js"></script>` before the app.js script

### Step 5: Run the Application

1. Click the "Run" button at the top of the Replit interface
2. Your application will start and be displayed in the preview window
3. To view it in a full browser window, click the "Open in new tab" button in the preview window

## Setting Up with GitHub and Cursor

If you prefer a more standard development environment, you can use GitHub to host your code and Cursor (a VS Code extension with AI capabilities) to edit it.

### Step 1: Create a GitHub Account

1. Go to [GitHub.com](https://github.com)
2. Click "Sign Up" and follow the registration process
3. Verify your email if required

### Step 2: Create a New Repository

1. Click on the "+" icon in the top right and select "New repository"
2. Name your repository (e.g., "CCTP-Bridge-Demo")
3. Make it public
4. Initialize it with a README
5. Click "Create repository"

### Step 3: Create the Project Files

1. In your new repository, click the "Add file" button and select "Create new file"
2. Name the file `index.html` and paste the content from the project's `index.html`
3. Click "Commit new file" at the bottom
4. Repeat this process for:
   - `app.js`
   - `styles.css`
   - `config.js`

### Step 4: Install Cursor

1. Go to [Cursor.sh](https://cursor.sh)
2. Download and install Cursor for your operating system
3. Launch Cursor after installation

### Step 5: Clone the Repository in Cursor

1. In Cursor, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the command palette
2. Type "Git: Clone" and select it
3. Paste the URL of your GitHub repository (e.g., `https://github.com/yourusername/CCTP-Bridge-Demo.git`)
4. Choose a local folder to clone into
5. Wait for the cloning to complete
6. Open the cloned project folder in Cursor

### Step 6: Install Express.js (Optional)

If you want to run the application with a simple server:

1. Open a terminal in Cursor by clicking on "Terminal" > "New Terminal" in the menu
2. Run the following commands:

```bash
npm init -y
npm install express
```

3. Create a new file called `server.js` with the following content:

```javascript
const express = require('express');
const app = express();
const port = 3000;

// Serve static files from the current directory
app.use(express.static('./'));

// Start the server
app.listen(port, () => {
  console.log(`CCTP Bridge Demo running at http://localhost:${port}`);
});
```

4. Run the server with:

```bash
node server.js
```

5. Open your browser and navigate to `http://localhost:3000`

## Understanding the Application Structure

The application consists of four main files:

1. **index.html** - The main HTML structure of the application
   - Contains the user interface elements
   - Links to styles and scripts

2. **styles.css** - The styling for the application
   - Defines colors, layout, and responsive behavior

3. **config.js** - Configuration settings
   - Network details (RPC URLs, contract addresses)
   - Default values
   - Debug settings

4. **app.js** - The main application logic
   - Wallet connection
   - Blockchain interactions
   - UI updates

### Key Components:

- **Bridge Form** - Where users input their bridge parameters
- **Bridge Status** - Shows the progress of the bridging operation
- **Debug Panel** - Displays logs and transaction details
- **Connect Wallet Button** - For MetaMask integration

## Customizing Configuration

You can customize the application by modifying the `config.js` file:

### Network Configuration

Update the RPC URLs, contract addresses, and domain IDs for each network:

```javascript
networks: {
  base: {
    name: 'Base',
    rpcUrl: 'YOUR_BASE_RPC_URL',
    chainId: '0x2105',
    // ...
  },
  // ...
}
```

### Default Settings

Change the default source/destination chains, amount, or gas limit:

```javascript
defaults: {
  sourceChain: 'base',
  destinationChain: 'polygon',
  amount: '1000000', // 1 USDC (6 decimals)
  gasLimit: 300000
}
```

### Debug Settings

Enable/disable debugging and set the log level:

```javascript
debug: {
  enabled: true,
  logLevel: 'verbose' // 'normal', 'verbose', 'minimal'
}
```

## Testing the Application

### Step 1: Open the Application

- If using Replit: Click the "Run" button
- If using Express: Navigate to `http://localhost:3000` in your browser

### Step 2: Connect Your Wallet

1. Click the "Connect Wallet" button
2. MetaMask will prompt you to connect - approve the connection
3. Your wallet address should appear in the top right

### Step 3: Configure the Bridge

1. Select the source chain (where you have test USDC)
2. Select the destination chain
3. Enter the amount of USDC to bridge
4. Enter the recipient address (or click "Use Current Wallet")

### Step 4: Start the Bridge

1. Click the "Start Bridge" button
2. Follow the prompts in MetaMask to approve transactions
3. Watch the status updates in the Bridge Status section
4. Use the Debug Panel to view detailed logs

### Step 5: Verify the Transfer

After the bridging process completes:
1. Check your wallet balance on the destination chain
2. View the transaction details in the block explorer links provided

## Making Changes and Re-testing

When you make changes to the code, the process to test those changes depends on your setup:

### With Replit

1. Edit the files directly in the Replit editor
2. Click "Run" to apply your changes
3. The preview will automatically update with your changes

### With GitHub and Cursor

1. Make your changes in Cursor
2. Save the files (`Ctrl+S` or `Cmd+S` on Mac)
3. If using Express, refresh your browser to see the changes
4. To commit changes to GitHub:
   - Press `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac) to open the Git panel
   - Stage your changes by clicking the "+" next to each changed file
   - Add a commit message in the text field
   - Click the checkmark to commit
   - Click the "..." menu and select "Push" to push to GitHub

## Using AI to Debug

### Using AI in Replit

Replit has built-in AI assistance:

1. Look for the AI chat button in the sidebar
2. Click it to open the AI assistant
3. Describe your issue or ask for help
4. Be specific about what error you're seeing or what isn't working

Example prompt: "I'm getting an error when trying to connect my wallet. The console shows: [paste error message here]. How can I fix this?"

### Using AI in Cursor

Cursor is built with AI features:

1. Select problematic code
2. Press `Ctrl+Shift+L` (or `Cmd+K` on Mac) to open the AI prompt
3. Describe the issue or ask for suggestions
4. The AI will provide help specific to the selected code

Example prompt: "Why isn't this function working as expected? I expected it to [describe expected behavior] but instead it [describe actual behavior]."

### Effective AI Debugging Tips

1. **Be specific** - Include exact error messages and steps to reproduce
2. **Share context** - Describe what you're trying to accomplish
3. **Use screenshots** - If UI issues, share screenshots
4. **Try small changes** - Make incremental changes rather than many at once
5. **Read the console** - Check browser console for JavaScript errors

## Frequently Asked Questions

### Q: MetaMask isn't connecting to my wallet, what should I do?
A: Make sure MetaMask is installed and unlocked. Try refreshing the page. Check if you're on a secure connection (HTTPS or localhost).

### Q: The bridge process gets stuck at attestation, what's happening?
A: The Circle attestation process can take time in a real environment. For this demo, some steps are simulated. Check the debug panel for more details.

### Q: How do I add test USDC to my wallet?
A: You'll need to get test USDC from a faucet or bridge some from another test network. Check Circle's documentation for testnet USDC options.

### Q: The app doesn't work on mobile, why?
A: This demo is designed for desktop use with MetaMask extension. Mobile support would require additional development.

### Q: Can I use this for real USDC transfers?
A: No, this is a proof-of-concept for educational purposes only. It includes simulated parts and is not suitable for real funds.
