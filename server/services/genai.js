import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const ai = new GoogleGenAI({ apiKey });

class GeminiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'GeminiError';
    this.statusCode = statusCode;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Full plan schema (all weeks in one call) ──────────────────────────────────
const weekSchema = {
  type: 'object',
  properties: {
    week_number: { type: 'integer' },
    week_title:  { type: 'string'  },
    coach_notes: { type: 'string'  },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day_label: { type: 'string' },
          focus:     { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name:         { type: 'string'  },
                sets:         { type: 'integer' },
                reps:         { type: 'string'  },
                rest_seconds: { type: 'integer' },
                equipment:    { type: 'string'  },
                notes:        { type: 'string'  },
              },
              required: ['name', 'sets', 'reps', 'rest_seconds', 'equipment', 'notes'],
            },
          },
        },
        required: ['day_label', 'focus', 'exercises'],
      },
    },
  },
  required: ['week_number', 'week_title', 'coach_notes', 'days'],
};

const fullPlanSchema = {
  type: 'object',
  properties: {
    program_title:       { type: 'string' },
    overall_coach_notes: { type: 'string' },
    weeks: {
      type: 'array',
      items: weekSchema,
    },
  },
  required: ['program_title', 'overall_coach_notes', 'weeks'],
};

// ─── Progression tables ────────────────────────────────────────────────────────
const PROGRESSION = {
  beginner: {
    sets:      [2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4],
    reps:      ['12-15','12-15','10-12','10-12','10-12','10-12','8-10','8-10','8-10','8-12','8-12','10-12'],
    rest:      [90, 90, 90, 75, 75, 75, 60, 60, 60, 60, 60, 75],
    intensity: ['light','light','moderate','moderate','moderate','moderate','moderate-heavy','moderate-heavy','moderate-heavy','moderate-heavy','moderate-heavy','moderate'],
    phase:     ['Foundation','Foundation','Build','Build','Build','Build','Intensify','Intensify','Intensify','Peak','Peak','Deload'],
  },
  intermediate: {
    sets:      [3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 4],
    reps:      ['10-12','10-12','8-10','8-10','8-10','6-8','6-8','6-8','5-7','5-7','5-7','8-10'],
    rest:      [75, 75, 60, 60, 60, 90, 90, 90, 120, 120, 120, 75],
    intensity: ['moderate','moderate','moderate-heavy','moderate-heavy','heavy','heavy','heavy','heavy','max','max','max','moderate'],
    phase:     ['Activation','Activation','Volume','Volume','Volume','Strength','Strength','Strength','Peak Power','Peak Power','Peak Power','Deload'],
  },
  advanced: {
    sets:      [4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3],
    reps:      ['8-10','8-10','6-8','6-8','5-6','5-6','4-5','4-5','3-4','3-4','1-3','8-10'],
    rest:      [60, 60, 90, 90, 120, 120, 150, 150, 180, 180, 180, 60],
    intensity: ['moderate-heavy','moderate-heavy','heavy','heavy','heavy','max','max','max','peak','peak','peak','light'],
    phase:     ['Prep','Prep','Hypertrophy','Hypertrophy','Hypertrophy','Strength','Strength','Power','Peaking','Peaking','Max Effort','Deload'],
  },
};

function buildProgressionGuide(experience_level, totalWeeks, weekOffset = 0) {
  const table = PROGRESSION[experience_level] || PROGRESSION.beginner;
  // We need to map these weeks relative to the full program length
  // weekOffset tells us where in the full program these weeks fall
  return Array.from({ length: totalWeeks }, (_, i) => {
    const absoluteWeek = weekOffset + i;
    const scaledIdx = Math.min(Math.floor((absoluteWeek / (weekOffset + totalWeeks)) * 12), 11);
    return `Week ${weekOffset + i + 1}: ${table.phase[scaledIdx]} — ${table.sets[scaledIdx]} sets × ${table.reps[scaledIdx]} reps, rest ${table.rest[scaledIdx]}s, intensity ${table.intensity[scaledIdx]}`;
  }).join('\n');
}

function buildFullPlanPrompt({ goal, experience_level, equipment, days_per_week, duration_weeks, injuries_notes, extra_suggestions, weekOffset = 0, previousSummary = null }) {
  const goalLabels = {
    lose_weight: 'Fat Loss', build_muscle: 'Muscle Building',
    strength: 'Strength', endurance: 'Endurance', general_fitness: 'General Fitness',
  };

  const progressionGuide = buildProgressionGuide(experience_level, duration_weeks, weekOffset);
  const extraLine = extra_suggestions?.trim()
    ? `\nUser preferences: ${extra_suggestions.trim()}`
    : '';

  const continuationLine = previousSummary
    ? `\nThis is the SECOND HALF of the program. The first half ended at: ${previousSummary}. Continue progressing from there.`
    : '';

  const weekStart = weekOffset + 1;
  const weekEnd = weekOffset + duration_weeks;

  return `You are a certified fitness coach. Generate weeks ${weekStart} to ${weekEnd} of a ${experience_level} ${goalLabels[goal]} workout program.

Goal: ${goal} | Equipment: ${equipment.join(', ') || 'bodyweight'} | Days/week: ${days_per_week} | Limitations: ${injuries_notes || 'none'}${extraLine}${continuationLine}

PROGRESSION GUIDE (follow exactly):
${progressionGuide}

Rules:
- Generate exactly ${duration_weeks} weeks (weeks ${weekStart}-${weekEnd})
- Each week must have exactly ${days_per_week} days
- Increase difficulty week over week following the progression guide
- coach_notes for each week must explain what changed from previous week
- Return ONLY valid JSON matching the schema exactly`;
}

// ─── Retry wrapper ─────────────────────────────────────────────────────────────
async function generateWithRetry(prompt, schema) {
  function parseRetryDelay(errMsg) {
    const match = errMsg?.match(/retry in (\d+(?:\.\d+)?)s/i);
    if (match) return Math.ceil(parseFloat(match[1])) * 1000;
    return null;
  }

  function isDailyQuota(errMsg) {
    return errMsg?.includes('RequestsPerDay') || errMsg?.includes('free_tier_requests');
  }

  const MAX_ATTEMPTS = 3;
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
      return JSON.parse(response.text);
    } catch (err) {
      lastError = err;
      const msg = err.message || '';
      console.error(`Attempt ${attempt} failed: ${msg.slice(0, 120)}`);

      if (msg.includes('API_KEY_INVALID') || msg.includes('UNAUTHENTICATED')) break;
      if ((msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) && isDailyQuota(msg)) break;
      if (attempt === MAX_ATTEMPTS) break;

      let waitMs;
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        waitMs = parseRetryDelay(msg) ?? Math.min(10000 * 2 ** (attempt - 1), 60000);
      } else {
        waitMs = 3000 * attempt;
      }
      console.log(`Waiting ${(waitMs / 1000).toFixed(0)}s before retry ${attempt + 1}...`);
      await sleep(waitMs);
    }
  }

  const msg = lastError?.message || '';
  if (msg.includes('API_KEY_INVALID') || msg.includes('UNAUTHENTICATED'))
    throw new GeminiError('The AI service API key is invalid or missing.', 500);
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    if (isDailyQuota(msg))
      throw new GeminiError(
        'Daily AI quota reached. Please try again tomorrow, or use a different Gemini model.',
        429
      );
    throw new GeminiError('The AI service is rate-limited. Please wait a minute and try again.', 429);
  }
  throw new GeminiError(`Failed to generate plan: ${msg}`, 503);
}

// ─── Public export ─────────────────────────────────────────────────────────────
export async function generateWorkoutPlan({
  goal,
  experience_level,
  equipment,
  days_per_week,
  duration_weeks,
  injuries_notes,
  extra_suggestions,
  onProgress,
}) {
  const totalWeeks = duration_weeks || 4;

  const goalLabels = {
    lose_weight: 'Fat Loss', build_muscle: 'Muscle Building',
    strength: 'Strength', endurance: 'Endurance', general_fitness: 'General Fitness',
  };

  // Estimate if we need to split the generation into two calls.
  // Large plans (many weeks × many days) can exceed Gemini's output token limit.
  // Threshold: if weeks × days_per_week > 20, split into two halves.
  const needsSplit = totalWeeks * days_per_week > 20;

  console.log(`Generating ${totalWeeks}-week ${experience_level} ${goalLabels[goal]} plan (${needsSplit ? '2 calls' : '1 call'})...`);

  onProgress?.(0, totalWeeks);

  let allWeeks = [];

  if (!needsSplit) {
    // ── Single call ────────────────────────────────────────────────────────────
    const prompt = buildFullPlanPrompt({
      goal, experience_level, equipment, days_per_week,
      duration_weeks: totalWeeks, injuries_notes, extra_suggestions,
    });
    const plan = await generateWithRetry(prompt, fullPlanSchema);
    allWeeks = plan.weeks || [];
  } else {
    // ── Two-call split ─────────────────────────────────────────────────────────
    const half1 = Math.ceil(totalWeeks / 2);
    const half2 = totalWeeks - half1;

    // First half
    console.log(`  → Weeks 1-${half1}`);
    const prompt1 = buildFullPlanPrompt({
      goal, experience_level, equipment, days_per_week,
      duration_weeks: half1, injuries_notes, extra_suggestions,
      weekOffset: 0,
    });
    const plan1 = await generateWithRetry(prompt1, fullPlanSchema);
    allWeeks.push(...(plan1.weeks || []));
    onProgress?.(half1, totalWeeks);

    // Brief pause to avoid RPM limits
    await sleep(2000);

    // Second half — give context about what came before
    console.log(`  → Weeks ${half1 + 1}-${totalWeeks}`);
    const lastWeek = allWeeks[allWeeks.length - 1];
    const previousSummary = lastWeek?.days?.[0]?.exercises?.[0]
      ? `${lastWeek.days[0].exercises[0].sets} sets × ${lastWeek.days[0].exercises[0].reps} of ${lastWeek.days[0].exercises[0].name}`
      : `week ${half1} completed`;

    const prompt2 = buildFullPlanPrompt({
      goal, experience_level, equipment, days_per_week,
      duration_weeks: half2, injuries_notes, extra_suggestions,
      weekOffset: half1,
      previousSummary,
    });
    const plan2 = await generateWithRetry(prompt2, fullPlanSchema);
    allWeeks.push(...(plan2.weeks || []));
  }

  // Ensure week numbers are sequential regardless of split
  allWeeks = allWeeks.map((week, i) => ({ ...week, week_number: i + 1 }));

  onProgress?.(totalWeeks, totalWeeks);

  return {
    program_title: `${totalWeeks}-Week ${goalLabels[goal] || 'Fitness'} Program`,
    overall_coach_notes: `A ${totalWeeks}-week progressive ${goalLabels[goal] || 'fitness'} program for ${experience_level} athletes.`,
    weeks: allWeeks,
  };
}
