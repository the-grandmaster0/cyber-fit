
-- Enable uuid-ossp extension for UUID generation (if needed)
create extension if not exists pgcrypto;

-- Create profiles table
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    avatar_url text,
    age integer,
    gender text,
    height_cm integer,
    weight_kg numeric,
    fitness_goal text,
    experience_level text,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Enable Row Level Security for profiles
alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
    on public.profiles for select
    using (id = auth.uid());

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update
    using (id = auth.uid());

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
    on public.profiles for delete
    using (id = auth.uid());

-- Create workout_plans table
create table if not exists public.workout_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    goal text,
    duration_weeks integer,
    plan_json jsonb,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Enable Row Level Security for workout_plans
alter table public.workout_plans enable row level security;

drop policy if exists "Users can view their own workout plans" on public.workout_plans;
create policy "Users can view their own workout plans"
    on public.workout_plans for select
    using (user_id = auth.uid());

drop policy if exists "Users can insert their own workout plans" on public.workout_plans;
create policy "Users can insert their own workout plans"
    on public.workout_plans for insert
    with check (user_id = auth.uid());

drop policy if exists "Users can update their own workout plans" on public.workout_plans;
create policy "Users can update their own workout plans"
    on public.workout_plans for update
    using (user_id = auth.uid());

drop policy if exists "Users can delete their own workout plans" on public.workout_plans;
create policy "Users can delete their own workout plans"
    on public.workout_plans for delete
    using (user_id = auth.uid());

-- Create workout_logs table
create table if not exists public.workout_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    workout_plan_id uuid references public.workout_plans(id) on delete set null,
    workout_date date not null,
    exercises_completed jsonb,
    duration_minutes integer,
    calories_burned integer,
    notes text,
    created_at timestamp with time zone default now() not null
);

-- Enable Row Level Security for workout_logs
alter table public.workout_logs enable row level security;

drop policy if exists "Users can view their own workout logs" on public.workout_logs;
create policy "Users can view their own workout logs"
    on public.workout_logs for select
    using (user_id = auth.uid());

drop policy if exists "Users can insert their own workout logs" on public.workout_logs;
create policy "Users can insert their own workout logs"
    on public.workout_logs for insert
    with check (user_id = auth.uid());

drop policy if exists "Users can update their own workout logs" on public.workout_logs;
create policy "Users can update their own workout logs"
    on public.workout_logs for update
    using (user_id = auth.uid());

drop policy if exists "Users can delete their own workout logs" on public.workout_logs;
create policy "Users can delete their own workout logs"
    on public.workout_logs for delete
    using (user_id = auth.uid());

-- Create progress_stats table
create table if not exists public.progress_stats (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null unique,
    current_weight numeric,
    body_fat_percentage numeric,
    muscle_mass numeric,
    workouts_completed integer default 0 not null,
    streak_days integer default 0 not null,
    updated_at timestamp with time zone default now() not null
);

-- Enable Row Level Security for progress_stats
alter table public.progress_stats enable row level security;

drop policy if exists "Users can view their own progress stats" on public.progress_stats;
create policy "Users can view their own progress stats"
    on public.progress_stats for select
    using (user_id = auth.uid());

drop policy if exists "Users can insert their own progress stats" on public.progress_stats;
create policy "Users can insert their own progress stats"
    on public.progress_stats for insert
    with check (user_id = auth.uid());

drop policy if exists "Users can update their own progress stats" on public.progress_stats;
create policy "Users can update their own progress stats"
    on public.progress_stats for update
    using (user_id = auth.uid());

drop policy if exists "Users can delete their own progress stats" on public.progress_stats;
create policy "Users can delete their own progress stats"
    on public.progress_stats for delete
    using (user_id = auth.uid());

-- Create trigger function for handling new user signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
    -- Insert new profile
    insert into public.profiles (id)
    values (new.id)
    on conflict (id) do nothing;

    -- Insert new progress stats
    insert into public.progress_stats (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    return new;
end;
$$ language plpgsql security definer;

-- Create trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Create indexes for performance
create index if not exists idx_workout_plans_user_id on public.workout_plans(user_id);
create index if not exists idx_workout_logs_user_id on public.workout_logs(user_id);
create index if not exists idx_workout_logs_workout_plan_id on public.workout_logs(workout_plan_id);
create index if not exists idx_progress_stats_user_id on public.progress_stats(user_id);
