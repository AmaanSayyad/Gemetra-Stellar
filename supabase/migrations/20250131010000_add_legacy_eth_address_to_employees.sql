/*
  # Add Legacy Ethereum Address Column to Employees Table

  This migration adds support for preserving legacy Ethereum addresses when migrating to Stellar.
  
  1. New Column
    - `legacy_eth_address` (text, nullable) - Stores original Ethereum wallet addresses
  
  2. Data Migration
    - Copies existing `wallet_address` values to `legacy_eth_address`
    - Clears `wallet_address` field (users must update to Stellar addresses)
  
  3. Changes
    - Updates wallet_address constraint to accept Stellar addresses (56 characters starting with 'G')
    - Preserves historical Ethereum addresses in legacy_eth_address field
    - Makes wallet_address nullable temporarily to allow gradual migration

  4. Indexes
    - Add index on legacy_eth_address for historical lookups
*/

-- Step 1: Add legacy_eth_address column (nullable)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS legacy_eth_address text;

-- Step 2: Copy existing wallet_address values to legacy_eth_address
-- Only copy if wallet_address exists and is not empty
UPDATE public.employees
SET legacy_eth_address = wallet_address
WHERE wallet_address IS NOT NULL 
  AND wallet_address != ''
  AND legacy_eth_address IS NULL;

-- Step 3: Clear wallet_address field to force users to update to Stellar addresses
-- This ensures users must explicitly provide Stellar addresses
UPDATE public.employees
SET wallet_address = NULL
WHERE wallet_address IS NOT NULL;

-- Step 4: Drop the old wallet_address constraint (40+ chars for Ethereum)
ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employees_wallet_address_check;

-- Step 5: Make wallet_address nullable to allow gradual migration
ALTER TABLE public.employees
ALTER COLUMN wallet_address DROP NOT NULL;

-- Step 6: Add new constraint for Stellar addresses (56 chars, starts with 'G')
-- This constraint will only apply when wallet_address is not NULL
ALTER TABLE public.employees
ADD CONSTRAINT employees_wallet_address_stellar_check 
CHECK (
  wallet_address IS NULL OR 
  (length(wallet_address) = 56 AND wallet_address LIKE 'G%')
);

-- Step 7: Create index on legacy_eth_address for historical lookups
CREATE INDEX IF NOT EXISTS idx_employees_legacy_eth_address 
ON public.employees(legacy_eth_address) 
WHERE legacy_eth_address IS NOT NULL;

-- Step 8: Add comments to document the migration
COMMENT ON COLUMN public.employees.legacy_eth_address IS 'Legacy Ethereum wallet address preserved during Stellar migration';
COMMENT ON COLUMN public.employees.wallet_address IS 'Current Stellar wallet address (56 characters starting with G)';

-- Verification query (optional - uncomment to check)
-- SELECT 
--   id, 
--   name, 
--   wallet_address as stellar_address,
--   legacy_eth_address as ethereum_address
-- FROM public.employees
-- LIMIT 5;
