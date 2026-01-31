/**
 * Stellar Wallet Manager Module
 * 
 * This module provides wallet connection and transaction signing functionality
 * using the Stellar Wallets Kit for Freighter and Albedo wallets.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { StellarWalletsKit, WalletNetwork, FREIGHTER_ID, ALBEDO_ID, allowAllModules } from '@creit.tech/stellar-wallets-kit';
import { StellarWalletType } from '../config/stellar-wallets';
import { getCurrentNetwork } from '../config/stellar';

/**
 * Interface representing the current wallet connection state
 */
export interface WalletState {
  /** Whether a wallet is currently connected */
  isConnected: boolean;
  
  /** The connected wallet's public key (Stellar address) */
  publicKey: string | null;
  
  /** The type of wallet currently connected */
  walletType: StellarWalletType | null;
}

/**
 * Configuration options for the Stellar Wallet Manager
 */
export interface StellarWalletManagerConfig {
  /** Network to connect to (mainnet or testnet) */
  network: 'mainnet' | 'testnet';
  
  /** Array of allowed wallet types */
  allowedWallets: StellarWalletType[];
}

/**
 * Result of a wallet connection attempt
 */
export interface ConnectResult {
  /** The connected wallet's public key */
  publicKey: string;
  
  /** Whether the connection was successful */
  success: boolean;
  
  /** Error message if connection failed */
  error?: string;
}

/**
 * Result of a transaction signing attempt
 */
export interface SignTransactionResult {
  /** The signed transaction XDR */
  signedXdr: string;
  
  /** Whether the signing was successful */
  success: boolean;
  
  /** Error message if signing failed */
  error?: string;
}

/**
 * Stellar Wallet Manager Class
 * 
 * Manages wallet connections and transaction signing using Stellar Wallets Kit.
 * Supports Freighter (browser extension) and Albedo (web-based) wallets.
 */
export class StellarWalletManager {
  private kit: StellarWalletsKit;
  private walletState: WalletState;
  private config: StellarWalletManagerConfig;

  /**
   * Create a new Stellar Wallet Manager instance
   * 
   * @param config - Configuration options for the wallet manager
   */
  constructor(config: StellarWalletManagerConfig) {
    this.config = config;
    
    // Initialize wallet state
    this.walletState = {
      isConnected: false,
      publicKey: null,
      walletType: null,
    };

    // Convert network to Stellar Wallets Kit format
    const network = config.network === 'mainnet' 
      ? WalletNetwork.PUBLIC 
      : WalletNetwork.TESTNET;

    // Initialize Stellar Wallets Kit
    this.kit = new StellarWalletsKit({
      network,
      selectedWalletId: FREIGHTER_ID, // Default to Freighter
      modules: allowAllModules(),
    });
  }

  /**
   * Connect to a Stellar wallet
   * 
   * @param walletType - The type of wallet to connect to
   * @returns Promise resolving to connection result
   */
  async connect(walletType: StellarWalletType): Promise<ConnectResult> {
    try {
      // Set the selected wallet in the kit
      const walletId = walletType === StellarWalletType.Freighter ? FREIGHTER_ID : ALBEDO_ID;
      this.kit.setWallet(walletId);

      // Check if wallet is installed (for Freighter)
      if (walletType === StellarWalletType.Freighter && !this.isWalletInstalled(walletType)) {
        return {
          publicKey: '',
          success: false,
          error: 'Freighter wallet is not installed. Please install it from the Chrome Web Store.',
        };
      }

      // Open modal and get public key
      const result = await this.kit.openModal({
        onWalletSelected: async () => {
          // Wallet selected callback
        },
      });

      // Extract address from result
      const address = (result as any).address || (result as any).publicKey;
      
      if (!address) {
        return {
          publicKey: '',
          success: false,
          error: 'Failed to retrieve wallet address.',
        };
      }

      // Update wallet state
      this.walletState = {
        isConnected: true,
        publicKey: address,
        walletType,
      };

      return {
        publicKey: address,
        success: true,
      };
    } catch (error: any) {
      // Handle specific error cases
      if (error.message?.includes('User rejected')) {
        return {
          publicKey: '',
          success: false,
          error: 'Connection rejected. Please approve the connection request.',
        };
      }
      
      if (error.message?.includes('locked')) {
        return {
          publicKey: '',
          success: false,
          error: 'Wallet is locked. Please unlock your wallet and try again.',
        };
      }

      return {
        publicKey: '',
        success: false,
        error: error.message || 'Failed to connect wallet. Please try again.',
      };
    }
  }

  /**
   * Disconnect the currently connected wallet
   * 
   * Clears all wallet session data and resets the wallet state.
   */
  async disconnect(): Promise<void> {
    // Clear wallet state
    this.walletState = {
      isConnected: false,
      publicKey: null,
      walletType: null,
    };
  }

  /**
   * Get the current wallet connection state
   * 
   * @returns Current wallet state
   */
  getWalletState(): WalletState {
    return { ...this.walletState };
  }

  /**
   * Sign a transaction with the connected wallet
   * 
   * @param xdr - The transaction XDR to sign
   * @returns Promise resolving to signing result
   */
  async signTransaction(xdr: string): Promise<SignTransactionResult> {
    try {
      // Check if wallet is connected
      if (!this.walletState.isConnected || !this.walletState.publicKey) {
        return {
          signedXdr: '',
          success: false,
          error: 'No wallet connected. Please connect a wallet first.',
        };
      }

      // Sign the transaction using the kit
      const { signedTxXdr } = await this.kit.signTransaction(xdr, {
        address: this.walletState.publicKey,
        networkPassphrase: this.config.network === 'mainnet'
          ? 'Public Global Stellar Network ; September 2015'
          : 'Test SDF Network ; September 2015',
      });

      return {
        signedXdr: signedTxXdr,
        success: true,
      };
    } catch (error: any) {
      // Handle specific error cases
      if (error.message?.includes('User rejected') || error.message?.includes('declined')) {
        return {
          signedXdr: '',
          success: false,
          error: 'Transaction signing rejected. Please approve the transaction.',
        };
      }

      if (error.message?.includes('locked')) {
        return {
          signedXdr: '',
          success: false,
          error: 'Wallet is locked. Please unlock your wallet and try again.',
        };
      }

      return {
        signedXdr: '',
        success: false,
        error: error.message || 'Failed to sign transaction. Please try again.',
      };
    }
  }

  /**
   * Check if a specific wallet is installed/available
   * 
   * @param walletType - The wallet type to check
   * @returns true if the wallet is installed/available, false otherwise
   */
  isWalletInstalled(walletType: StellarWalletType): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    switch (walletType) {
      case StellarWalletType.Freighter:
        // Freighter injects itself as window.freighter
        return typeof (window as any).freighter !== 'undefined';
      
      case StellarWalletType.Albedo:
        // Albedo is web-based and always available
        return true;
      
      default:
        return false;
    }
  }
}

/**
 * React Context and Hook for Stellar Wallet Management
 */

/**
 * Context value interface for Stellar Wallet
 */
interface StellarWalletContextValue {
  /** Current wallet state */
  walletState: WalletState;
  
  /** Connect to a wallet */
  connect: (walletType: StellarWalletType) => Promise<void>;
  
  /** Disconnect the current wallet */
  disconnect: () => Promise<void>;
  
  /** Sign a transaction with the connected wallet */
  signTransaction: (xdr: string) => Promise<string>;
  
  /** Check if a wallet is installed */
  isWalletInstalled: (walletType: StellarWalletType) => boolean;
  
  /** Error message if any operation failed */
  error: string | null;
  
  /** Loading state for async operations */
  isLoading: boolean;
}

/**
 * React Context for Stellar Wallet
 */
const StellarWalletContext = createContext<StellarWalletContextValue | undefined>(undefined);

/**
 * Props for the Stellar Wallet Provider
 */
interface StellarWalletProviderProps {
  /** Child components */
  children: ReactNode;
  
  /** Network to connect to (defaults to current network from config) */
  network?: 'mainnet' | 'testnet';
  
  /** Allowed wallet types (defaults to all) */
  allowedWallets?: StellarWalletType[];
}

/**
 * Stellar Wallet Provider Component
 * 
 * Wraps the application and provides wallet management functionality
 * to all child components via React Context.
 */
export function StellarWalletProvider({ 
  children, 
  network,
  allowedWallets = [StellarWalletType.Freighter, StellarWalletType.Albedo]
}: StellarWalletProviderProps) {
  // Get current network from config if not provided
  const currentNetwork = network || getCurrentNetwork();
  
  // Initialize wallet manager
  const [walletManager] = useState(() => new StellarWalletManager({
    network: currentNetwork,
    allowedWallets,
  }));

  // Wallet state
  const [walletState, setWalletState] = useState<WalletState>(walletManager.getWalletState());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Connect to a wallet
   */
  const connect = useCallback(async (walletType: StellarWalletType) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await walletManager.connect(walletType);
      
      if (result.success) {
        setWalletState(walletManager.getWalletState());
      } else {
        setError(result.error || 'Failed to connect wallet');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  }, [walletManager]);

  /**
   * Disconnect the current wallet
   */
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await walletManager.disconnect();
      setWalletState(walletManager.getWalletState());
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect wallet');
    } finally {
      setIsLoading(false);
    }
  }, [walletManager]);

  /**
   * Sign a transaction with the connected wallet
   */
  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await walletManager.signTransaction(xdr);
      
      if (result.success) {
        return result.signedXdr;
      } else {
        const errorMsg = result.error || 'Failed to sign transaction';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to sign transaction';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [walletManager]);

  /**
   * Check if a wallet is installed
   */
  const isWalletInstalled = useCallback((walletType: StellarWalletType): boolean => {
    return walletManager.isWalletInstalled(walletType);
  }, [walletManager]);

  const value: StellarWalletContextValue = {
    walletState,
    connect,
    disconnect,
    signTransaction,
    isWalletInstalled,
    error,
    isLoading,
  };

  return (
    <StellarWalletContext.Provider value={value}>
      {children}
    </StellarWalletContext.Provider>
  );
}

/**
 * React Hook for Stellar Wallet Management
 * 
 * Provides access to wallet connection state and operations.
 * Must be used within a StellarWalletProvider.
 * 
 * @returns Wallet context value with state and operations
 * @throws Error if used outside of StellarWalletProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { walletState, connect, disconnect, signTransaction } = useStellarWallet();
 *   
 *   const handleConnect = async () => {
 *     await connect(StellarWalletType.Freighter);
 *   };
 *   
 *   return (
 *     <div>
 *       {walletState.isConnected ? (
 *         <button onClick={disconnect}>Disconnect</button>
 *       ) : (
 *         <button onClick={handleConnect}>Connect Freighter</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useStellarWallet(): StellarWalletContextValue {
  const context = useContext(StellarWalletContext);
  
  if (context === undefined) {
    throw new Error('useStellarWallet must be used within a StellarWalletProvider');
  }
  
  return context;
}
