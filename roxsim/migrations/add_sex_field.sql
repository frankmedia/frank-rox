-- Migration: Add sex and surname fields to roxsim_users
-- Date: 2025-01-29
-- Description: Adds sex field for competition categorization and surname field

-- Add surname column to roxsim_users table
ALTER TABLE public.roxsim_users 
ADD COLUMN IF NOT EXISTS surname TEXT;

-- Add sex column to roxsim_users table
ALTER TABLE public.roxsim_users 
ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('male', 'female'));

-- Add comments to document the fields
COMMENT ON COLUMN public.roxsim_users.surname IS 'User surname/last name for competition display';
COMMENT ON COLUMN public.roxsim_users.sex IS 'User sex for competition age/sex categories. Values: male, female';

-- Create index for faster filtering in competitions
CREATE INDEX IF NOT EXISTS roxsim_users_sex_idx ON public.roxsim_users(sex);

-- Note: Existing users will have NULL values
-- They will need to update their profile before entering competitions

