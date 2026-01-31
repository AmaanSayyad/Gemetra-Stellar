import React, { useState, useEffect } from 'react';
import { Send, Wallet, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { sendXlmPayment, getAccountBalances, isValidStellarAddress, formatStellarAddress, formatXlm } from '../utils/stellar';
import { useStellarWallet } from '../utils/stellar-wallet';
import { getCurrentNetwork } from '../config/stellar';
export const PaymentGateway: React.FC = () => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedToken, setSelectedToken] = useState('XLM');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    txHash?: string;
    error?: string;
  } | null>(null);
  
  // Use Stellar wallet hook instead of wagmi
  const { walletState, signTransaction } = useStellarWallet();
  const network = getCurrentNetwork();
  
  const [addressError, setAddressError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [xlmBalance, setXlmBalance] = useState<number>(0);
  const [availableXlmBalance, setAvailableXlmBalance] = useState<number>(0);

  // Check wallet connection
  const walletConnected = walletState.isConnected;
  
  // Create wallet signer object for sendXlmPayment
  const walletSigner = {
    signTransaction: async (xdr: string) => {
      return await signTransaction(xdr);
    },
    getPublicKey: () => walletState.publicKey,
    isConnected: () => walletState.isConnected,
  };

  // Check XLM balance
  useEffect(() => {
    const checkXlmBalance = async () => {
      if (walletConnected && walletState.publicKey) {
        try {
          const balances = await getAccountBalances(walletState.publicKey);
          setXlmBalance(balances.xlm);
          setAvailableXlmBalance(balances.availableXlm);
        } catch (error) {
          console.error('Failed to check XLM balance:', error);
        }
      }
    };

    checkXlmBalance();
  }, [walletConnected, walletState.publicKey]);

  const validateAddress = (address: string) => {
    if (!address) {
      setAddressError('Address is required');
      return false;
    }
    
    if (!isValidStellarAddress(address)) {
      setAddressError('Invalid Stellar address format (must be 56 characters starting with G)');
      return false;
    }
    
    setAddressError('');
    return true;
  };

  const validateAmount = (value: string) => {
    const numAmount = parseFloat(value);
    
    if (!value || isNaN(numAmount)) {
      setAmountError('Amount is required');
      return false;
    }
    
    if (numAmount <= 0) {
      setAmountError('Amount must be greater than 0');
      return false;
    }
    
    if (selectedToken === 'XLM' && numAmount < 0.0000001) {
      setAmountError('Minimum amount is 0.0000001 XLM (1 stroop)');
      return false;
    }
    
    setAmountError('');
    return true;
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRecipientAddress(value);
    if (value) {
      validateAddress(value);
    } else {
      setAddressError('');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    if (value) {
      validateAmount(value);
    } else {
      setAmountError('');
    }
  };

  const handleSendPayment = async () => {
    setPaymentResult(null);
    
    const isAddressValid = validateAddress(recipientAddress);
    const isAmountValid = validateAmount(amount);
    
    if (!isAddressValid || !isAmountValid) {
      return;
    }

 
    setIsProcessing(true);

    try {
      console.log('Sending payment:', {
        from: walletState.publicKey,
        recipient: recipientAddress,
        amount: parseFloat(amount),
        token: selectedToken,
        memo: memo || undefined
      });

      const result = await sendXlmPayment({
        recipientAddress,
        amount: parseFloat(amount),
        memo: memo || undefined
      }, walletSigner);

      if (result.success) {
        setPaymentResult({
          success: true,
          txHash: result.txHash
        });
        
        // Clear form after successful payment
        setTimeout(() => {
          setRecipientAddress('');
          setAmount('');
          setMemo('');
          setPaymentResult(null);
        }, 5000);
      } else {
        setPaymentResult({
          success: false,
          error: result.error || 'Payment failed. Please try again.'
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        if (error.message.includes('Wallet not connected')) {
          errorMessage = 'Wallet is not connected. Please connect your wallet and try again.';
        } else if (error.message.includes('Address must not be null')) {
          errorMessage = 'Wallet connection lost. Please reconnect your wallet and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setPaymentResult({
        success: false,
        error: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-8 shadow-sm">
        {/* Header */}

        <div className="space-y-4 sm:space-y-6">
          {/* Network Warning */}
          {walletConnected && network === 'testnet' && (
            <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                <span className="text-yellow-800 font-medium text-sm sm:text-base">Testnet Mode</span>
              </div>
              <p className="text-yellow-700 text-xs sm:text-sm mt-1">
                You are connected to <strong>Stellar Testnet</strong>. Transactions use test XLM with no real value.
              </p>
            </div>
          )}

          {/* Mainnet Confirmation */}
          {walletConnected && network === 'mainnet' && (
            <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <span className="text-green-800 font-medium text-sm sm:text-base">Connected to Stellar Mainnet</span>
              </div>
              <p className="text-green-700 text-xs sm:text-sm mt-1">
                Using real XLM tokens. Address: <code className="text-xs">{formatStellarAddress(walletState.publicKey || '')}</code>
              </p>
            </div>
          )}

          {/* Wallet Connection Warning */}
          {!walletConnected && (
            <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                <span className="text-yellow-800 font-medium text-sm sm:text-base">Wallet Not Connected</span>
              </div>
              <p className="text-yellow-700 text-xs sm:text-sm mt-1">
                Please connect your wallet to send payments. Click the "Connect Wallet" button in the sidebar.
              </p>
            </div>
          )}

          {/* Token Selection */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Select Token
            </label>
            <div className="p-2 sm:p-3 rounded-lg border bg-gray-100 border-gray-300">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-bold">XLM</span>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-medium text-gray-900">Stellar Lumens (XLM)</div>
                  {walletConnected && (
                    <div className="text-xs text-gray-600 mt-1">
                      Balance: {formatXlm(xlmBalance)} XLM (Available: {formatXlm(availableXlmBalance)} XLM)
                    </div>
                  )}
                </div>
              </div>
            </div>
            {walletConnected && xlmBalance === 0 && (
              <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                  <p className="text-xs sm:text-sm text-yellow-800 font-medium">No XLM balance. You need XLM to send payments.</p>
                </div>
              </div>
            )}
          </div>

          {/* Recipient Address */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-5 sm:h-5 text-gray-500" />
              <input
                type="text"
                value={recipientAddress}
                onChange={handleAddressChange}
                placeholder="Enter Stellar address (G...)"
                className={`bg-gray-100 border border-gray-300 text-gray-900 rounded-lg pl-8 sm:pl-10 pr-4 py-2 sm:py-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base ${
                  addressError ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
            </div>
            {addressError && (
              <p className="mt-1 text-xs sm:text-sm text-red-600">{addressError}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                placeholder={`Enter amount in ${selectedToken}`}
                step="0.0000001"
                min="0"
                className={`bg-gray-100 border border-gray-300 text-gray-900 rounded-lg pl-4 pr-12 sm:pr-16 py-2 sm:py-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base ${
                  amountError ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm sm:text-base">
                {selectedToken}
              </div>
            </div>
            {amountError && (
              <p className="mt-1 text-xs sm:text-sm text-red-600">{amountError}</p>
            )}
          </div>

          {/* Memo Field */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Memo (Optional)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Add a note for this payment"
              maxLength={28}
              className="bg-gray-100 border border-gray-300 text-gray-900 rounded-lg pl-4 pr-4 py-2 sm:py-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
            />
            <p className="mt-1 text-xs text-gray-500">Maximum 28 characters</p>
          </div>

          {/* Transaction Summary */}
          {recipientAddress && amount && !addressError && !amountError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4"
            >
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Transaction Summary</h3>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">To:</span>
                  <span className="text-gray-900 font-mono text-xs sm:text-sm">
                    {formatStellarAddress(recipientAddress)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="text-gray-900">{amount} {selectedToken}</span>
                </div>
                {memo && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Memo:</span>
                    <span className="text-gray-900">{memo}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Network Fee:</span>
                  <span className="text-gray-900">0.00001 XLM</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Result Messages */}
          {paymentResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg p-3 sm:p-4 ${
                paymentResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-start space-x-2 sm:space-x-3">
                {paymentResult.success ? (
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className={`font-medium mb-1 text-sm sm:text-base ${
                    paymentResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {paymentResult.success ? 'Payment Successful!' : 'Payment Failed'}
                  </h4>
                  {paymentResult.success ? (
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-green-700">
                        Your payment has been sent successfully.
                      </p>
                      {paymentResult.txHash && (
                        <div className="text-xs text-green-600 font-mono">
                          Transaction ID: {paymentResult.txHash.substring(0, 8)}...
                        </div>
                      )}
                      <button
                        onClick={() => window.open(`https://stellar.expert/explorer/${network}/tx/${paymentResult.txHash}`, '_blank')}
                        className="text-xs text-purple-600 hover:text-purple-700 inline-flex items-center space-x-1 mt-1"
                      >
                        <span>View on Stellar Expert</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-red-700">{paymentResult.error}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSendPayment}
            disabled={isProcessing || !recipientAddress || !amount || !!addressError || !!amountError || !walletConnected}
            className={`w-full btn-primary flex items-center justify-center space-x-2 py-2 sm:py-3 text-sm sm:text-base ${
              isProcessing || !recipientAddress || !amount || !!addressError || !!amountError || !walletConnected
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing Payment...</span>
              </>
            ) : !walletConnected ? (
              <>
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Connect Wallet to Send</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Send Payment</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};