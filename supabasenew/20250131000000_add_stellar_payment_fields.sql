/*
  # Add Stellar Payment Fields to Payments Table

  This migration adds support for Stellar blockchain payments alongside existing Ethereum payments.
  
  1. New Columns
    - `blockchain_type` (enum: 'ethereum' | 'stellar') - Distinguishes blockchain used for payment
    - `network` (enum: 'mainnet' | 'testnet') - Tracks which network was used
    - `memo` (text, nullable) - Stellar memo field for payment notes
    - `ledger` (integer, nullable) - Stellar ledger number where transaction was included

  2. Changes
    - Sets default 'ethereum' for blockchain_type to preserve existing records
    - Sets default 'mainnet' for network
    - All new columns are nullable or have defaults for backward compatibility

  3. Indexes
    - Add index on blockchain_type for filtering by blockchain
    - Add index on network for filtering by network
*/

-- Create enum types for blockchain_type and network
DO $$ BEGIN
  CREATE TYPE blockchain_type AS ENUM ('ethereum', 'stellar');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE network_type AS ENUM ('mainnet', 'testnet');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add blockchain_type column with default 'ethereum' for existing records
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS blockchain_type blockchain_type DEFAULT 'ethereum' NOT NULL;

-- Add network column with default 'mainnet'
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS network network_type DEFAULT 'mainnet' NOT NULL;

-- Add memo column for Stellar memos (nullable)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS memo text;

-- Add ledger column for Stellar ledger numbers (nullable)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS ledger integer;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_blockchain_type ON public.payments(blockchain_type);
CREATE INDEX IF NOT EXISTS idx_payments_network ON public.payments(network);
CREATE INDEX IF NOT EXISTS idx_payments_ledger ON public.payments(ledger) WHERE ledger IS NOT NULL;

-- Add comment to document the migration
COMMENT ON COLUMN public.payments.blockchain_type IS 'Blockchain platform used for payment (ethereum or stellar)';
COMMENT ON COLUMN public.payments.network IS 'Network used for payment (mainnet or testnet)';
COMMENT ON COLUMN public.payments.memo IS 'Stellar memo field for payment notes';
COMMENT ON COLUMN public.payments.ledger IS 'Stellar ledger number where transaction was included';
