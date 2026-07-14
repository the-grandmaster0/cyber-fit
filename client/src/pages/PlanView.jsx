import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import api from '../lib/axios.js';
import { LogWorkoutModal } from '../components/LogWorkoutModal.jsx';
import { Skeleton } from '../components/Skeleton.jsx';
import { AsyncButton } from '../components/AsyncButton.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { getErrorMessage } from '../lib/utils.js';

function getCurrentWeekNumber(createdAt, totalWeeks) {
  const start = new Date(createdAt);
  start.setUTCHours(0, 0, 0, 0);
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const week = Math.floor(daysPassed / 7) + 1;
  return Math.min(Math.max(week, 1), totalWeeks);
}

export function PlanView() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDayIndex, setOpenDayIndex] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewingWeek, setViewingWeek] = useState(null);
  const navigate = useNavigate();
  const { } = useAuth();

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/plans/active');
      setPlan(response.data);
      setViewingWeek(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No active plan found. Generate one to get started.');
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlan(); }, []); // eslint-disable-line

  const weeks = useMemo(() => plan?.plan_json?.weeks || [], [plan]);
  const totalWeeks = weeks.length;
  const currentWeekNumber = useMemo(
    () => (plan ? getCurrentWeekNumber(plan.created_at, totalWeeks) : 1),
    [plan, totalWeeks]
  );

  const activeWeek = viewingWeek ?? currentWeekNumber;
  const displayWeek = weeks[activeWeek - 1] || null;
  const days = displayWeek?.days || [];
  const isCurrentWeek = activeWeek === currentWeekNumber;

  const toggleDay = (i) => setOpenDayIndex(openDayIndex === i ? null : i);
  const goToWeek = (w) => { setViewingWeek(w); setOpenDayIndex(null); };

  const handleLogWorkout = (day, e) => { e.stopPropagation(); setSelectedDay(day); };
  const handleSuccess = () => {
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
    fetchPlan();
  };

  const handleDeletePlan = async () => {
    try {
      setDeleting(true);
      await api.delete(`/plans/${plan.id}`);
      navigate('/protocols', { replace: true });
    } catch (err) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setError(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid relative">
        <div className="scanline animate-scanline" />
        <Navbar />
        <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 relative z-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-4 cyber-card bg-cyber-dark p-4 sm:p-6">
              <Skeleton className="h-5 w-1/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid flex items-center justify-center p-4 relative">
        <div className="scanline animate-scanline" />
        <div className="max-w-sm w-full cyber-card bg-cyber-dark p-6 sm:p-8 text-center relative z-10">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-3 font-sans">SYSTEM ERROR</h2>
          <p className="text-gray-400 mb-6 text-sm font-mono">{error}</p>
          <div className="flex flex-col gap-3">
            <AsyncButton onClick={() => window.location.reload()} className="cyber-button px-6 py-3 bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-600 text-white font-mono text-sm">
              [ RESTART ]
            </AsyncButton>
            <AsyncButton onClick={() => navigate('/onboarding')} className="cyber-button px-6 py-3 border-2 border-cyber-purple-500 text-cyber-purple-200 font-mono text-sm">
              [ NEW PROTOCOL ]
            </AsyncButton>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid relative">
      <div className="scanline animate-scanline" />

      {showSuccessToast && (
        <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-[1000] cyber-card bg-gradient-to-r from-cyber-green-600 to-cyber-green-700 text-white px-4 py-3 flex items-center gap-2 shadow-lg">
          <span>✓</span>
          <span className="font-semibold text-sm font-mono">WORKOUT LOGGED!</span>
        </div>
      )}

      <Navbar actions={[
        { label: 'Delete Plan', onClick: () => setShowDeleteConfirm(true), icon: '🗑️', variant: 'destructive' },
      ]} />

      <main className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 relative z-10">

        {/* Program overview */}
        {plan.plan_json?.overall_coach_notes && (
          <div className="bg-gradient-to-r from-cyber-purple-900/60 to-cyber-cyan-900/30 border-2 border-cyber-cyan-600/40 p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="font-semibold text-cyber-cyan-300 mb-2 text-xs sm:text-sm font-mono">📋 PROGRAM OVERVIEW</h3>
            <p className="text-gray-300 text-xs sm:text-sm font-mono">{plan.plan_json.overall_coach_notes}</p>
          </div>
        )}

        {/* Week selector */}
        {totalWeeks > 0 && (
          <div className="mb-6 sm:mb-8">
            {/* Top row: week label + status badge */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-cyber-cyan-400 font-bold text-lg sm:text-xl font-mono">
                WEEK {activeWeek}<span className="text-gray-500 font-normal"> / {totalWeeks}</span>
              </span>
              {isCurrentWeek && (
                <span className="px-2 py-0.5 bg-cyber-green-600/30 border border-cyber-green-500 text-cyber-green-400 text-xs font-mono animate-pulse">◉ ACTIVE</span>
              )}
              {!isCurrentWeek && activeWeek < currentWeekNumber && (
                <span className="px-2 py-0.5 bg-cyber-purple-900/50 border border-cyber-purple-600 text-cyber-purple-400 text-xs font-mono">✓ COMPLETED</span>
              )}
              {!isCurrentWeek && activeWeek > currentWeekNumber && (
                <span className="px-2 py-0.5 bg-cyber-darker border border-gray-600 text-gray-500 text-xs font-mono">🔒 UPCOMING</span>
              )}
            </div>

            {/* Nav buttons — full width on mobile */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => goToWeek(Math.max(1, activeWeek - 1))}
                disabled={activeWeek <= 1}
                className="cyber-button flex-1 sm:flex-none px-4 py-3 sm:py-2 border border-cyber-purple-600 text-cyber-purple-300 hover:bg-cyber-purple-900/50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono min-h-[44px]"
              >
                ← PREV
              </button>
              {!isCurrentWeek && (
                <button
                  onClick={() => goToWeek(currentWeekNumber)}
                  className="cyber-button flex-1 sm:flex-none px-4 py-3 sm:py-2 border border-cyber-cyan-600 text-cyber-cyan-300 hover:bg-cyber-cyan-900/30 text-xs font-mono min-h-[44px]"
                >
                  THIS WEEK
                </button>
              )}
              <button
                onClick={() => goToWeek(Math.min(totalWeeks, activeWeek + 1))}
                disabled={activeWeek >= totalWeeks}
                className="cyber-button flex-1 sm:flex-none px-4 py-3 sm:py-2 border border-cyber-purple-600 text-cyber-purple-300 hover:bg-cyber-purple-900/50 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono min-h-[44px]"
              >
                NEXT →
              </button>
            </div>

            {/* Week dots */}
            <div className="flex gap-1.5 items-center flex-wrap">
              {weeks.map((_, i) => {
                const wn = i + 1;
                return (
                  <button
                    key={i}
                    onClick={() => goToWeek(wn)}
                    title={`Week ${wn}`}
                    style={{ minHeight: 'unset', minWidth: 'unset' }}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      wn === activeWeek ? 'w-6 bg-cyber-cyan-400' :
                      wn === currentWeekNumber ? 'w-4 bg-cyber-green-500' :
                      wn < currentWeekNumber ? 'w-3 bg-cyber-purple-600' :
                      'w-3 bg-cyber-darker border border-gray-700'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Coach notes */}
        {displayWeek?.coach_notes && (
          <div className="bg-gradient-to-r from-cyber-purple-900/40 to-cyber-darker border border-cyber-purple-700/60 p-4 sm:p-5 mb-5 sm:mb-6">
            <h3 className="font-semibold text-cyber-purple-300 mb-2 text-xs sm:text-sm font-mono">
              🤖 WEEK {activeWeek} COACH NOTES
            </h3>
            <p className="text-gray-300 text-xs sm:text-sm font-mono">{displayWeek.coach_notes}</p>
          </div>
        )}

        {/* Workout days */}
        <div className="space-y-4 sm:space-y-5">
          {days.map((day, index) => (
            <div key={index} className="cyber-card bg-cyber-dark">
              {/* Day header — tap target min 44px */}
              <button
                onClick={() => toggleDay(index)}
                className="w-full px-4 sm:px-7 py-4 sm:py-5 text-left flex justify-between items-center hover:bg-cyber-purple-900/40 transition-all min-h-[64px]"
              >
                <div className="min-w-0 pr-3">
                  <h3 className="text-base sm:text-xl font-bold text-white font-sans">{day.day_label}</h3>
                  <p className="text-gray-400 mt-0.5 text-xs sm:text-sm font-mono truncate">{day.focus}</p>
                </div>
                <span className="text-2xl text-cyber-cyan-400 shrink-0">
                  {openDayIndex === index ? '−' : '+'}
                </span>
              </button>

              {openDayIndex === index && (
                <div className="px-4 sm:px-7 pb-5 sm:pb-7">

                  {/* ── Mobile: exercise cards ── */}
                  <div className="sm:hidden mt-4 space-y-3">
                    {day.exercises?.map((ex, ei) => (
                      <div key={ei} className="bg-cyber-darker border border-cyber-purple-800/60 p-3">
                        <p className="text-cyber-cyan-100 font-mono text-sm font-semibold mb-2">{ex.name}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs font-mono mb-2">
                          <div className="text-center">
                            <p className="text-gray-500 mb-0.5">SETS</p>
                            <p className="text-cyber-cyan-300 font-bold">{ex.sets}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500 mb-0.5">REPS</p>
                            <p className="text-cyber-cyan-300 font-bold">{ex.reps}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500 mb-0.5">REST</p>
                            <p className="text-cyber-cyan-300 font-bold">{ex.rest_seconds}s</p>
                          </div>
                        </div>
                        {ex.equipment && (
                          <p className="text-xs font-mono text-cyber-purple-300">🔧 {ex.equipment}</p>
                        )}
                        {ex.notes && (
                          <p className="text-xs font-mono text-gray-500 mt-1">💡 {ex.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* ── Desktop: table ── */}
                  <div className="hidden sm:block overflow-x-auto mt-4">
                    <table className="min-w-[560px] w-full divide-y divide-cyber-purple-700">
                      <thead>
                        <tr>
                          {['EXERCISE','SETS','REPS','REST','EQUIPMENT','NOTES'].map((h, hi) => (
                            <th key={hi} className={`px-3 py-2 text-xs font-semibold text-cyber-cyan-300 uppercase tracking-widest font-mono ${hi > 0 && hi < 4 ? 'text-center' : 'text-left'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cyber-purple-700/60">
                        {day.exercises?.map((ex, ei) => (
                          <tr key={ei} className="hover:bg-cyber-purple-900/30 transition-all">
                            <td className="px-3 py-2.5 text-sm text-cyber-cyan-100 font-mono">{ex.name}</td>
                            <td className="px-3 py-2.5 text-sm text-cyber-cyan-300 text-center font-mono">{ex.sets}</td>
                            <td className="px-3 py-2.5 text-sm text-cyber-cyan-300 text-center font-mono">{ex.reps}</td>
                            <td className="px-3 py-2.5 text-sm text-cyber-cyan-300 text-center font-mono">{ex.rest_seconds}s</td>
                            <td className="px-3 py-2.5 text-sm text-cyber-purple-200 font-mono">{ex.equipment}</td>
                            <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{ex.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <AsyncButton
                      onClick={(e) => handleLogWorkout(day, e)}
                      className="cyber-button w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyber-green-600 to-cyber-green-700 text-white hover:shadow-green-glow text-sm font-mono min-h-[44px]"
                    >
                      [ LOG WORKOUT ]
                    </AsyncButton>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <LogWorkoutModal
        day={selectedDay}
        planId={plan?.id}
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        onSuccess={handleSuccess}
      />

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cyber-black/85 px-4">
          <div className="cyber-card bg-cyber-dark max-w-md w-full p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="text-4xl sm:text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-cyber-red-400 mb-3 font-sans">DELETE PROTOCOL</h2>
              <div className="text-left text-xs font-mono space-y-1 mb-4 bg-cyber-darker p-4 border border-cyber-red-500/40">
                <p className="text-gray-300">▸ Plan: <span className="text-cyber-cyan-300">{plan.title}</span></p>
                <p className="text-gray-400">▸ All workout logs tied to this plan</p>
                <p className="text-gray-400">▸ Stats recalculated</p>
              </div>
              <p className="text-cyber-red-400 text-xs font-mono font-semibold">THIS ACTION CANNOT BE UNDONE.</p>
            </div>
            <div className="flex flex-col gap-3">
              <AsyncButton onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                className="cyber-button px-6 py-3 border-2 border-cyber-purple-500 text-cyber-purple-200 hover:bg-cyber-purple-900/50 font-mono text-sm min-h-[44px]">
                [ CANCEL ]
              </AsyncButton>
              <AsyncButton onClick={handleDeletePlan} loading={deleting}
                className="cyber-button px-6 py-3 bg-cyber-red-600/80 text-white hover:bg-cyber-red-700 font-mono text-sm font-semibold min-h-[44px]">
                [ CONFIRM DELETE ]
              </AsyncButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
