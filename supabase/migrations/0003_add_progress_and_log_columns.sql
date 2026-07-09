
-- Add day_label column to workout_logs
alter table public.workout_logs 
  add column if not exists day_label text;

-- Update progress_stats table columns to match requirements
alter table public.progress_stats 
  add column if not exists total_workouts integer default 0 not null,
  add column if not exists current_streak integer default 0 not null,
  add column if not exists longest_streak integer default 0 not null,
  add column if not exists last_workout_date date;

-- Backfill existing data from workouts_completed to total_workouts
update public.progress_stats 
set total_workouts = workouts_completed 
where total_workouts = 0 and workouts_completed > 0;

-- Add indexes for better query performance
create index if not exists idx_workout_logs_workout_date on public.workout_logs(workout_date);

