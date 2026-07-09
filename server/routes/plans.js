import express from 'express';
import { z } from 'zod';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { generateWorkoutPlan } from '../services/genai.js';
import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { generatePlanLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Recalculate and persist progress_stats for a user from their workout_logs. */
async function recalculateStats(userId) {
  const { data: logs, error } = await supabase
    .from('workout_logs')
    .select('workout_date')
    .eq('user_id', userId)
    .order('workout_date', { ascending: true });

  if (error) throw error;

  const totalWorkouts = logs.length;
  let currentStreak = 0;
  let longestStreak = 0;
  let lastWorkoutDate = null;

  if (logs.length > 0) {
    lastWorkoutDate = logs[logs.length - 1].workout_date;
    let streak = 1;
    longestStreak = 1;

    for (let i = 1; i < logs.length; i++) {
      const prev = new Date(logs[i - 1].workout_date);
      const curr = new Date(logs[i].workout_date);
      const diffDays = Math.floor((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        // same day — no change
      } else if (diffDays === 1) {
        streak += 1;
      } else {
        streak = 1;
      }
      if (streak > longestStreak) longestStreak = streak;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const last = new Date(lastWorkoutDate);
    const diffFromToday = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    currentStreak = diffFromToday <= 1 ? streak : 0;
  }

  const { error: statsErr } = await supabase
    .from('progress_stats')
    .update({ total_workouts: totalWorkouts, current_streak: currentStreak, longest_streak: longestStreak, last_workout_date: lastWorkoutDate })
    .eq('user_id', userId);

  if (statsErr) throw statsErr;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

router.get('/me', verifyAuth, (req, res) => {
  res.json({ userId: req.user.id });
});

// GET /plans/active — fetch the single active plan
router.get('/active', verifyAuth, asyncHandler(async (req, res) => {
  const { data: plan, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'No active plan found' });
    console.error('Fetch active plan error:', error);
    return res.status(500).json({ error: 'Failed to fetch active plan' });
  }
  res.json(plan);
}));

// GET /plans/all — list all plans (active + archived) for the user, newest first
router.get('/all', verifyAuth, asyncHandler(async (req, res) => {
  const { data: plans, error } = await supabase
    .from('workout_plans')
    .select('id, title, goal, duration_weeks, is_active, created_at, archived_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch all plans error:', error);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
  res.json(plans);
}));

// GET /plans/:id — fetch a specific plan (active or archived, must belong to user)
router.get('/:id', verifyAuth, asyncHandler(async (req, res) => {
  const { data: plan, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
}));

// PATCH /plans/:id/restore — archive current active plan, restore this one as active
router.patch('/:id/restore', verifyAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const planId = req.params.id;

  // Verify the plan belongs to this user
  const { data: plan, error: planErr } = await supabase
    .from('workout_plans')
    .select('id, is_active')
    .eq('id', planId)
    .eq('user_id', userId)
    .single();

  if (planErr || !plan) return res.status(404).json({ error: 'Plan not found' });
  if (plan.is_active) return res.status(400).json({ error: 'Plan is already active' });

  // Archive current active plan
  const { error: archiveErr } = await supabase
    .from('workout_plans')
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (archiveErr) {
    console.error('Archive plan error:', archiveErr);
    return res.status(500).json({ error: 'Failed to archive current plan' });
  }

  // Restore the requested plan
  const { data: restored, error: restoreErr } = await supabase
    .from('workout_plans')
    .update({ is_active: true, archived_at: null })
    .eq('id', planId)
    .eq('user_id', userId)
    .select()
    .single();

  if (restoreErr) {
    console.error('Restore plan error:', restoreErr);
    return res.status(500).json({ error: 'Failed to restore plan' });
  }

  res.json(restored);
}));

// POST /plans/generate — generate a new plan, archive the existing active one
const GeneratePlanSchema = z.object({
  goal: z.enum(['lose_weight', 'build_muscle', 'strength', 'endurance', 'general_fitness']),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  equipment: z.array(z.string()).min(1, 'Select at least one piece of equipment'),
  days_per_week: z.number().int().min(1).max(7),
  duration_weeks: z.number().int().min(1).max(12).default(4),
  injuries_notes: z.string().optional(),
  extra_suggestions: z.string().max(500).optional(),
});

router.post('/generate', verifyAuth, generatePlanLimiter, asyncHandler(async (req, res) => {
  const validation = GeneratePlanSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Validation failed', details: validation.error.flatten().fieldErrors });
  }

  const { goal, experience_level, equipment, days_per_week, duration_weeks, injuries_notes, extra_suggestions } = validation.data;
  const userId = req.user.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // Upsert user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId, goal, experience_level, equipment, injuries_notes }, { onConflict: 'id' });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      send({ type: 'error', error: 'Failed to update profile' });
      return res.end();
    }

    send({ type: 'status', message: 'Initializing AI coach...' });

    const workoutPlanData = await generateWorkoutPlan({
      goal, experience_level, equipment, days_per_week, duration_weeks, injuries_notes, extra_suggestions,
      onProgress: (completedWeek, totalWeeks) => {
        send({ type: 'progress', completedWeek, totalWeeks });
      },
    });

    send({ type: 'status', message: 'Saving protocol...' });

    // Archive current active plan (set archived_at timestamp)
    const { error: archiveError } = await supabase
      .from('workout_plans')
      .update({ is_active: false, archived_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (archiveError) {
      console.error('Archive plan error:', archiveError);
      send({ type: 'error', error: 'Failed to archive existing plan' });
      return res.end();
    }

    // Insert new active plan
    const { data: savedPlan, error: insertError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        title: workoutPlanData.program_title,
        goal,
        duration_weeks,
        plan_json: workoutPlanData,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert plan error:', insertError);
      send({ type: 'error', error: 'Failed to save workout plan' });
      return res.end();
    }

    send({ type: 'done', plan: savedPlan });
    res.end();
  } catch (err) {
    console.error('Generate plan error:', err);
    send({ type: 'error', error: err.message || 'Failed to generate plan' });
    res.end();
  }
}));

// DELETE /plans/:id — permanently delete a plan and its logs, recalculate stats
router.delete('/:id', verifyAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const planId = req.params.id;

  const { data: plan, error: planError } = await supabase
    .from('workout_plans')
    .select('id, is_active')
    .eq('id', planId)
    .eq('user_id', userId)
    .single();

  if (planError || !plan) return res.status(404).json({ error: 'Workout plan not found' });

  // Delete logs tied to this plan
  const { error: logsDeleteError } = await supabase
    .from('workout_logs')
    .delete()
    .eq('workout_plan_id', planId)
    .eq('user_id', userId);

  if (logsDeleteError) {
    console.error('Logs delete error:', logsDeleteError);
    return res.status(500).json({ error: 'Failed to delete workout logs' });
  }

  // Delete the plan
  const { error: planDeleteError } = await supabase
    .from('workout_plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', userId);

  if (planDeleteError) {
    console.error('Plan delete error:', planDeleteError);
    return res.status(500).json({ error: 'Failed to delete workout plan' });
  }

  // Recalculate stats
  try {
    await recalculateStats(userId);
  } catch (statsErr) {
    console.error('Stats recalc error:', statsErr);
    return res.status(500).json({ error: 'Failed to update progress stats' });
  }

  res.json({ success: true, wasActive: plan.is_active });
}));

export default router;
