# Points to MNEE Conversion Flow

## What Happens When You Click "Convert to MNEE"

### Current Implementation (MVP/Demo)

When a user clicks the "Convert to MNEE" button, the following happens:

1. **Validation**
   - Checks if wallet is connected
   - Verifies sufficient points balance
   - Ensures minimum 100 points requirement

2. **Points Deduction**
   - Points are immediately deducted from user's balance
   - Updated balance is saved to localStorage
   - Points are synced to Supabase database

3. **Conversion Record Created**
   - A conversion record is created with:
     - Points converted
     - MNEE amount (points ÷ 100)
     - Conversion rate (100:1)
     - Status: "completed"
     - Timestamp

4. **Transaction History Updated**
   - A transaction entry is added showing:
     - Negative points (deducted)
     - Description: "Converted X points to Y MNEE"
     - Transaction type: "converted"

5. **Success Notification**
   - Alert shows conversion details:
     - Points converted
     - MNEE amount received
     - Remaining points balance
     - Note about production behavior

6. **Modal Closes**
   - Points badge updates to show new balance
   - User can view conversion in history

### Production Implementation

In a production environment, the conversion would also:

1. **Trigger MNEE Transfer**
   - Backend API receives conversion request
   - Treasury wallet sends MNEE tokens to user's wallet
   - Blockchain transaction hash is recorded

2. **Options for Production:**

   **Option A: Backend Treasury Wallet**
   ```typescript
   // Backend API endpoint
   POST /api/convert-points
   {
     "walletAddress": "0x...",
     "points": 100,
     "mneeAmount": 1.0
   }
   
   // Backend:
   // 1. Validates conversion
   // 2. Uses treasury wallet to send MNEE
   // 3. Records blockchain tx hash
   // 4. Updates conversion status
   ```

   **Option B: Smart Contract**
   ```solidity
   // Smart contract function
   function convertPoints(uint256 points, address recipient) external {
       require(points >= 100, "Minimum 100 points");
       uint256 mneeAmount = points / 100;
       treasury.transfer(recipient, mneeAmount);
       emit PointsConverted(recipient, points, mneeAmount);
   }
   ```

   **Option C: Manual Batch Processing**
   - Admin dashboard shows pending conversions
   - Admins batch-process conversions daily
   - MNEE tokens sent from treasury wallet
   - Status updated to "completed" with tx hash

### Current Status

- ✅ Points deduction works
- ✅ Conversion records created
- ✅ Transaction history updated
- ✅ UI updates immediately
- ⚠️ MNEE tokens not automatically sent (requires production setup)

### Testing the Conversion

1. Earn points by making payments
2. Click the points badge in the header
3. Enter points to convert (minimum 100)
4. Click "Convert to MNEE"
5. See success message with details
6. Check points history to see conversion record
7. Points balance updates immediately

### Future Enhancements

- [ ] Backend API for automatic MNEE distribution
- [ ] Smart contract integration
- [ ] Real-time blockchain transaction tracking
- [ ] Email notification on conversion
- [ ] Conversion limits (daily/monthly caps)
- [ ] Gas fee estimation
- [ ] Conversion queue for batch processing
