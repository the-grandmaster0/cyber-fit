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

const singleWeekSchema = {
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

function getWeekProgression(experience_level, weekNumber, totalWeeks) {
  const table = PROGRESSION[experience_level] || PROGRESSION.beginner;
  const scaledIdx = Math.min(Math.floor(((weekNumber - 1) / totalWeeks) * 12), 11);
  return {
    sets:      table.sets[scaledIdx],
    reps:      table.reps[scaledIdx],
    rest:      table.rest[scaledIdx],
    intensity: table.intensity[scaledIdx],
    phase:     table.phase[scaledIdx],
  };
}

function buildWeekPrompt({ weekNumber, totalWeeks, previousWeekSummary, context }) {
  const { goal, experience_level, equipment, days_per_week, injuries_notes, extra_suggestions } = context;
  const prog = getWeekProgression(experience_level, weekNumber, totalWeeks);

  const instructions = (() => {
    if (weekNumber === 1) {
      return `WEEK 1 — ${prog.phase} phase.
Establish baseline movements. ${prog.sets} sets × ${prog.reps} reps. Rest ${prog.rest}s. Intensity: ${prog.intensity}. Form over weight.`;
    }
    if (prog.phase === 'Deload') {
      return `WEEK ${weekNumber} — DELOAD. Drop to ${prog.sets} sets × ${prog.reps} reps, rest ${prog.rest}s, lighter weight. Active recovery. Previous: ${previousWeekSummary || 'high intensity'}.`;
    }
    return `WEEK ${weekNumber}/${totalWeeks} — ${prog.phase} phase. MUST be harder than last week.
Previous: ${previousWeekSummary || 'standard volume'}.
This week: ${prog.sets} sets × ${prog.reps} reps, rest ${prog.rest}s, intensity ${prog.intensity}.
Same core exercises, increase load/volume. coach_notes must state what increased.`;
  })();

  const extraLine = extra_suggestions?.trim()
    ? `\nUser preferences (incorporate where appropriate): ${extra_suggestions.trim()}`
    : '';

  return `Certified fitness coach. Generate ONLY Week ${weekNumber} of a ${totalWeeks}-week ${experience_level} program.
Goal: ${goal} | Equipment: ${equipment.join(', ') || 'bodyweight'} | Days/week: ${days_per_week} | Limits: ${injuries_notes || 'none'}${extraLine}
${instructions}
Output exactly ${days_per_week} days. Return ONLY valid JSON.`;
}

async function generateWeekWithRetry({ weekNumber, totalWeeks, previousWeekSummary, context }) {
  const prompt = buildWeekPrompt({ weekNumber, totalWeeks, previousWeekSummary, context });

  const attempt = async () => {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: singleWeekSchema },
    });
    const parsed = JSON.parse(response.text);
    parsed.week_number = weekNumber;
    return parsed;
  };

  // Parse the retryDelay seconds from a Gemini 429 error message if present.
  // e.g. "Please retry in 34.997911452s." → 35000 ms
  function parseRetryDelay(errMsg) {
    const match = errMsg?.match(/retry in (\d+(?:\.\d+)?)s/i);
    if (match) return Math.ceil(parseFloat(match[1])) * 1000;
    return null;
  }

  // Check if this is a per-day quota exhaustion (not retryable today)
  function isDailyQuota(errMsg) {
    return errMsg?.includes('RequestsPerDay') || errMsg?.includes('free_tier_requests');
  }

  // Attempt up to 4 times with exponential back-off, honoring API retryDelay hints
  const MAX_ATTEMPTS = 4;
  let lastError;

  for (let attempt_n = 1; attempt_n <= MAX_ATTEMPTS; attempt_n++) {
    try {
      return await attempt();
    } catch (err) {
      lastError = err;
      const msg = err.message || '';
      console.error(`  Week ${weekNumber} attempt ${attempt_n} failed: ${msg.slice(0, 120)}`);

      // Hard failures — never retry
      if (msg.includes('API_KEY_INVALID') || msg.includes('UNAUTHENTICATED')) break;

      // Daily quota exhausted — no point retrying
      if ((msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) && isDailyQuota(msg)) break;

      if (attempt_n === MAX_ATTEMPTS) break;

      // For rate-limit (RPM) 429s: honor the retryDelay the API tells us
      let waitMs;
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        waitMs = parseRetryDelay(msg) ?? Math.min(10000 * 2 ** (attempt_n - 1), 90000);
      } else {
        // Generic error — shorter exponential back-off
        waitMs = 3000 * attempt_n;
      }

      console.log(`  Week ${weekNumber} — waiting ${(waitMs / 1000).toFixed(0)}s before retry ${attempt_n + 1}...`);
      await sleep(waitMs);
    }
  }

  const msg = lastError?.message || '';
  if (msg.includes('API_KEY_INVALID') || msg.includes('UNAUTHENTICATED'))
    throw new GeminiError('The AI service API key is invalid or missing.', 500);
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    if (isDailyQuota(msg))
      throw new GeminiError(
        'Daily AI quota reached. The free tier allows 1500 requests/day on gemini-2.0-flash. Please try again tomorrow, or set GEMINI_MODEL=gemini-2.0-flash-lite in your server .env for a lighter model.',
        429
      );
    throw new GeminiError('The AI service is rate-limited. Please wait a minute and try again.', 429);
  }
  throw new GeminiError(`Failed to generate week ${weekNumber}: ${msg}`, 503);
}

// ─── Public export ─────────────────────────────────────────────────────────────
// onProgress(weekNumber, totalWeeks) — optional callback for SSE streaming

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
  const context = { goal, experience_level, equipment, days_per_week, injuries_notes, extra_suggestions };

  const goalLabels = {
    lose_weight: 'Fat Loss', build_muscle: 'Muscle Building',
    strength: 'Strength', endurance: 'Endurance', general_fitness: 'General Fitness',
  };

  console.log(`Generating ${totalWeeks}-week ${experience_level} ${goalLabels[goal]} plan...`);

  // Free-tier RPM is 10 req/min on gemini-2.0-flash.
  // Batch size 2 + 4s stagger + 8s inter-batch pause keeps us safely under.
  const BATCH_SIZE = 2;
  const weeks = new Array(totalWeeks);

  // Week 1 — generate alone first (establishes the baseline summary)
  console.log(`  → Week 1/${totalWeeks}`);
  weeks[0] = await generateWeekWithRetry({ weekNumber: 1, totalWeeks, previousWeekSummary: null, context });
  onProgress?.(1, totalWeeks);

  // Remaining weeks in parallel batches of BATCH_SIZE
  // Each batch uses week 1's summary as the "previous" anchor
  // (not perfect for later weeks but keeps it fast; progression is enforced by the prompt tables)
  const sampleEx0 = weeks[0].days?.[0]?.exercises?.[0];
  const week1Summary = sampleEx0
    ? `${sampleEx0.sets} sets × ${sampleEx0.reps} ${sampleEx0.name}`
    : weeks[0].week_title;

  for (let batchStart = 2; batchStart <= totalWeeks; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, totalWeeks);
    const batchNums = [];
    for (let w = batchStart; w <= batchEnd; w++) batchNums.push(w);

    console.log(`  → Weeks ${batchNums.join(', ')}/${totalWeeks} (parallel)`);

    // Small stagger within batch so requests don't all fire at exactly the same ms
    const batchResults = await Promise.all(
      batchNums.map((weekNum, i) =>
        sleep(i * 1500).then(() =>
          generateWeekWithRetry({
            weekNumber: weekNum,
            totalWeeks,
            previousWeekSummary: weekNum === 2 ? week1Summary : `${goalLabels[goal]} week ${weekNum - 1}`,
            context,
          })
        )
      )
    );

    batchResults.forEach((week, i) => {
      weeks[batchStart - 1 + i] = week;
      onProgress?.(batchStart + i, totalWeeks);
    });

    // Pause between batches to stay under RPM limits
    if (batchEnd < totalWeeks) await sleep(8000);
  }

  return {
    program_title: `${totalWeeks}-Week ${goalLabels[goal] || 'Fitness'} Program`,
    overall_coach_notes: `A ${totalWeeks}-week progressive ${goalLabels[goal] || 'fitness'} program for ${experience_level} athletes. Volume and intensity increase each week with structured periodisation${totalWeeks >= 8 ? ', ending with a deload week' : ''}.`,
    weeks,
  };
}
