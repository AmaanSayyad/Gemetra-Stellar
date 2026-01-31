import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserPoints, PointTransaction, PointConversion } from '../lib/supabase';
import { useStellarWallet } from '../utils/stellar-wallet';
import { sendXlmPayment, getXlmBalance } from '../utils/stellar';

// Helper function to generate a UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Points calculation rules
const POINTS_RULES = {
  payment: 10, // 10 points per payment
  bulk_payment: 5, // 5 points per employee in bulk payment
  scheduled_payment: 3, // 3 points per scheduled payment
  vat_refund: 15, // 15 points per VAT refund
  bonus: 0, // Manual bonus points
};

// Conversion rate: 100 points = 1 XLM
const CONVERSION_RATE = 100;

export const usePoints = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { walletState } = useStellarWallet();

  // Check wallet connection
  useEffect(() => {
    if (walletState.isConnected && walletState.publicKey) {
      setWalletAddress(walletState.publicKey);
    } else {
      setWalletAddress(null);
      setUserPoints(null);
      setTransactions([]);
    }
  }, [walletState.isConnected, walletState.publicKey]);

  // Load points from localStorage when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      const localStorageKey = `gemetra_points_${walletAddress}`;
      const storedPoints = localStorage.getItem(localStorageKey);
      
      if (storedPoints) {
        try {
          const parsedPoints = JSON.parse(storedPoints);
          setUserPoints(parsedPoints);
        } catch (parseError) {
          console.error('Error parsing points from localStorage:', parseError);
          // Initialize if doesn't exist
          initializePoints();
        }
      } else {
        initializePoints();
      }

      // Load transactions
      const transactionsKey = `gemetra_point_transactions_${walletAddress}`;
      const storedTransactions = localStorage.getItem(transactionsKey);
      if (storedTransactions) {
        try {
          const parsedTransactions = JSON.parse(storedTransactions);
          setTransactions(parsedTransactions);
        } catch (parseError) {
          console.error('Error parsing transactions from localStorage:', parseError);
          setTransactions([]);
        }
      }
    }
  }, [walletAddress]);

  const initializePoints = useCallback(() => {
    if (!walletAddress) return;

    const newPoints: UserPoints = {
      id: generateUUID(),
      user_id: walletAddress,
      total_points: 0,
      lifetime_points: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUserPoints(newPoints);
    const localStorageKey = `gemetra_points_${walletAddress}`;
    localStorage.setItem(localStorageKey, JSON.stringify(newPoints));
  }, [walletAddress]);

  const earnPoints = useCallback(async (
    points: number,
    source: PointTransaction['source'],
    sourceId?: string,
    description?: string
  ): Promise<PointTransaction | null> => {
    if (!walletAddress) {
      console.warn('Cannot earn points: wallet not connected');
      return null;
    }

    if (points <= 0) {
      console.warn('Cannot earn zero or negative points');
      return null;
    }

    try {
      setLoading(true);

      // Create transaction record
      const transaction: PointTransaction = {
        id: generateUUID(),
        user_id: walletAddress,
        points,
        transaction_type: 'earned',
        source,
        source_id: sourceId,
        description: description || `Earned ${points} points from ${source}`,
        created_at: new Date().toISOString(),
      };

      // Update points using functional update
      setUserPoints(prevPoints => {
        if (!prevPoints) {
          const newPoints: UserPoints = {
            id: generateUUID(),
            user_id: walletAddress,
            total_points: points,
            lifetime_points: points,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const localStorageKey = `gemetra_points_${walletAddress}`;
          localStorage.setItem(localStorageKey, JSON.stringify(newPoints));
          return newPoints;
        }

        const updatedPoints: UserPoints = {
          ...prevPoints,
          total_points: prevPoints.total_points + points,
          lifetime_points: prevPoints.lifetime_points + points,
          updated_at: new Date().toISOString(),
        };

        const localStorageKey = `gemetra_points_${walletAddress}`;
        localStorage.setItem(localStorageKey, JSON.stringify(updatedPoints));
        return updatedPoints;
      });

      // Add transaction
      setTransactions(prevTransactions => {
        const updatedTransactions = [transaction, ...prevTransactions];
        const transactionsKey = `gemetra_point_transactions_${walletAddress}`;
        localStorage.setItem(transactionsKey, JSON.stringify(updatedTransactions));
        return updatedTransactions;
      });

      // Try to save to Supabase
      try {
        // Upsert user points
        await supabase
          .from('user_points')
          .upsert({
            user_id: walletAddress,
            total_points: (userPoints?.total_points || 0) + points,
            lifetime_points: (userPoints?.lifetime_points || 0) + points,
          }, {
            onConflict: 'user_id'
          });

        // Insert transaction
        await supabase
          .from('point_transactions')
          .insert([transaction]);
      } catch (supabaseError) {
        console.error('Failed to save points to Supabase (continuing anyway):', supabaseError);
      }

      console.log(`✅ Earned ${points} points from ${source}`);
      return transaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to earn points';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, userPoints]);

  const convertPointsToXlm = useCallback(async (pointsToConvert: number, recipientAddress?: string) => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    if (!userPoints || userPoints.total_points < pointsToConvert) {
      throw new Error('Insufficient points');
    }

    if (pointsToConvert < CONVERSION_RATE) {
      throw new Error(`Minimum ${CONVERSION_RATE} points required for conversion`);
    }

    // Use provided recipient address or default to connected wallet
    const finalRecipientAddress = recipientAddress || walletAddress;

    try {
      setLoading(true);

      const xlmAmount = pointsToConvert / CONVERSION_RATE;

      // Create conversion record
      const conversion: PointConversion = {
        id: generateUUID(),
        user_id: walletAddress,
        points: pointsToConvert,
        mnee_amount: xlmAmount, // Field name kept for backward compatibility, but stores XLM
        conversion_rate: CONVERSION_RATE,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      // Attempt to send XLM tokens to user's wallet
      // NOTE: This requires the user's wallet to have XLM tokens OR a treasury wallet
      // For demo: We'll try to send from user's wallet if they have XLM
      // In production: This would be handled by a backend treasury wallet
      let actualTxHash: string | undefined;
      let conversionStatus: 'pending' | 'completed' | 'failed' = 'pending';
      
      try {
        // Check if user has XLM balance (for demo/testing)
        // In production, this would check treasury wallet balance
        const userBalance = await getXlmBalance(walletAddress);
        
        if (userBalance >= xlmAmount) {
          // For demo: User can send tokens if they have balance
          // In production, this would be a treasury wallet sending to recipient
          console.log(`💰 Sending ${xlmAmount} XLM to ${finalRecipientAddress}...`);
          
          const transferResult = await sendXlmPayment({
            recipientAddress: finalRecipientAddress,
            amount: xlmAmount,
            memo: `Points conversion: ${pointsToConvert} points`
          });
          
          if (transferResult.success && transferResult.txHash) {
            actualTxHash = transferResult.txHash;
            conversionStatus = 'completed';
            console.log(`✅ XLM tokens sent! Transaction: ${actualTxHash}`);
          } else {
            conversionStatus = 'failed';
            console.error('Failed to send XLM tokens:', transferResult.error);
          }
        } else {
          // User doesn't have enough XLM - this is expected in production
          // In production, treasury wallet would send tokens
          console.log('⚠️ User wallet does not have sufficient XLM balance.');
          console.log('💡 In production, a treasury wallet would send tokens here.');
          console.log('📝 Recording conversion as pending (requires treasury wallet in production)');
          
          // Mark as pending - would be completed by backend/treasury in production
          conversionStatus = 'pending';
        }
      } catch (transferError) {
        console.error('Error attempting XLM transfer:', transferError);
        // Still record the conversion, but mark as pending
        conversionStatus = 'pending';
      }
      
      // Deduct points
      setUserPoints(prevPoints => {
        if (!prevPoints) throw new Error('Points not initialized');

        const updatedPoints: UserPoints = {
          ...prevPoints,
          total_points: prevPoints.total_points - pointsToConvert,
          updated_at: new Date().toISOString(),
        };

        const localStorageKey = `gemetra_points_${walletAddress}`;
        localStorage.setItem(localStorageKey, JSON.stringify(updatedPoints));
        return updatedPoints;
      });

      // Create transaction record for conversion
      const transaction: PointTransaction = {
        id: generateUUID(),
        user_id: walletAddress,
        points: -pointsToConvert,
        transaction_type: 'converted',
        source: 'conversion',
        source_id: conversion.id,
        description: `Converted ${pointsToConvert} points to ${xlmAmount.toFixed(7)} XLM`,
        created_at: new Date().toISOString(),
      };

      setTransactions(prevTransactions => {
        const updatedTransactions = [transaction, ...prevTransactions];
        const transactionsKey = `gemetra_point_transactions_${walletAddress}`;
        localStorage.setItem(transactionsKey, JSON.stringify(updatedTransactions));
        return updatedTransactions;
      });

      // Update conversion with actual status and transaction hash
      try {
        conversion.status = conversionStatus;
        conversion.completed_at = conversionStatus === 'completed' ? new Date().toISOString() : undefined;
        conversion.transaction_hash = actualTxHash || (conversionStatus === 'pending' ? `pending_treasury_${generateUUID()}` : `error_${generateUUID()}`);

        // Save to Supabase
        await supabase
          .from('point_conversions')
          .insert([conversion]);

        await supabase
          .from('point_transactions')
          .insert([transaction]);

        await supabase
          .from('user_points')
          .upsert({
            user_id: walletAddress,
            total_points: (userPoints.total_points - pointsToConvert),
            lifetime_points: userPoints.lifetime_points,
          }, {
            onConflict: 'user_id'
          });
      } catch (supabaseError) {
        console.error('Failed to save conversion to Supabase:', supabaseError);
      }

      console.log(`✅ Converted ${pointsToConvert} points to ${xlmAmount.toFixed(7)} XLM (Status: ${conversionStatus})`);
      
      return {
        conversion,
        xlmAmount,
        remainingPoints: (userPoints.total_points - pointsToConvert),
        transactionHash: actualTxHash || conversion.transaction_hash,
        status: conversionStatus,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to convert points';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, userPoints]);

  const getPointsForPayment = useCallback((paymentAmount: number, source: PointTransaction['source'], employeeCount: number = 1) => {
    switch (source) {
      case 'payment':
        return POINTS_RULES.payment;
      case 'bulk_payment':
        return POINTS_RULES.bulk_payment * employeeCount;
      case 'scheduled_payment':
        return POINTS_RULES.scheduled_payment;
      case 'vat_refund':
        return POINTS_RULES.vat_refund;
      default:
        return 0;
    }
  }, []);

  return {
    userPoints,
    transactions,
    loading,
    error,
    earnPoints,
    convertPointsToXlm,
    getPointsForPayment,
    conversionRate: CONVERSION_RATE,
    pointsRules: POINTS_RULES,
  };
};
