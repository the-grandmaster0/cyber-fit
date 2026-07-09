
import express from 'express';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

router.get('/', verifyAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get progress stats
  const { data: stats, error: statsError } = await supabase
    .from('progress_stats')
    .select('current_streak, longest_streak, total_workouts')
    .eq('user_id', userId)
    .single();

  if (statsError) {
    // PGRST116 = no row yet — return zeroed stats rather than a 500
    if (statsError.code === 'PGRST116') {
      return res.json({
        current_streak: 0,
        longest_streak: 0,
        total_workouts: 0,
        weekly_volume: [],
        consistency_last_30_days: [],
      });
    }
    console.error('Stats fetch error:', statsError);
    return res.status(500).json({ error: 'Failed to fetch progress' });
  }

  // Get workout logs for calculating weekly volume and consistency
  const { data: logs, error: logsError } = await supabase
    .from('workout_logs')
    .select('workout_date, exercises_completed')
    .eq('user_id', userId)
    .order('workout_date', { ascending: true });

  if (logsError) {
    console.error('Logs fetch error:', logsError);
    return res.status(500).json({ error: 'Failed to fetch workout logs' });
  }

  // Calculate weekly volume
  const weeklyVolumeMap = new Map();

  logs.forEach((log) => {
    if (!log.exercises_completed) return;

    // Get week start (Monday) without mutating the original date object
    const date = new Date(log.workout_date);
    const day = date.getUTCDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() + diffToMonday);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    let totalWeight = 0;
    log.exercises_completed.forEach((exercise) => {
      const { reps_completed, weight } = exercise;
      if (Array.isArray(reps_completed)) {
        const totalReps = reps_completed.reduce((a, b) => a + b, 0);
        totalWeight += weight * totalReps;
      }
    });

    weeklyVolumeMap.set(weekStartStr, (weeklyVolumeMap.get(weekStartStr) || 0) + totalWeight);
  });

  const weeklyVolume = Array.from(weeklyVolumeMap.entries()).map(([week_start, total_weight_lifted]) => ({
    week_start,
    total_weight_lifted,
  }));

  // Calculate consistency last 30 days — use UTC to match Supabase date strings
  const consistency = [];
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const workoutDatesSet = new Set(logs.map((log) => log.workout_date));

  for (let i = 29; i >= 0; i--) {
    const date = new Date(todayUTC);
    date.setUTCDate(todayUTC.getUTCDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    consistency.push({
      date: dateStr,
      completed: workoutDatesSet.has(dateStr),
    });
  }

  res.json({
    current_streak: stats.current_streak || 0,
    longest_streak: stats.longest_streak || 0,
    total_workouts: stats.total_workouts || 0,
    weekly_volume: weeklyVolume,
    consistency_last_30_days: consistency,
  });
}));

export default router;
