import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Payment } from '../lib/supabase';
import { useStellarWallet } from '../utils/stellar-wallet';
import { usePoints } from './usePoints';
import { getCurrentNetwork } from '../config/stellar';

// Helper function to generate a UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const usePayments = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { walletState } = useStellarWallet();
  const address = walletState.publicKey;
  const isConnected = walletState.isConnected;
  
  // Check wallet connection on hook initialization
  useEffect(() => {
    const checkWalletConnection = () => {
      if (isConnected && address) {
        setWalletAddress(address);
      } else {
        setWalletAddress(null);
      }
    };
    checkWalletConnection();
  }, [isConnected, address]);
  
  // Load payments from localStorage when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      const localStorageKey = `gemetra_payments_${walletAddress}`;
      const storedPayments = localStorage.getItem(localStorageKey);
      
      if (storedPayments) {
        try {
          const parsedPayments = JSON.parse(storedPayments);
          setPayments(parsedPayments);
          console.log('Loaded payments from localStorage:', parsedPayments.length);
        } catch (parseError) {
          console.error('Error parsing payments from localStorage:', parseError);
          setPayments([]);
        }
      } else {
        setPayments([]);
      }
    } else {
      setPayments([]);
    }
  }, [walletAddress]);

  const createPayment = useCallback(async (paymentData: Omit<Payment, 'id' | 'user_id' | 'created_at' | 'blockchain_type' | 'network'>) => {
    setLoading(true);
    setError(null);
    
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create a new payment with generated ID and timestamp
      const now = new Date().toISOString();
      
      // Determine blockchain type based on transaction hash format or explicit field
      // Stellar transaction hashes are 64 hex characters
      // Ethereum transaction hashes are 66 characters (0x + 64 hex)
      let blockchainType: 'ethereum' | 'stellar' = 'stellar'; // Default to stellar for new payments
      if (paymentData.transaction_hash) {
        if (paymentData.transaction_hash.startsWith('0x')) {
          blockchainType = 'ethereum';
        }
      }
      
      // Get current network from Stellar configuration
      const network = getCurrentNetwork();
      
      // Create new payment with all Stellar-specific fields
      const newPayment: Payment = {
        id: generateUUID(),
        user_id: walletAddress, // Use wallet address as user ID
        ...paymentData,
        blockchain_type: blockchainType,
        network: network,
        created_at: now,
        // Ensure memo and ledger are included if provided in paymentData
        memo: paymentData.memo,
        ledger: paymentData.ledger
      };
      
      // Add to state using functional update to ensure we have the latest state
      setPayments(prevPayments => {
        const updatedPayments = [newPayment, ...prevPayments];
        
        // Save to localStorage
        const localStorageKey = `gemetra_payments_${walletAddress}`;
        localStorage.setItem(localStorageKey, JSON.stringify(updatedPayments));
        
        console.log(`💾 Added payment to localStorage for employee ${paymentData.employee_id}:`, {
          id: newPayment.id,
          employee_id: paymentData.employee_id,
          amount: paymentData.amount,
          txHash: paymentData.transaction_hash,
          blockchain_type: newPayment.blockchain_type,
          network: newPayment.network,
          memo: paymentData.memo,
          ledger: paymentData.ledger
        });
        
        return updatedPayments;
      });
      
      // Try to also save to Supabase for backward compatibility
      // Use upsert to handle duplicate keys gracefully (insert or update)
      try {
        const { data, error } = await supabase
          .from('payments')
          .upsert([{
            ...paymentData,
            id: newPayment.id,
            user_id: walletAddress,
            blockchain_type: blockchainType,
            network: network,
          }], {
            onConflict: 'id', // If ID exists, update instead of insert
            ignoreDuplicates: false // Update existing records
          })
          .select();
        
        if (error) {
          // If it's a duplicate key error, that's okay - the record already exists
          if (error.code === '23505') {
            console.log('ℹ️ Payment already exists in Supabase (duplicate key):', newPayment.id);
          } else {
            console.error('❌ Failed to save payment to Supabase:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error details:', error.details);
            console.error('❌ Error hint:', error.hint);
            console.error('❌ Payment data attempted:', {
              ...paymentData,
              id: newPayment.id,
              user_id: walletAddress,
              blockchain_type: blockchainType,
              network: network,
            });
          }
        } else {
          console.log('✅ Successfully saved payment to Supabase:', data);
        }
      } catch (supabaseError) {
        console.error('❌ Exception saving payment to Supabase:', supabaseError);
      }
      
      return newPayment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, payments]);

  const updatePaymentStatus = useCallback(async (
    id: string, 
    status: 'pending' | 'completed' | 'failed',
    transactionHash?: string
  ) => {
    setLoading(true);
    setError(null);
    
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // Find the payment to update
      const paymentToUpdate = payments.find(payment => payment.id === id);
      if (!paymentToUpdate) {
        throw new Error(`Payment with ID ${id} not found`);
      }
      
      // Create updated payment
      const updateData: Partial<Payment> = { status };
      if (transactionHash) {
        updateData.transaction_hash = transactionHash;
      }
      
      const updatedPayment = {
        ...paymentToUpdate,
        ...updateData
      };
      
      // Update in state
      const updatedPayments = payments.map(payment => payment.id === id ? updatedPayment : payment);
      setPayments(updatedPayments);
      
      // Save to localStorage
      const localStorageKey = `gemetra_payments_${walletAddress}`;
      localStorage.setItem(localStorageKey, JSON.stringify(updatedPayments));
      
      console.log('Updated payment in localStorage:', updatedPayment);
      
      // Try to also update in Supabase for backward compatibility
      try {
        await supabase
          .from('payments')
          .update(updateData)
          .eq('id', id);
      } catch (supabaseError) {
        console.error('Failed to update payment in Supabase (continuing anyway):', supabaseError);
      }
      
      return updatedPayment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update payment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, payments]);

  const getPaymentsByEmployee = useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);
    
    if (!walletAddress) {
      return [];
    }

    try {
      // Filter payments by employee ID from local state
      const employeePayments = payments.filter(payment => payment.employee_id === employeeId);
      
      // Sort by payment date descending
      const sortedPayments = [...employeePayments].sort((a, b) => {
        const dateA = a.payment_date ? new Date(a.payment_date).getTime() : 0;
        const dateB = b.payment_date ? new Date(b.payment_date).getTime() : 0;
        return dateB - dateA;
      });
      
      return sortedPayments;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payments';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, payments]);

  const getAllPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!walletAddress) {
      return [];
    }

    try {
      // Return all payments from local state
      // Sort by payment date descending
      const sortedPayments = [...payments].sort((a, b) => {
        const dateA = a.payment_date ? new Date(a.payment_date).getTime() : 0;
        const dateB = b.payment_date ? new Date(b.payment_date).getTime() : 0;
        return dateB - dateA;
      });
      
      return sortedPayments;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all payments';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, payments]);

  // Helper function to get blockchain type display name
  const getBlockchainTypeName = useCallback((payment: Payment): string => {
    return payment.blockchain_type === 'ethereum' ? 'Ethereum' : 'Stellar';
  }, []);

  // Helper function to get blockchain type badge color
  const getBlockchainTypeBadge = useCallback((payment: Payment): { label: string; color: string } => {
    if (payment.blockchain_type === 'ethereum') {
      return { label: 'Ethereum', color: 'blue' };
    }
    return { label: 'Stellar', color: 'purple' };
  }, []);

  // Helper function to generate block explorer link
  const getExplorerLink = useCallback((payment: Payment): string | null => {
    if (!payment.transaction_hash) {
      return null;
    }

    if (payment.blockchain_type === 'ethereum') {
      // Ethereum - use Etherscan
      const network = payment.network === 'testnet' ? 'sepolia.' : '';
      return `https://${network}etherscan.io/tx/${payment.transaction_hash}`;
    } else {
      // Stellar - use Stellar Expert
      const network = payment.network === 'testnet' ? 'testnet' : 'public';
      return `https://stellar.expert/explorer/${network}/tx/${payment.transaction_hash}`;
    }
  }, []);

  // Helper function to format transaction hash for display
  const formatTransactionHash = useCallback((payment: Payment): string => {
    if (!payment.transaction_hash) {
      return 'N/A';
    }

    const hash = payment.transaction_hash;
    
    // For Ethereum (0x + 64 chars), show first 10 and last 8 chars
    if (payment.blockchain_type === 'ethereum') {
      if (hash.length >= 18) {
        return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
      }
      return hash;
    }
    
    // For Stellar (64 chars), show first 8 and last 8 chars
    if (hash.length >= 16) {
      return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    }
    return hash;
  }, []);

  // Helper function to get network display name
  const getNetworkName = useCallback((payment: Payment): string => {
    return payment.network === 'mainnet' ? 'Mainnet' : 'Testnet';
  }, []);

  return {
    loading,
    error,
    createPayment,
    updatePaymentStatus,
    getPaymentsByEmployee,
    getAllPayments,
    getBlockchainTypeName,
    getBlockchainTypeBadge,
    getExplorerLink,
    formatTransactionHash,
    getNetworkName,
  };
};