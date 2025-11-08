-- Fix foreign key constraint issue with job_parts.transaction_id
-- The transaction_id is for reference only and doesn't need a strict foreign key
-- This fixes the race condition where transaction isn't yet visible when job_part is inserted

-- Drop the existing foreign key constraint
ALTER TABLE job_parts
DROP CONSTRAINT IF EXISTS job_parts_transaction_id_fkey;

-- Transaction_id can still be a UUID for reference, but without the FK constraint
-- This allows the job_parts insert to succeed immediately after transaction creation
