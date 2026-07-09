import express from 'express';
import { z } from 'zod';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

const ExerciseCompletedSchema = z.object({
  name: z.string().min(1),
  sets_completed: z.number().int().min(1),
  reps_completed: z.array(z.number().int().min(0)).nonempty(),
  weight: z.number().min(0),
});

const CreateLogSchema = z.object({
  plan_id: z.string().uuid(),
  day_label: z.string().min(1),
  exercises_completed: z.array(ExerciseCompletedSchema).nonempty(),
  duration_minutes: z.number().int().min(1),
  notes: z.string().optional(),
});

router.post('/', verifyAuth, asyncHandler(async (req, res) => {
  const validation = CreateLogSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.flatten().fieldErrors,
    });
  }

  const { plan_id, day_label, exercises_completed, duration_minutes, notes } = validation.data;
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  // Check if plan exists for user
  const { data: plan, error: planError } = await supabase
    .from('workout_plans')
    .select('id')
    .eq('id', plan_id)
    .eq('user_id', userId)
    .single();

  if (planError || !plan) {
    return res.status(404).json({ error: 'Workout plan not found' });
  }

  // Insert workout log
  const { data: log, error: logError } = await supabase
    .from('workout_logs')
    .insert({
      user_id: userId,
      workout_plan_id: plan_id,
      day_label,
      workout_date: today,
      exercises_completed,
      duration_minutes,
      notes,
    })
    .select()
    .single();

  if (logError) {
    console.error('Log insert error:', logError);
    return res.status(500).json({ error: 'Failed to save workout log' });
  }

  // Get current progress stats
  let stats;
  const { data: existingStats, error: statsError } = await supabase
    .from('progress_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (statsError) {
    // PGRST116 = no row — shouldn't happen (trigger creates it on signup) but handle gracefully
    if (statsError.code === 'PGRST116') {
      const { error: insertError } = await supabase
        .from('progress_stats')
        .insert({ user_id: userId, total_workouts: 0, current_streak: 0, longest_streak: 0 });

      if (insertError) {
        console.error('Stats insert error:', insertError);
        return res.status(500).json({ error: 'Failed to initialise progress stats' });
      }

      const { data: newStats, error: refetchError } = await supabase
        .from('progress_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (refetchError || !newStats) {
        return res.status(500).json({ error: 'Failed to fetch progress stats' });
      }

      stats = newStats;
    } else {
      console.error('Stats fetch error:', statsError);
      return res.status(500).json({ error: 'Failed to update progress' });
    }
  } else {
    stats = existingStats;
  }

  // Calculate new stats
  const newTotalWorkouts = stats.total_workouts + 1;
  let newCurrentStreak = stats.current_streak;
  let newLongestStreak = stats.longest_streak;
  let newLastWorkoutDate = stats.last_workout_date;

  if (!newLastWorkoutDate) {
    // First workout ever
    newCurrentStreak = 1;
  } else {
    const lastDate = new Date(newLastWorkoutDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day — do not change streak
    } else if (diffDays === 1) {
      // Consecutive day
      newCurrentStreak += 1;
    } else {
      // Missed days, reset streak
      newCurrentStreak = 1;
    }
  }

  if (newCurrentStreak > newLongestStreak) {
    newLongestStreak = newCurrentStreak;
  }

  newLastWorkoutDate = today;

  // Update progress stats
  const { error: updateStatsError } = await supabase
    .from('progress_stats')
    .update({
      total_workouts: newTotalWorkouts,
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_workout_date: newLastWorkoutDate,
    })
    .eq('user_id', userId);

  if (updateStatsError) {
    console.error('Stats update error:', updateStatsError);
    return res.status(500).json({ error: 'Failed to update progress stats' });
  }

  res.json(log);
}));

export default router;
