import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import api from '../lib/axios.js';
import { Navbar } from '../components/Navbar.jsx';
import { Skeleton } from '../components/Skeleton.jsx';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const firstName = user?.email?.split('@')[0] ?? 'Operative';

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [planRes, progressRes] = await Promise.allSettled([
          api.get('/plans/active'),
          api.get('/progress'),
        ]);

        if (planRes.status === 'fulfilled') setPlan(planRes.value.data);
        if (progressRes.status === 'fulfilled') setProgress(progressRes.value.data);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const hasPlan = !!plan;

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid relative">
      <div className="scanline animate-scanline" />
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* ── Welcome header ── */}
        <div className="mb-8 sm:mb-10">
          <p className="text-xs font-mono text-cyber-cyan-600 tracking-widest mb-1">WELCOME BACK</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white font-sans">
            <span className="text-cyber-cyan-400">{firstName.toUpperCase()}</span>
          </h1>
          <p className="text-gray-500 font-mono text-xs sm:text-sm mt-1">
            {hasPlan ? '▸ Active protocol detected — ready to train.' : '▸ No active protocol. Generate one to begin.'}
          </p>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="cyber-card bg-cyber-dark p-4 sm:p-5">
                <Skeleton className="h-3 w-1/2 mb-3" />
                <Skeleton className="h-7 w-1/3" />
              </div>
            ))
          ) : (
            <>
              <StatCard
                icon="🔥"
                label="CURRENT STREAK"
                value={progress?.current_streak ?? 0}
                unit={progress?.current_streak === 1 ? 'DAY' : 'DAYS'}
                accent="orange"
              />
              <StatCard
                icon="✅"
                label="TOTAL WORKOUTS"
                value={progress?.total_workouts ?? 0}
                unit="LOGGED"
                accent="cyan"
              />
              <StatCard
                icon="🏆"
                label="LONGEST STREAK"
                value={progress?.longest_streak ?? 0}
                unit={progress?.longest_streak === 1 ? 'DAY' : 'DAYS'}
                accent="yellow"
              />
              <StatCard
                icon="📋"
                label="ACTIVE PLAN"
                value={hasPlan ? '✓' : '—'}
                unit={hasPlan ? plan.title?.slice(0, 18) : 'NONE'}
                accent="purple"
              />
            </>
          )}
        </div>

        {/* ── Primary CTA: Generate Protocol ── */}
        <div className="cyber-card bg-gradient-to-br from-cyber-purple-900/60 via-cyber-dark to-cyber-cyan-900/30 border-2 border-cyber-cyan-600/30 p-6 sm:p-8 md:p-10 mb-6 sm:mb-8 text-center relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyber-purple-600/5 to-cyber-cyan-500/5 pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyber-cyan-900/40 border border-cyber-cyan-700/50 text-cyber-cyan-400 text-xs font-mono tracking-widest mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan-400 animate-pulse" />
              AI-POWERED PROTOCOL GENERATOR
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-sans mb-3">
              {hasPlan ? 'GENERATE A NEW PROTOCOL' : 'BUILD YOUR EXERCISE PROTOCOL'}
            </h2>
            <p className="text-gray-400 font-mono text-xs sm:text-sm max-w-lg mx-auto mb-6 sm:mb-8">
              {hasPlan
                ? 'Want a different approach? Create a fresh AI-generated workout plan tailored to your new goals.'
                : 'Let our AI coach build a personalised workout plan based on your goals, equipment, and experience level.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/onboarding"
                className="cyber-button px-6 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-600 text-white font-bold text-sm sm:text-base font-mono hover:shadow-purple-glow transition-all duration-300 inline-flex items-center justify-center gap-2"
              >
                <span>⚡</span>
                GENERATE EXERCISE PROTOCOL
              </Link>
              {hasPlan && (
                <Link
                  to="/plan"
                  className="cyber-button px-6 sm:px-8 py-3 sm:py-4 border-2 border-cyber-cyan-600 text-cyber-cyan-300 font-mono text-sm hover:bg-cyber-cyan-900/30 hover:shadow-cyan-glow transition-all duration-300 inline-flex items-center justify-center gap-2"
                >
                  <span>📋</span>
                  VIEW CURRENT PLAN
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Active plan preview (if any) ── */}
        {!loading && hasPlan && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Plan info */}
            <div className="cyber-card bg-cyber-dark p-5 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-mono text-cyber-purple-400 tracking-widest mb-1">ACTIVE PROTOCOL</p>
                  <h3 className="text-base sm:text-lg font-bold text-white font-sans">{plan.title}</h3>
                </div>
                <span className="px-2 py-0.5 bg-cyber-green-600/20 border border-cyber-green-600/50 text-cyber-green-400 text-xs font-mono">
                  ACTIVE
                </span>
              </div>

              {plan.plan_json?.overall_coach_notes && (
                <p className="text-gray-400 text-xs font-mono line-clamp-3 mb-4">
                  {plan.plan_json.overall_coach_notes}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                <span>
                  📅 {plan.plan_json?.weeks?.length ?? '?'} WEEKS
                </span>
                <span>
                  🗓 {plan.plan_json?.weeks?.[0]?.days?.length ?? '?'} DAYS/WEEK
                </span>
              </div>

              <Link
                to="/plan"
                className="mt-4 flex items-center gap-1.5 text-cyber-cyan-400 text-xs font-mono hover:text-cyber-cyan-300 transition-colors"
              >
                OPEN PLAN →
              </Link>
            </div>

            {/* Quick nav */}
            <div className="cyber-card bg-cyber-dark p-5 sm:p-6">
              <p className="text-xs font-mono text-cyber-purple-400 tracking-widest mb-4">QUICK ACCESS</p>
              <div className="space-y-2">
                <QuickLink to="/plan" icon="📋" label="View Workout Plan" desc="See your full week schedule" />
                <QuickLink to="/protocols" icon="🗂" label="Protocol Vault" desc="All your plans, active & archived" />
                <QuickLink to="/progress" icon="📊" label="Progress Analytics" desc="Streaks, volume & consistency" />
                <QuickLink to="/onboarding" icon="⚡" label="New Protocol" desc="Generate a fresh AI plan" />
              </div>
            </div>
          </div>
        )}

        {/* ── No plan: feature highlights ── */}
        {!loading && !hasPlan && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard
              icon="🤖"
              title="AI-GENERATED"
              desc="Plans built by a large language model tailored to your exact goals and equipment."
            />
            <FeatureCard
              icon="📈"
              title="TRACK PROGRESS"
              desc="Log every workout and watch your streaks, volume, and consistency grow."
            />
            <FeatureCard
              icon="🔄"
              title="MULTI-WEEK"
              desc="4, 8, or 12 week programs with progressive overload built in by default."
            />
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ icon, label, value, unit, accent }) {
  const accentMap = {
    orange: 'border-l-orange-500 from-orange-900/40',
    cyan: 'border-l-cyber-cyan-500 from-cyber-cyan-900/40',
    yellow: 'border-l-yellow-500 from-yellow-900/40',
    purple: 'border-l-cyber-purple-500 from-cyber-purple-900/40',
  };

  return (
    <div className={`cyber-card bg-gradient-to-br ${accentMap[accent]} to-cyber-dark p-4 sm:p-5 border-l-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <p className="text-xs font-mono text-gray-500 tracking-wide">{label}</p>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-white font-sans">{value}</p>
      <p className="text-xs font-mono text-gray-600 mt-0.5 truncate">{unit}</p>
    </div>
  );
}

function QuickLink({ to, icon, label, desc }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded transition-colors hover:bg-cyber-purple-900/30 group"
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-mono text-gray-300 group-hover:text-white transition-colors">{label}</p>
        <p className="text-xs font-mono text-gray-600 truncate">{desc}</p>
      </div>
      <span className="ml-auto text-gray-600 group-hover:text-cyber-cyan-400 transition-colors text-xs">→</span>
    </Link>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="cyber-card bg-cyber-dark p-5 sm:p-6 text-center">
      <div className="text-3xl sm:text-4xl mb-3">{icon}</div>
      <h3 className="text-sm font-bold text-cyber-cyan-400 font-mono tracking-wide mb-2">{title}</h3>
      <p className="text-gray-500 text-xs font-mono">{desc}</p>
    </div>
  );
}
