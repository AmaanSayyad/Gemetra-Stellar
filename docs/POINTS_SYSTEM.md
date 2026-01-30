# Points & Rewards System

## Overview

Gemetra now includes a complete points and rewards system that incentivizes users to perform transactions. Users earn points for various actions and can convert them to MNEE tokens.

## How It Works

### 1. **Earning Points**

Users automatically earn points when they perform transactions:

- **Single Payment**: 10 points per payment
- **Bulk Payment**: 5 points per employee (e.g., 5 employees = 25 points)
- **Scheduled Payment**: 3 points per scheduled payment processed
- **VAT Refund**: 15 points per VAT refund processed

### 2. **Points Display**

- **Top Bar Badge**: Shows current points balance in the header
- **Points History**: Click the history icon to view all point transactions
- **Real-time Updates**: Points update immediately after transactions

### 3. **Points to MNEE Conversion**

- **Conversion Rate**: 100 points = 1 MNEE token
- **Minimum**: 100 points required for conversion
- **Process**: 
  1. Click the points badge in the header
  2. Enter amount of points to convert
  3. See MNEE equivalent
  4. Confirm conversion
  5. Points are deducted and conversion is recorded

### 4. **Data Storage**

- **Primary**: localStorage (fast, works offline)
- **Backup**: Supabase database (for persistence across devices)
- **Transactions**: All point transactions are logged with timestamps

## Database Schema

### `user_points` Table
- `user_id`: Wallet address (unique)
- `total_points`: Current available points
- `lifetime_points`: Total points ever earned
- `created_at`, `updated_at`: Timestamps

### `point_transactions` Table
- `user_id`: Wallet address
- `points`: Points amount (positive for earned, negative for converted)
- `transaction_type`: 'earned', 'converted', or 'expired'
- `source`: 'payment', 'bulk_payment', 'scheduled_payment', 'vat_refund', 'conversion'
- `source_id`: Reference to payment/transaction
- `description`: Human-readable description
- `created_at`: Timestamp

### `point_conversions` Table
- `user_id`: Wallet address
- `points`: Points converted
- `mnee_amount`: MNEE tokens received
- `conversion_rate`: Points per MNEE (currently 100)
- `transaction_hash`: Optional blockchain transaction
- `status`: 'pending', 'completed', or 'failed'
- `created_at`, `completed_at`: Timestamps

## Integration Points

### Payment Flows

1. **Bulk Transfer** (`PaymentPreviewModal.tsx`)
   - Awards points after successful payment recording
   - Bulk payments: 5 points × number of employees
   - Single payments: 10 points

2. **Scheduled Payments** (`ScheduledPayments.tsx`)
   - Awards 3 points per scheduled payment when processed
   - Points awarded after successful payment execution

3. **VAT Refunds** (`VATRefundPage.tsx`)
   - Awards 15 points per VAT refund
   - Points awarded after successful transaction

## UI Components

### `PointsDisplay.tsx`
- Main component for displaying and managing points
- Shows current balance, lifetime points
- Conversion modal
- Transaction history modal
- Integrated into TopBar

### Points Badge
- Located in the top bar next to notifications
- Shows current points balance
- Click to open conversion modal
- History icon for transaction log

## Conversion Process

1. User clicks points badge
2. Modal opens showing:
   - Current points balance
   - MNEE equivalent
   - Conversion input field
   - Real-time calculation
3. User enters points to convert
4. System validates:
   - Minimum 100 points
   - Sufficient balance
5. Points are deducted
6. Conversion record created
7. In production: MNEE tokens would be sent to user's wallet

## Future Enhancements

- **Smart Contract Integration**: Automatic MNEE distribution via treasury wallet
- **Bonus Points**: Special promotions and bonuses
- **Points Expiration**: Optional expiration dates
- **Tiered Rewards**: Different conversion rates based on loyalty
- **Referral System**: Points for referring new users
- **Achievement Badges**: Unlock achievements for milestones

## Technical Notes

- Points are stored in localStorage for fast access
- Supabase syncs for cross-device persistence
- All operations are non-blocking (points failures don't affect payments)
- Functional state updates prevent race conditions
- Points are wallet-address specific

## Testing

To test the points system:

1. Make a payment → Earn 10 points
2. Make a bulk payment (3 employees) → Earn 15 points
3. Process a scheduled payment → Earn 3 points
4. Process a VAT refund → Earn 15 points
5. Convert points → 100 points = 1 MNEE

Check the browser console for point earning logs.
