import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth.js';
import { AsyncButton } from '../components/AsyncButton.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { supabase } from '../lib/supabaseClient.js';
import api from '../lib/axios.js';

const GeneratePlanSchema = z.object({
  goal: z.enum(['lose_weight', 'build_muscle', 'strength', 'endurance', 'general_fitness']),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  equipment: z.array(z.string()).min(1, 'Select at least one equipment option'),
  days_per_week: z.number().int().min(1).max(7),
  duration_weeks: z.number().int().min(1).max(12),
  injuries_notes: z.string().optional(),
  extra_suggestions: z.string().optional(),
});

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function GeneratePlan() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [formData, setFormData] = useState({
    goal: 'general_fitness',
    experience_level: 'beginner',
    equipment: ['bodyweight'],
    days_per_week: 3,
    duration_weeks: 4,
    injuries_notes: '',
    extra_suggestions: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [generalError, setGeneralError] = useState(null);

  // Active plan warning
  const [activePlan, setActivePlan] = useState(null);
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [pendingValidation, setPendingValidation] = useState(null);

  // Check for existing active plan on mount
  useEffect(() => {
    api.get('/plans/active')
      .then((res) => setActivePlan(res.data))
      .catch(() => setActivePlan(null));
  }, []);

  // Progress state
  const [statusMessage, setStatusMessage] = useState('');
  const [weeksCompleted, setWeeksCompleted] = useState(0);
  const [totalWeeks, setTotalWeeks] = useState(0);

  const equipmentOptions = [
    'bodyweight', 'dumbbells', 'barbell', 'kettlebells',
    'resistance bands', 'pull-up bar', 'bench', 'gym machines',
  ];

  const handleEquipmentToggle = (equipment) => {
    setFormData((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(equipment)
        ? prev.equipment.filter((e) => e !== equipment)
        : [...prev.equipment, equipment],
    }));
    if (errors) setErrors(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors(null);
    setGeneralError(null);

    const validation = GeneratePlanSchema.safeParse({
      ...formData,
      days_per_week: Number(formData.days_per_week),
      duration_weeks: Number(formData.duration_weeks),
    });

    if (!validation.success) {
      setErrors(validation.error.flatten().fieldErrors);
      return;
    }

    // If there's already an active plan, show the archive warning first
    if (activePlan && !showArchiveWarning) {
      setPendingValidation(validation);
      setShowArchiveWarning(true);
      return;
    }

    await runGeneration(validation);
  };

  const runGeneration = async (validation) => {
    setShowArchiveWarning(false);
    setPendingValidation(null);
    setLoading(true);
    setWeeksCompleted(0);
    setTotalWeeks(formData.duration_weeks);
    setStatusMessage('Connecting to AI coach...');

    try {
      // Get auth token for the SSE request
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      // Use fetch for SSE — EventSource doesn't support POST + auth headers
      const response = await fetch(`${BASE_URL}/api/plans/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${response.status}`);
      }

      // Read the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            // Non-JSON line — skip
            continue;
          }

          if (event.type === 'status') {
            setStatusMessage(event.message);
          } else if (event.type === 'progress') {
            setWeeksCompleted(event.completedWeek);
            setTotalWeeks(event.totalWeeks);
            setStatusMessage(`Week ${event.completedWeek} of ${event.totalWeeks} generated...`);
          } else if (event.type === 'done') {
            setStatusMessage('Protocol ready!');
            navigate('/plan', { replace: true });
            return;
          } else if (event.type === 'error') {
            throw new Error(event.error);
          }
        }
      }
    } catch (err) {
      setGeneralError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setStatusMessage('');
      setWeeksCompleted(0);
    }
  }; // end runGeneration

  const progressPct = totalWeeks > 0 ? Math.round((weeksCompleted / totalWeeks) * 100) : 0;

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid relative">
      <div className="scanline animate-scanline"></div>

      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16 relative z-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 sm:mb-4 text-cyber-cyan-400 font-sans">
          INITIALIZE WORKOUT PROTOCOL
        </h1>
        <p className="text-center text-gray-400 mb-8 sm:mb-10 max-w-xl mx-auto text-xs sm:text-sm md:text-base font-mono">
          &gt; Configure parameters for neural network plan generation.
        </p>

        {/* ── Loading overlay ── */}
        {loading && (
          <div className="cyber-card bg-cyber-dark border-2 border-cyber-cyan-600/50 p-6 sm:p-8 mb-6 text-center">
            <div className="text-3xl sm:text-4xl mb-4 animate-pulse">⚙️</div>
            <p className="text-cyber-cyan-400 font-mono font-semibold text-sm sm:text-base mb-2">
              GENERATING PROTOCOL...
            </p>
            <p className="text-gray-400 font-mono text-xs sm:text-sm mb-5">
              {statusMessage || 'Please wait, this takes a moment...'}
            </p>

            {/* Progress bar */}
            {totalWeeks > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-xs font-mono text-gray-500 mb-2">
                  <span>WEEKS GENERATED</span>
                  <span>{weeksCompleted} / {totalWeeks}</span>
                </div>
                <div className="w-full h-3 bg-cyber-darker border border-cyber-purple-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-500 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex gap-1.5 mt-3 justify-center">
                  {Array.from({ length: totalWeeks }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full transition-all duration-300 ${
                        i < weeksCompleted
                          ? 'bg-cyber-cyan-400 scale-110'
                          : 'bg-cyber-purple-900 border border-cyber-purple-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <p className="text-gray-600 font-mono text-xs mt-4">
              DO NOT REFRESH — generation continues automatically
            </p>
          </div>
        )}

        {generalError && (
          <div className="bg-cyber-red-500/20 border border-cyber-red-500 text-cyber-red-300 px-4 sm:px-5 py-3 mb-6 text-xs sm:text-sm md:text-base font-mono">
            ERROR: {generalError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`cyber-card bg-cyber-dark p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 md:space-y-8 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {/* PRIMARY OBJECTIVE */}
          <div>
            <label className="block text-xs sm:text-sm md:text-base font-semibold text-cyber-cyan-300 mb-2 sm:mb-3 font-mono">
              PRIMARY OBJECTIVE:
            </label>
            <select
              value={formData.goal}
              onChange={(e) => { setFormData({ ...formData, goal: e.target.value }); if (errors) setErrors(null); }}
              className={`w-full px-4 sm:px-5 py-3 bg-cyber-darker border-2 text-cyber-cyan-100 focus:shadow-cyan-glow outline-none transition-all text-xs sm:text-sm md:text-base font-mono ${errors?.goal ? 'border-cyber-red-500' : 'border-cyber-purple-700 focus:border-cyber-cyan-500'}`}
            >
              <option value="lose_weight">FAT LOSS</option>
              <option value="build_muscle">MUSCLE HYPERTROPHY</option>
              <option value="strength">MAX STRENGTH</option>
              <option value="endurance">ENDURANCE</option>
              <option value="general_fitness">GENERAL FITNESS</option>
            </select>
            {errors?.goal && <p className="text-cyber-red-400 text-xs sm:text-sm mt-2 font-mono">{errors.goal[0]}</p>}
          </div>

          {/* EXPERIENCE LEVEL */}
          <div>
            <label className="block text-xs sm:text-sm md:text-base font-semibold text-cyber-cyan-300 mb-2 sm:mb-3 font-mono">
              EXPERIENCE LEVEL:
            </label>
            <select
              value={formData.experience_level}
              onChange={(e) => { setFormData({ ...formData, experience_level: e.target.value }); if (errors) setErrors(null); }}
              className={`w-full px-4 sm:px-5 py-3 bg-cyber-darker border-2 text-cyber-cyan-100 focus:shadow-cyan-glow outline-none transition-all text-xs sm:text-sm md:text-base font-mono ${errors?.experience_level ? 'border-cyber-red-500' : 'border-cyber-purple-700 focus:border-cyber-cyan-500'}`}
            >
              <option value="beginner">ROOKIE (0-6 MONTHS)</option>
              <option value="intermediate">OPERATIVE (6-24 MONTHS)</option>
              <option value="advanced">ELITE (2+ YEARS)</option>
            </select>
            {errors?.experience_level && <p className="text-cyber-red-400 text-xs sm:text-sm mt-2 font-mono">{errors.experience_level[0]}</p>}
          </div>

          {/* DAYS PER WEEK */}
          <div>
            <label className="block text-xs sm:text-sm md:text-base font-semibold text-cyber-cyan-300 mb-2 sm:mb-3 font-mono">
              DAYS PER WEEK:
            </label>
            <input
              type="number" min="1" max="7"
              value={formData.days_per_week}
              onChange={(e) => { setFormData({ ...formData, days_per_week: parseInt(e.target.value) || 1 }); if (errors) setErrors(null); }}
              className={`w-full px-4 sm:px-5 py-3 bg-cyber-darker border-2 text-cyber-cyan-100 focus:shadow-cyan-glow outline-none transition-all text-xs sm:text-sm md:text-base font-mono ${errors?.days_per_week ? 'border-cyber-red-500' : 'border-cyber-purple-700 focus:border-cyber-cyan-500'}`}
            />
            {errors?.days_per_week && <p className="text-cyber-red-400 text-xs sm:text-sm mt-2 font-mono">{errors.days_per_week[0]}</p>}
          </div>

          {/* PROGRAM DURATION */}
          <div>
            <label className="block text-xs sm:text-sm md:text-base font-semibold text-cyber-cyan-300 mb-2 sm:mb-3 font-mono">
              PROGRAM DURATION:
            </label>
            <select
              value={formData.duration_weeks}
              onChange={(e) => { setFormData({ ...formData, duration_weeks: parseInt(e.target.value) }); if (errors) setErrors(null); }}
              className={`w-full px-4 sm:px-5 py-3 bg-cyber-darker border-2 text-cyber-cyan-100 focus:shadow-cyan-glow outline-none transition-all text-xs sm:text-sm md:text-base font-mono ${errors?.duration_weeks ? 'border-cyber-red-500' : 'border-cyber-purple-700 focus:border-cyber-cyan-500'}`}
            >
              <option value={4}>4 WEEKS — STARTER CYCLE</option>
              <option value={8}>8 WEEKS — FULL BUILD</option>
              <option value={12}>12 WEEKS — ELITE PROGRAM</option>
            </select>
            {errors?.duration_weeks && <p className="text-cyber-red-400 text-xs sm:text-sm mt-2 font-mono">{errors.duration_weeks[0]}</p>}
          </div>

          {/* AVAILABLE EQUIPMENT */}
          <div>
            <label className="block text-xs sm:text-sm md:text-base font-semibold text-cyber-cyan-300 mb-3 sm:mb-4 font-mono">
              AVAILABLE EQUIPMENT:
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {equipmentOptions.map((equipment) => (
                <label
                  key={equipment}
                  className={`flex items-center gap-2 p-3 cursor-pointer transition-all border-2 ${
                    formData.equipment.includes(equipment)
                      ? 'border-cyber-cyan-400 bg-cyber-cyan-900/30'
                      : 'border-cyber-purple-700 bg-cyber-darker hover:border-cyber-purple-500'
                  } font-mono text-xs sm:text-sm`}
                >
                  <input
                    type="checkbox"
                    checked={formData.equipment.includes(equipment)}
                    onChange={() => handleEquipmentToggle(equipment)}
                    className="w-4 h-4 text-cyber-cyan-500"
                  />
                  <span className="text-gray-300 capitalize">{equipment}</span>
                </label>
              ))}
            </div>
            {errors?.equipment && <p className="text-cyber-red-400 text-xs sm:text-sm mt-3 font-mono">{errors.equipment[0]}</p>}
          </div>

          {/* INJURIES */}
          <div>
            <label className="block text-xs sm:text-sm md:text-base font-semibold text-cyber-cyan-300 mb-2 sm:mb-3 font-mono">
              INJURIES/LIMITATIONS (OPTIONAL):
            </label>
            <textarea
              value={formData.injuries_notes}
              onChange={(e) => setFormData({ ...formData, injuries_notes: e.target.value })}
              rows={3}
              className="w-full px-4 sm:px-5 py-3 bg-cyber-darker border-2 border-cyber-purple-700 text-cyber-cyan-100 placeholder-gray-500 focus:border-cyber-cyan-500 focus:shadow-cyan-glow outline-none transition-all text-xs sm:text-sm md:text-base font-mono"
              placeholder="Enter any physical limitations..."
            />
          </div>

          {/* EXTRA SUGGESTIONS */}
          <div>
            <label className="block text-xs sm:text-sm md:text-base font-semibold text-cyber-cyan-300 mb-2 sm:mb-3 font-mono">
              EXTRA SUGGESTIONS (OPTIONAL):
            </label>
            <textarea
              value={formData.extra_suggestions}
              onChange={(e) => setFormData({ ...formData, extra_suggestions: e.target.value })}
              rows={3}
              className="w-full px-4 sm:px-5 py-3 bg-cyber-darker border-2 border-cyber-purple-700 text-cyber-cyan-100 placeholder-gray-500 focus:border-cyber-cyan-500 focus:shadow-cyan-glow outline-none transition-all text-xs sm:text-sm md:text-base font-mono"
              placeholder="e.g. focus on compound lifts, include yoga cooldowns, no running exercises..."
            />
            <p className="text-gray-600 text-xs font-mono mt-1.5">
              Any specific preferences, styles, or exercises you want the AI to incorporate.
            </p>
          </div>

          <AsyncButton
            type="submit"
            loading={loading}
            className="w-full cyber-button px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-600 text-white font-bold text-sm sm:text-base md:text-lg hover:shadow-purple-glow transition-all duration-300 font-mono"
          >
            GENERATE PROTOCOL
          </AsyncButton>
        </form>
      </div>

      {/* ── Archive warning modal ── */}
      {showArchiveWarning && activePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="cyber-card bg-cyber-dark max-w-md w-full p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">📦</div>
              <h2 className="text-xl font-bold text-cyber-cyan-400 mb-3 font-sans">ARCHIVE CURRENT PROTOCOL?</h2>
              <p className="text-gray-300 text-sm font-mono mb-4">
                You already have an active protocol:
              </p>
              <div className="bg-cyber-darker border border-cyber-purple-700/50 p-3 font-mono text-xs text-left mb-4 space-y-1">
                <p className="text-cyber-cyan-300 font-semibold">{activePlan.title}</p>
                <p className="text-gray-500">This will be archived — you can restore it later from the Protocols page.</p>
              </div>
              <p className="text-gray-400 text-xs font-mono">
                All your workout logs from this plan will be preserved.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { setShowArchiveWarning(false); setPendingValidation(null); }}
                className="cyber-button px-6 py-3 border-2 border-cyber-purple-500 text-cyber-purple-200 hover:bg-cyber-purple-900/50 font-mono text-sm"
              >
                [ CANCEL ]
              </button>
              <button
                onClick={() => runGeneration(pendingValidation)}
                className="cyber-button px-6 py-3 bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-600 text-white font-bold font-mono text-sm hover:shadow-purple-glow"
              >
                [ ARCHIVE &amp; GENERATE ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
