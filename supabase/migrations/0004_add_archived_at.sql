-- Add archived_at timestamp to workout_plans so we know when a plan was archived
alter table public.workout_plans
  add column if not exists archived_at timestamp with time zone;

-- Back-fill: any plan that is not active and has no archived_at gets set to created_at
-- (these are plans deactivated by the old generate flow)
update public.workout_plans
set archived_at = created_at
where is_active = false and archived_at is null;

-- Index for listing plans by user ordered by recency
create index if not exists idx_workout_plans_user_created
  on public.workout_plans(user_id, created_at desc);
