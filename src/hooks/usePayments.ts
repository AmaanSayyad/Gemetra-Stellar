import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Payment } from '../lib/supabase';
import { useAccount } from 'wagmi';
import { usePoints } from './usePoints';

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
  const { address,isConnected } = useAccount();
  
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
  }, []);
  
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

  const createPayment = useCallback(async (paymentData: Omit<Payment, 'id' | 'user_id' | 'created_at'>) => {
    setLoading(true);
    setError(null);
    
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create a new payment with generated ID and timestamp
      const now = new Date().toISOString();
      const newPayment: Payment = {
        id: generateUUID(),
        user_id: walletAddress, // Use wallet address as user ID
        ...paymentData,
        created_at: now
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
          txHash: paymentData.transaction_hash
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

  return {
    loading,
    error,
    createPayment,
    updatePaymentStatus,
    getPaymentsByEmployee,
    getAllPayments,
  };
};