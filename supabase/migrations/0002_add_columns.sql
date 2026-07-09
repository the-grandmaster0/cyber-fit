
-- Add missing columns to profiles
alter table public.profiles 
  add column if not exists goal text,
  add column if not exists equipment text[],
  add column if not exists injuries_notes text;

-- Add is_active column to workout_plans with default false
alter table public.workout_plans 
  add column if not exists is_active boolean default false not null;
