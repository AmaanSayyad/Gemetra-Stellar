import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Repeat, Trash2, Play, Pause, Plus, AlertCircle, CheckCircle, X, DollarSign, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScheduledPayments } from '../hooks/useScheduledPayments';
import { usePayments } from '../hooks/usePayments';
import { usePoints } from '../hooks/usePoints';
import { processDuePayments } from '../services/paymentScheduler';
import { PaymentCalendar } from './PaymentCalendar';
import type { Employee } from '../lib/supabase';
import type { ScheduledPayment } from '../lib/supabase';

interface ScheduledPaymentsProps {
  employees: Employee[];
  isWalletConnected: boolean;
  walletAddress: string;
  onPaymentSuccess?: () => void;
}

export const ScheduledPayments: React.FC<ScheduledPaymentsProps> = ({
  employees,
  isWalletConnected,
  walletAddress,
  onPaymentSuccess
}) => {
  const {
    scheduledPayments,
    loading,
    error,
    createScheduledPayment,
    updateScheduledPayment,
    deleteScheduledPayment,
    getDuePayments,
    getAllScheduledPayments
  } = useScheduledPayments();
  
  const { createPayment } = usePayments();
  const { earnPoints } = usePoints();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [scheduleType, setScheduleType] = useState<'one-time' | 'recurring'>('one-time');
  const [scheduledDate, setScheduledDate] = useState('');
  const [recurrence, setRecurrence] = useState<'daily' | 'weekly' | 'bi-weekly' | 'monthly'>('monthly');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<{ success: number; failed: number } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [selectedDatePayments, setSelectedDatePayments] = useState<ScheduledPayment[]>([]);
  const [showPreApprovalModal, setShowPreApprovalModal] = useState(false);
  const [preApprovalAmount, setPreApprovalAmount] = useState('');
  const [preApprovalLimit, setPreApprovalLimit] = useState<number | null>(null);

  // Load pre-approval limit from localStorage
  useEffect(() => {
    if (walletAddress) {
      const storedLimit = localStorage.getItem(`gemetra_preapproval_limit_${walletAddress}`);
      if (storedLimit) {
        setPreApprovalLimit(parseFloat(storedLimit));
      }
    }
  }, [walletAddress]);

  // Auto-check for due payments every minute
  useEffect(() => {
    if (!isWalletConnected) return;

    const checkAndProcessPayments = async () => {
      const duePayments = getDuePayments();
      if (duePayments.length > 0) {
        console.log(`⏰ Found ${duePayments.length} due scheduled payments`);
        
        // Check if we can auto-process (within pre-approval limit)
        if (preApprovalLimit !== null && preApprovalLimit > 0) {
          const totalDueAmount = duePayments.reduce((sum, p) => sum + p.amount, 0);
          if (totalDueAmount <= preApprovalLimit) {
            console.log(`✅ Total due amount (${totalDueAmount}) is within pre-approval limit (${preApprovalLimit}). Auto-processing...`);
            // Auto-process payments within limit
            try {
              const result = await processDuePayments(
                duePayments,
                createPayment,
                updateScheduledPayment
              );
              console.log(`✅ Auto-processed ${result.processed} payments`);
              // Update pre-approval limit (reduce by processed amount)
              const newLimit = preApprovalLimit - totalDueAmount;
              setPreApprovalLimit(newLimit);
              localStorage.setItem(`gemetra_preapproval_limit_${walletAddress}`, newLimit.toString());
            } catch (error) {
              console.error('Failed to auto-process payments:', error);
            }
          } else {
            console.log(`⚠️ Total due amount (${totalDueAmount}) exceeds pre-approval limit (${preApprovalLimit}). Manual approval required.`);
          }
        }
      }
    };

    // Check immediately
    checkAndProcessPayments();

    // Then check every minute
    const interval = setInterval(checkAndProcessPayments, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [isWalletConnected, getDuePayments, preApprovalLimit, walletAddress, createPayment, updateScheduledPayment]);

  const handleCreateSchedule = async () => {
    if (!selectedEmployee || !scheduledDate || !amount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createScheduledPayment({
        employee_id: selectedEmployee.id,
        employee_name: selectedEmployee.name,
        employee_email: selectedEmployee.email,
        employee_wallet_address: selectedEmployee.wallet_address,
        amount: parseFloat(amount),
        token: 'MNEE',
        schedule_type: scheduleType,
        scheduled_date: new Date(scheduledDate).toISOString(),
        recurrence: scheduleType === 'recurring' ? recurrence : undefined,
        next_payment_date: scheduleType === 'recurring' ? new Date(scheduledDate).toISOString() : undefined,
        end_date: scheduleType === 'recurring' && endDate ? new Date(endDate).toISOString() : undefined,
      });

      // Reset form
      setSelectedEmployee(null);
      setScheduledDate('');
      setAmount('');
      setEndDate('');
      setShowCreateModal(false);
      
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (error) {
      console.error('Failed to create scheduled payment:', error);
      alert('Failed to create scheduled payment');
    }
  };

  const handleProcessDuePayments = async () => {
    if (!isWalletConnected) {
      alert('Please connect your wallet first');
      return;
    }

    const duePayments = getDuePayments();
    if (duePayments.length === 0) {
      alert('No payments are due at this time');
      return;
    }

    // Show confirmation dialog with payment details
    const totalAmount = duePayments.reduce((sum, p) => sum + p.amount, 0);
    const paymentList = duePayments.map(p => `  • ${p.employee_name}: $${p.amount.toLocaleString()}`).join('\n');
    
    const confirmMessage = `You are about to process ${duePayments.length} payment${duePayments.length > 1 ? 's' : ''}:\n\n${paymentList}\n\nTotal: $${totalAmount.toLocaleString()} MNEE\n\n⚠️ MetaMask will open ${duePayments.length > 1 ? `${duePayments.length} popup${duePayments.length > 1 ? 's' : ''}` : 'a popup'} for confirmation. You'll need to approve each transaction.\n\nProceed?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsProcessing(true);
    setProcessingStatus(null);

    try {
      const result = await processDuePayments(
        duePayments,
        createPayment,
        updateScheduledPayment
      );

      setProcessingStatus({
        success: result.processed,
        failed: result.failed
      });

      // Award points for scheduled payments (3 points per payment)
      if (result.processed > 0) {
        try {
          const pointsEarned = result.processed * 3;
          await earnPoints(pointsEarned, 'scheduled_payment', undefined, `Processed ${result.processed} scheduled payment(s)`);
          console.log(`🎉 Earned ${pointsEarned} points for scheduled payments!`);
        } catch (pointsError) {
          console.error('Failed to award points (non-critical):', pointsError);
        }
      }

      if (onPaymentSuccess) {
        onPaymentSuccess();
      }

      // Clear status after 5 seconds
      setTimeout(() => setProcessingStatus(null), 5000);
    } catch (error) {
      console.error('Failed to process due payments:', error);
      alert('Failed to process due payments. Please check MetaMask and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (payment: ScheduledPayment) => {
    const newStatus = payment.status === 'active' ? 'paused' : 'active';
    await updateScheduledPayment(payment.id, { status: newStatus });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this scheduled payment?')) {
      await deleteScheduledPayment(id);
    }
  };

  const allScheduledPayments = getAllScheduledPayments();
  const duePayments = getDuePayments();
  const activePayments = allScheduledPayments.filter(p => p.status === 'active');
  const pausedPayments = allScheduledPayments.filter(p => p.status === 'paused');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRecurrenceLabel = (recurrence?: string) => {
    switch (recurrence) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'bi-weekly': return 'Bi-weekly';
      case 'monthly': return 'Monthly';
      default: return 'One-time';
    }
  };

  return (
    <>
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Scheduled Payments</h2>
            <p className="text-sm sm:text-base text-gray-600">
              Automate your payroll with scheduled and recurring payments
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-0">
            {/* View Toggle */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="w-4 h-4 inline mr-1" />
                Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List
              </button>
            </div>
            {(() => {
              const totalDueAmount = duePayments.reduce((sum, p) => sum + p.amount, 0);
              const isWithinLimit = preApprovalLimit !== null && preApprovalLimit > 0 && totalDueAmount <= preApprovalLimit;
              
              // Only show button if payments exceed limit or no pre-approval set
              if (duePayments.length > 0 && !isWithinLimit) {
                return (
                  <button
                    onClick={handleProcessDuePayments}
                    disabled={isProcessing || !isWalletConnected}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center space-x-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Process {duePayments.length} Due Payment{duePayments.length > 1 ? 's' : ''}</span>
                  </button>
                );
              }
              return null;
            })()}
            <button
              onClick={() => setShowPreApprovalModal(true)}
              disabled={!isWalletConnected}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center space-x-2"
              title="Pre-approve spending limit for automatic payments"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Pre-approve Limit</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!isWalletConnected || employees.length === 0}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Payment</span>
            </button>
          </div>
        </div>

        {/* Pre-Approval Limit Display */}
        {preApprovalLimit !== null && preApprovalLimit > 0 && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-purple-800 font-medium">
                    Pre-approved Spending Limit: ${preApprovalLimit.toLocaleString()} MNEE
                  </p>
                  <p className="text-purple-700 text-sm mt-1">
                    Payments within this limit will process automatically at scheduled time. MetaMask confirmation is still required for security.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreApprovalModal(true)}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Update
              </button>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {processingStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-medium">
                  Processed {processingStatus.success} payment{processingStatus.success !== 1 ? 's' : ''} successfully
                </p>
                {processingStatus.failed > 0 && (
                  <p className="text-red-600 text-sm mt-1">
                    {processingStatus.failed} payment{processingStatus.failed !== 1 ? 's' : ''} failed
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Due Payments Alert */}
        {duePayments.length > 0 && (() => {
          const totalDueAmount = duePayments.reduce((sum, p) => sum + p.amount, 0);
          const isWithinLimit = preApprovalLimit !== null && preApprovalLimit > 0 && totalDueAmount <= preApprovalLimit;
          
          return (
            <div className={`mb-6 p-4 border rounded-lg ${
              isWithinLimit 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center space-x-2">
                <AlertCircle className={`w-5 h-5 ${isWithinLimit ? 'text-blue-600' : 'text-yellow-600'}`} />
                <div className="flex-1">
                  <p className={`font-medium ${isWithinLimit ? 'text-blue-800' : 'text-yellow-800'}`}>
                    ⏰ {duePayments.length} payment{duePayments.length > 1 ? 's' : ''} due for processing
                    {isWithinLimit && ' (within pre-approved limit)'}
                  </p>
                  {isWithinLimit ? (
                    <>
                      <p className="text-blue-700 text-sm mt-1">
                        ✅ Payments will process automatically. <strong>MetaMask will open {duePayments.length > 1 ? `${duePayments.length} popup${duePayments.length > 1 ? 's' : ''}` : 'a popup'} for confirmation</strong>.
                      </p>
                      <div className="mt-2 text-xs text-blue-600">
                        💡 <strong>Note:</strong> Pre-approval enables automatic triggering, but MetaMask confirmation is still required for security. Each payment needs your approval.
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-yellow-700 text-sm mt-1">
                        ⚠️ Total amount (${totalDueAmount.toLocaleString()} MNEE) exceeds your pre-approved limit (${preApprovalLimit?.toLocaleString() || 0} MNEE). Click "Process Due Payments" to execute manually.
                      </p>
                      <div className="mt-2 text-xs text-yellow-600">
                        💡 <strong>Note:</strong> Each payment requires a separate MetaMask confirmation for security. You'll need to approve each transaction in MetaMask.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Wallet Connection Warning */}
        {!isWalletConnected && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 font-medium">Please connect your wallet to schedule payments</p>
            </div>
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="mb-6">
            <PaymentCalendar
              scheduledPayments={allScheduledPayments}
              onDateClick={(date, payments) => {
                setSelectedCalendarDate(date);
                setSelectedDatePayments(payments);
              }}
              selectedDate={selectedCalendarDate}
            />
            
            {/* Selected Date Payments */}
            {selectedCalendarDate && selectedDatePayments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <h4 className="font-semibold text-gray-900 mb-3">
                  Payments on {selectedCalendarDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h4>
                <div className="space-y-2">
                  {selectedDatePayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">{payment.employee_name}</p>
                        <p className="text-sm text-gray-600">{payment.employee_email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${payment.amount.toLocaleString()}</p>
                        {payment.schedule_type === 'recurring' && (
                          <p className="text-xs text-gray-500">{getRecurrenceLabel(payment.recurrence)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <>
        {/* Active Scheduled Payments */}
        {activePayments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Schedules</h3>
            <div className="space-y-3">
              {activePayments.map((payment) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{payment.employee_name}</h4>
                        {payment.schedule_type === 'recurring' && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium flex items-center space-x-1">
                            <Repeat className="w-3 h-3" />
                            <span>{getRecurrenceLabel(payment.recurrence)}</span>
                          </span>
                        )}
                        {duePayments.some(p => p.id === payment.id) && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                            Due Now
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4" />
                          <span>${payment.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(payment.scheduled_date)}</span>
                        </div>
                        {payment.schedule_type === 'recurring' && payment.processed_count && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>{payment.processed_count} processed</span>
                          </div>
                        )}
                        {payment.end_date && (
                          <div className="flex items-center space-x-1">
                            <X className="w-4 h-4" />
                            <span>Ends: {formatDate(payment.end_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                      <button
                        onClick={() => handleToggleStatus(payment)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Pause"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Paused Scheduled Payments */}
        {pausedPayments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Paused Schedules</h3>
            <div className="space-y-3">
              {pausedPayments.map((payment) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{payment.employee_name}</h4>
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                          Paused
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4" />
                          <span>${payment.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(payment.scheduled_date)}</span>
                        </div>
                        {payment.schedule_type === 'recurring' && (
                          <div className="flex items-center space-x-1">
                            <Repeat className="w-4 h-4" />
                            <span>{getRecurrenceLabel(payment.recurrence)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                      <button
                        onClick={() => handleToggleStatus(payment)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Resume"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {allScheduledPayments.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scheduled Payments</h3>
            <p className="text-gray-600 mb-4">Create your first scheduled payment to automate payroll</p>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!isWalletConnected || employees.length === 0}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Schedule Payment
            </button>
          </div>
        )}
          </>
        )}

        {/* Pre-Approval Modal */}
        <AnimatePresence>
          {showPreApprovalModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowPreApprovalModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">Pre-approve Spending Limit</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set a spending limit for automatic payment processing. Payments within this limit will be automatically triggered at scheduled time. <strong>Note:</strong> MetaMask confirmation is still required for each transaction for security.
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spending Limit (MNEE) *
                  </label>
                  <input
                    type="number"
                    value={preApprovalAmount}
                    onChange={(e) => setPreApprovalAmount(e.target.value)}
                    placeholder="Enter amount (e.g., 1000)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {preApprovalLimit !== null && preApprovalLimit > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Current limit: ${preApprovalLimit.toLocaleString()} MNEE
                    </p>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-yellow-800">
                    ⚠️ <strong>How it works:</strong> Pre-approval enables automatic triggering of payments within the limit. Each payment will still require MetaMask confirmation for security. This feature helps you track and manage your spending limits.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowPreApprovalModal(false);
                      setPreApprovalAmount('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!preApprovalAmount || parseFloat(preApprovalAmount) <= 0) {
                        alert('Please enter a valid amount');
                        return;
                      }
                      
                      // Store the limit locally
                      // Note: In a production environment with a payment processor contract,
                      // we would call ERC20 approve() here to grant the contract permission
                      // to spend tokens on your behalf. For now, this is a tracking limit.
                      const limit = parseFloat(preApprovalAmount);
                      setPreApprovalLimit(limit);
                      localStorage.setItem(`gemetra_preapproval_limit_${walletAddress}`, limit.toString());
                      
                      alert(`Pre-approval limit set to $${limit.toLocaleString()} MNEE. Payments within this limit will be automatically triggered.`);
                      
                      setShowPreApprovalModal(false);
                      setPreApprovalAmount('');
                    }}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Set Limit
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Schedule Modal */}
      <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">Schedule Payment</h3>
                
                {/* Employee Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee *
                  </label>
                  <select
                    value={selectedEmployee?.id || ''}
                    onChange={(e) => {
                      const emp = employees.find(emp => emp.id === e.target.value);
                      setSelectedEmployee(emp || null);
                      if (emp) setAmount(emp.salary.toString());
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select employee</option>
                    {employees.filter(emp => emp.status === 'active').map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} - ${emp.salary.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (MNEE) *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                {/* Schedule Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Type *
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="one-time"
                        checked={scheduleType === 'one-time'}
                        onChange={(e) => setScheduleType(e.target.value as 'one-time' | 'recurring')}
                        className="mr-2"
                      />
                      One-time
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="recurring"
                        checked={scheduleType === 'recurring'}
                        onChange={(e) => setScheduleType(e.target.value as 'one-time' | 'recurring')}
                        className="mr-2"
                      />
                      Recurring
                    </label>
                  </div>
                </div>

                {/* Scheduled Date */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {scheduleType === 'one-time' ? 'Payment Date' : 'Start Date'} *
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                {/* Recurrence Options */}
                {scheduleType === 'recurring' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frequency *
                      </label>
                      <select
                        value={recurrence}
                        onChange={(e) => setRecurrence(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={scheduledDate || new Date().toISOString().slice(0, 10)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSchedule}
                    disabled={!selectedEmployee || !scheduledDate || !amount}
                    className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Schedule
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
    </>
  );
};
