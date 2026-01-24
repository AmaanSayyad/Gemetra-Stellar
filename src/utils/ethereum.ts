import { Address, parseUnits, formatUnits, isAddress, encodeFunctionData } from 'viem';
import { getAccount, getPublicClient, readContract, writeContract, getChainId } from '@wagmi/core';
import type { Config } from 'wagmi';

// This will be set by main.tsx after initialization
let wagmiConfigInstance: Config | null = null;

// Function to set the config (called from main.tsx)
export const setWagmiConfig = (config: Config) => {
  wagmiConfigInstance = config;
};

// Helper to get the config
const getWagmiConfig = (): Config => {
  if (!wagmiConfigInstance) {
    throw new Error('Wagmi config not initialized. Make sure setWagmiConfig is called in main.tsx');
  }
  return wagmiConfigInstance;
};

// MNEE Contract Address (Production - Ethereum Mainnet)
// Contract: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
// Etherscan: https://etherscan.io/token/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
// NOTE: MNEE only exists on Ethereum Mainnet - there is NO testnet contract
export const MNEE_CONTRACT_ADDRESS_MAINNET = '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF' as Address;

// Mock MNEE token for Sepolia testnet (for development/testing only)
// ⚠️ IMPORTANT: MNEE does NOT exist on Sepolia. You must deploy your own mock ERC20 token.
// See MNEE_SETUP.md for instructions on deploying a mock token via Remix.
// Leave as 0x0000... if you haven't deployed a mock token yet.
export const MOCK_MNEE_CONTRACT_ADDRESS_SEPOLIA = '0x0000000000000000000000000000000000000000' as Address; // Replace with your deployed mock token address

// Get the appropriate contract address based on current network
export const getMneeContractAddress = async (): Promise<Address | null> => {
  try {
    // Check if wallet is connected first
    const account = getAccount(getWagmiConfig());
    if (!account.isConnected) {
      return null; // No wallet connected
    }

    const chainId = await getChainId(getWagmiConfig());
    
    // Ethereum Mainnet (chainId: 1)
    if (chainId === 1) {
      return MNEE_CONTRACT_ADDRESS_MAINNET;
    }
    
    // Sepolia Testnet (chainId: 11155111) - use mock token
    if (chainId === 11155111) {
      if (MOCK_MNEE_CONTRACT_ADDRESS_SEPOLIA === '0x0000000000000000000000000000000000000000') {
        // Return null instead of throwing - this means MNEE is not available on Sepolia
        return null;
      }
      return MOCK_MNEE_CONTRACT_ADDRESS_SEPOLIA;
    }
    
    // Default to mainnet address
    return MNEE_CONTRACT_ADDRESS_MAINNET;
  } catch (error) {
    // Silently return null if chain ID cannot be determined
    return null;
  }
};

// Current MNEE contract address (will be set based on network)
export let MNEE_CONTRACT_ADDRESS = MNEE_CONTRACT_ADDRESS_MAINNET;

// ERC20 ABI for MNEE token interactions
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
] as const;

// Validate Ethereum address
export const isValidEthereumAddress = (address: string): boolean => {
  try {
    return isAddress(address);
  } catch {
    return false;
  }
};

// Format address for display
export const formatAddress = (address: string): string => {
  if (!address) return '';
  if (!isValidEthereumAddress(address)) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Get connected account
export const getConnectedAccount = (): Address | null => {
  try {
    const account = getAccount(getWagmiConfig());
    return account.address as Address | null;
  } catch {
    return null;
  }
};

// Check if wallet is connected
export const isWalletConnected = (): boolean => {
  try {
    const account = getAccount(getWagmiConfig());
    return account.isConnected;
  } catch {
    return false;
  }
};

// Get MNEE balance for an address
export const getMneeBalance = async (address?: Address): Promise<number> => {
  try {
    const accountAddress = address || getConnectedAccount();
    if (!accountAddress) {
      return 0; // No account, return 0 balance
    }

    // Check if wallet is connected
    if (!isWalletConnected()) {
      return 0; // Wallet not connected, return 0
    }

    const publicClient = getPublicClient(getWagmiConfig());
    if (!publicClient) {
      return 0; // No public client, return 0
    }

    // Get the correct contract address for current network
    const contractAddress = await getMneeContractAddress();
    
    // If no contract address (e.g., on Sepolia without mock token), return 0
    if (!contractAddress) {
      return 0;
    }

    // Check if contract exists by trying to read code
    try {
      const code = await publicClient.getBytecode({ address: contractAddress });
      if (!code || code === '0x') {
        return 0; // Contract doesn't exist at this address
      }
    } catch {
      return 0; // Failed to check contract existence
    }

    // Get decimals first
    const decimals = await readContract(getWagmiConfig(), {
      address: contractAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });

    // Get balance
    const balance = await readContract(getWagmiConfig(), {
      address: contractAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [accountAddress],
    });

    return parseFloat(formatUnits(balance as bigint, decimals as number));
  } catch (error) {
    // Silently return 0 on error (contract might not exist, network issue, etc.)
    return 0;
  }
};

// Send MNEE payment
export const sendMneePayment = async (
  recipient: Address,
  amount: number
): Promise<{ txHash: string; success: boolean; error?: string }> => {
  try {
    const account = getAccount(getWagmiConfig());
    if (!account.isConnected || !account.address) {
      throw new Error('Wallet not connected. Please connect your wallet and try again.');
    }

    if (!isValidEthereumAddress(recipient)) {
      throw new Error('Invalid recipient address format');
    }

    if (!amount || amount <= 0 || isNaN(amount)) {
      throw new Error('Invalid amount');
    }

    const publicClient = getPublicClient(getWagmiConfig());
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    // Get the correct contract address for current network
    const contractAddress = await getMneeContractAddress();
    
    // Confirm mainnet usage - real tokens
    const chainId = await getChainId(getWagmiConfig());
    if (chainId === 1) {
      console.log('✅ Using Ethereum Mainnet - Real MNEE tokens');
      console.log('📝 Contract:', MNEE_CONTRACT_ADDRESS_MAINNET);
      console.log('🔗 Etherscan:', `https://etherscan.io/token/${MNEE_CONTRACT_ADDRESS_MAINNET}`);
    } else if (chainId === 11155111) {
      console.warn('⚠️ Using Sepolia Testnet - MNEE not available. Switch to Mainnet for real MNEE tokens.');
    } else {
      console.warn(`⚠️ Unsupported network (Chain ID: ${chainId}). Please switch to Ethereum Mainnet.`);
    }

    // Get decimals
    const decimals = await readContract(getWagmiConfig(), {
      address: contractAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });

    // Convert amount to wei (with decimals)
    const amountInWei = parseUnits(amount.toString(), decimals as number);

    // Send transaction
    const hash = await writeContract(getWagmiConfig(), {
      address: contractAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipient, amountInWei],
    });

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return {
      txHash: receipt.transactionHash,
      success: receipt.status === 'success',
    };
  } catch (error) {
    console.error('MNEE payment failed:', error);
    let errorMessage = 'An unexpected error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      txHash: '',
      success: false,
      error: errorMessage,
    };
  }
};

// Multicall3 contract address (deployed on mainnet and most networks)
// https://github.com/mds1/multicall
const MULTICALL3_ADDRESS_MAINNET = '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;
const MULTICALL3_ADDRESS_SEPOLIA = '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;

// Multicall3 ABI (includes both aggregate and tryAggregate)
const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate',
    outputs: [
      { name: 'blockNumber', type: 'uint256' },
      { name: 'returnData', type: 'bytes[]' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
      { name: 'requireSuccess', type: 'bool' },
    ],
    name: 'tryAggregate',
    outputs: [
      {
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

// Send bulk MNEE payments using Multicall3 for batching
export const sendBulkMneePayments = async (
  recipients: Array<{ address: Address; amount: number }>
): Promise<{ 
  txHash: string; // First transaction hash (for backward compatibility)
  txHashes: Array<{ address: Address; txHash: string }>; // All transaction hashes mapped to addresses
  success: boolean; 
  processed: number; 
  error?: string 
}> => {
  try {
    const account = getAccount(getWagmiConfig());
    if (!account.isConnected || !account.address) {
      throw new Error('Wallet not connected. Please connect your wallet and try again.');
    }

    // Validate and filter recipients
    const validRecipients = recipients.filter((recipient) => {
      if (!recipient || !recipient.address || !recipient.amount) {
        return false;
      }
      if (!isValidEthereumAddress(recipient.address)) {
        return false;
      }
      if (recipient.amount <= 0 || isNaN(recipient.amount)) {
        return false;
      }
      return true;
    });

    if (validRecipients.length === 0) {
      return {
        txHash: '',
        txHashes: [],
        success: false,
        processed: 0,
        error: 'No valid recipients found',
      };
    }

    const publicClient = getPublicClient(getWagmiConfig());
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    // Get the correct contract address for current network
    const contractAddress = await getMneeContractAddress();
    if (!contractAddress) {
      throw new Error('MNEE contract address not available. Please ensure you are on Ethereum Mainnet.');
    }

    // Get decimals and check balance first
    const decimals = await readContract(getWagmiConfig(), {
      address: contractAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });

    // Check if user has sufficient balance for all transfers
    const totalAmount = validRecipients.reduce((sum, r) => sum + r.amount, 0);
    const currentBalance = await getMneeBalance(account.address);
    
    console.log(`💰 Balance check: ${currentBalance.toFixed(6)} MNEE available, ${totalAmount.toFixed(6)} MNEE needed`);
    
    if (currentBalance < totalAmount) {
      const errorMsg = `Insufficient MNEE balance. You have ${currentBalance.toFixed(6)} MNEE, but need ${totalAmount.toFixed(6)} MNEE for all transfers.`;
      console.error(errorMsg);
      return {
        txHash: '',
        txHashes: [],
        success: false,
        processed: 0,
        error: errorMsg,
      };
    }

    // Skip Multicall3 - MetaMask often shows "likely to fail" for multicall transactions
    // due to gas estimation issues with complex batch operations.
    // Use optimized sequential transfers instead (more reliable, still fast with upfront preparation).
    console.log(`📤 Using optimized sequential transfers for ${validRecipients.length} recipients...`);
    
    // Go directly to optimized sequential transfers (skip Multicall3)
    return await sendBulkMneePaymentsOptimized(recipients);
  } catch (error) {
    console.error('Bulk MNEE payment failed:', error);
    if (error instanceof Error && error.message.includes('User rejected')) {
      return {
        txHash: '',
        success: false,
        processed: 0,
        error: 'Transaction rejected by user',
      };
    }
  }

  // Fallback: Optimized sequential transfers (faster preparation, parallel submission)
  console.log('Using optimized sequential transfer method...');
  return await sendBulkMneePaymentsOptimized(recipients);
};

// Optimized sequential transfers: Prepare all data upfront, then send faster
const sendBulkMneePaymentsOptimized = async (
  recipients: Array<{ address: Address; amount: number }>
): Promise<{ txHash: string; success: boolean; processed: number; error?: string }> => {
  try {
    const account = getAccount(getWagmiConfig());
    if (!account.isConnected || !account.address) {
      throw new Error('Wallet not connected');
    }

    const validRecipients = recipients.filter((recipient) => {
      return recipient && recipient.address && recipient.amount && 
             isValidEthereumAddress(recipient.address) && 
             recipient.amount > 0 && !isNaN(recipient.amount);
    });

    if (validRecipients.length === 0) {
      return { txHash: '', success: false, processed: 0, error: 'No valid recipients' };
    }

    const publicClient = getPublicClient(getWagmiConfig());
    if (!publicClient) throw new Error('Public client not available');

    const contractAddress = await getMneeContractAddress();
    if (!contractAddress) throw new Error('MNEE contract not available');

    const decimals = await readContract(getWagmiConfig(), {
      address: contractAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });

    // Prepare ALL transaction data upfront (much faster)
    const transactions = validRecipients.map((recipient) => ({
      recipient,
      amountInWei: parseUnits(recipient.amount.toString(), decimals as number),
    }));

    console.log(`📤 Sending ${transactions.length} payments sequentially (optimized)...`);

    const txHashes: Array<{ address: Address; txHash: string }> = [];
    let successCount = 0;

    // Send transactions sequentially but with optimized preparation
    // Note: Each still requires a separate MetaMask confirmation
    for (const { recipient, amountInWei } of transactions) {
      try {
        // Submit transaction (MetaMask popup appears here)
        const hash = await writeContract(getWagmiConfig(), {
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [recipient.address, amountInWei],
        });

        // Store transaction hash with recipient address
        txHashes.push({ address: recipient.address, txHash: hash });
        successCount++;
      } catch (error) {
        console.error(`Failed to send payment to ${recipient.address}:`, error);
        // If user rejects, stop processing
        if (error instanceof Error && error.message.includes('User rejected')) {
          break;
        }
      }
    }

    // Wait for all receipts (in parallel for speed)
    const receipts = await Promise.allSettled(
      txHashes.map(({ txHash }) => publicClient.waitForTransactionReceipt({ hash: txHash }))
    );

    // Filter successful transactions and get their hashes
    const successfulTxHashes: Array<{ address: Address; txHash: string }> = [];
    receipts.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.status === 'success') {
        successfulTxHashes.push(txHashes[index]);
      }
    });

    return {
      txHash: txHashes[0]?.txHash || '', // First transaction hash (for backward compatibility)
      txHashes: successfulTxHashes, // All successful transaction hashes mapped to addresses
      success: successfulTxHashes.length > 0,
      processed: successfulTxHashes.length,
      error: successfulTxHashes.length < validRecipients.length ? 'Some payments failed' : undefined,
    };
  } catch (error) {
    return {
      txHash: '',
      txHashes: [],
      success: false,
      processed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Get account balance (native ETH + MNEE)
export const getAccountBalance = async (address?: Address): Promise<{
  eth: number;
  mnee: number;
}> => {
  try {
    const accountAddress = address || getConnectedAccount();
    if (!accountAddress) {
      return { eth: 0, mnee: 0 };
    }

    // Check if wallet is connected
    if (!isWalletConnected()) {
      return { eth: 0, mnee: 0 };
    }

    const publicClient = getPublicClient(getWagmiConfig());
    if (!publicClient) {
      return { eth: 0, mnee: 0 };
    }

    // Get ETH balance
    const ethBalance = await publicClient.getBalance({ address: accountAddress });
    const eth = parseFloat(formatUnits(ethBalance, 18));

    // Get MNEE balance (will return 0 if not available)
    const mnee = await getMneeBalance(accountAddress);

    return {
      eth,
      mnee,
    };
  } catch (error) {
    // Silently return 0 balances on error
    return {
      eth: 0,
      mnee: 0,
    };
  }
};

// Format MNEE amount
export const formatMnee = (amount: number): string => {
  return amount.toFixed(2);
};

// Format ETH amount
export const formatEth = (amount: number): string => {
  return amount.toFixed(6);
};
