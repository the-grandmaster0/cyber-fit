import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/axios.js';
import { Navbar } from '../components/Navbar.jsx';
import { Skeleton } from '../components/Skeleton.jsx';
import { AsyncButton } from '../components/AsyncButton.jsx';
import { getErrorMessage } from '../lib/utils.js';

const GOAL_LABELS = {
  lose_weight: 'Fat Loss',
  build_muscle: 'Muscle Hypertrophy',
  strength: 'Max Strength',
  endurance: 'Endurance',
  general_fitness: 'General Fitness',
};

const GOAL_COLORS = {
  lose_weight:     'text-orange-400 border-orange-600/40 bg-orange-900/20',
  build_muscle:    'text-cyber-cyan-400 border-cyber-cyan-600/40 bg-cyber-cyan-900/20',
  strength:        'text-red-400 border-red-600/40 bg-red-900/20',
  endurance:       'text-green-400 border-green-600/40 bg-green-900/20',
  general_fitness: 'text-cyber-purple-300 border-cyber-purple-600/40 bg-cyber-purple-900/20',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Protocols() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(null);   // planId being restored
  const [deleting, setDeleting] = useState(null);     // planId being deleted
  const [confirmDelete, setConfirmDelete] = useState(null); // plan object to confirm
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/plans/all');
      setPlans(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleRestore = async (plan) => {
    try {
      setRestoring(plan.id);
      await api.patch(`/plans/${plan.id}/restore`);
      showToast(`"${plan.title}" is now your active protocol.`);
      await fetchPlans();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(confirmDelete.id);
      const res = await api.delete(`/plans/${confirmDelete.id}`);
      showToast(`"${confirmDelete.title}" deleted.`);
      // If we deleted the active plan, go to dashboard
      if (res.data.wasActive) navigate('/dashboard', { replace: true });
      else await fetchPlans();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const activePlan  = plans.find((p) => p.is_active);
  const archivedPlans = plans.filter((p) => !p.is_active);

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid relative">
      <div className="scanline animate-scanline" />
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-5 py-3 font-mono text-xs flex items-center gap-2 shadow-lg
          ${toast.type === 'error'
            ? 'bg-cyber-red-600/90 text-white border border-cyber-red-500'
            : 'bg-cyber-green-600/90 text-white border border-cyber-green-500'}`}>
          <span>{toast.type === 'error' ? '⚠' : '✓'}</span>
          {toast.msg}
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-mono text-cyber-cyan-600 tracking-widest mb-1">PROTOCOL VAULT</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-sans">My Protocols</h1>
            <p className="text-gray-500 font-mono text-xs mt-1">
              {plans.length} protocol{plans.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <Link
            to="/onboarding"
            className="cyber-button flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-cyber-purple-700 to-cyber-cyan-700 text-white text-xs font-mono font-semibold hover:shadow-cyan-glow transition-all shrink-0"
          >
            <span>⚡</span>
            NEW PROTOCOL
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="cyber-card bg-cyber-dark p-5">
                <Skeleton className="h-4 w-1/3 mb-3" />
                <Skeleton className="h-3 w-1/4 mb-2" />
                <Skeleton className="h-3 w-1/5" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="cyber-card bg-cyber-dark p-8 text-center">
            <p className="text-cyber-red-400 font-mono text-sm mb-4">⚠ {error}</p>
            <button onClick={fetchPlans} className="cyber-button px-4 py-2 text-xs font-mono text-cyber-cyan-300 border border-cyber-cyan-600">
              [ RETRY ]
            </button>
          </div>
        ) : plans.length === 0 ? (
          <div className="cyber-card bg-cyber-dark p-10 text-center">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-400 font-mono text-sm mb-6">No protocols yet. Generate your first one.</p>
            <Link to="/onboarding" className="cyber-button px-6 py-3 bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-600 text-white font-mono text-sm inline-block">
              ⚡ GENERATE PROTOCOL
            </Link>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Active plan */}
            {activePlan && (
              <section>
                <p className="text-xs font-mono text-cyber-green-400 tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-green-400 animate-pulse inline-block" />
                  ACTIVE PROTOCOL
                </p>
                <PlanCard
                  plan={activePlan}
                  isActive
                  onDelete={() => setConfirmDelete(activePlan)}
                  deleting={deleting === activePlan.id}
                />
              </section>
            )}

            {/* Archived plans */}
            {archivedPlans.length > 0 && (
              <section>
                <p className="text-xs font-mono text-gray-500 tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />
                  ARCHIVED PROTOCOLS
                </p>
                <div className="space-y-3">
                  {archivedPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isActive={false}
                      onRestore={() => handleRestore(plan)}
                      onDelete={() => setConfirmDelete(plan)}
                      restoring={restoring === plan.id}
                      deleting={deleting === plan.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="cyber-card bg-cyber-dark max-w-md w-full p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-cyber-red-400 mb-3 font-sans">DELETE PROTOCOL</h2>
              <p className="text-gray-300 text-sm font-mono mb-2">
                This will permanently delete:
              </p>
              <div className="text-left bg-cyber-darker border border-cyber-red-500/40 p-4 font-mono text-xs space-y-1 mb-4">
                <p>▸ Plan: <span className="text-cyber-cyan-300">{confirmDelete.title}</span></p>
                <p>▸ All workout logs tied to this plan</p>
                {confirmDelete.is_active && (
                  <p className="text-yellow-400">▸ This is your active plan — you'll need to restore or create one</p>
                )}
              </div>
              <p className="text-cyber-red-400 text-xs font-mono font-semibold">THIS ACTION CANNOT BE UNDONE.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <AsyncButton
                onClick={() => setConfirmDelete(null)}
                disabled={!!deleting}
                className="cyber-button px-6 py-3 border-2 border-cyber-purple-500 text-cyber-purple-200 hover:bg-cyber-purple-900/50 font-mono text-sm"
              >
                [ CANCEL ]
              </AsyncButton>
              <AsyncButton
                onClick={handleDelete}
                loading={!!deleting}
                className="cyber-button px-6 py-3 bg-cyber-red-600/80 text-white hover:bg-cyber-red-700 font-mono text-sm font-semibold"
              >
                [ CONFIRM DELETE ]
              </AsyncButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Plan card sub-component ────────────────────────────────────────────────────
function PlanCard({ plan, isActive, onRestore, onDelete, restoring, deleting }) {
  const goalColor = GOAL_COLORS[plan.goal] || GOAL_COLORS.general_fitness;

  return (
    <div className={`cyber-card bg-cyber-dark p-5 sm:p-6 transition-all ${isActive ? 'border-cyber-green-600/50' : 'opacity-80 hover:opacity-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="text-sm sm:text-base font-bold text-white font-sans truncate">{plan.title}</h3>
            {isActive && (
              <span className="px-2 py-0.5 bg-cyber-green-600/20 border border-cyber-green-600/50 text-cyber-green-400 text-xs font-mono shrink-0">
                ACTIVE
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-gray-500">
            {plan.goal && (
              <span className={`px-2 py-0.5 border rounded-sm text-xs font-mono ${goalColor}`}>
                {GOAL_LABELS[plan.goal] ?? plan.goal}
              </span>
            )}
            {plan.duration_weeks && (
              <span>{plan.duration_weeks} weeks</span>
            )}
            <span>Created {formatDate(plan.created_at)}</span>
            {!isActive && plan.archived_at && (
              <span className="text-gray-600">Archived {formatDate(plan.archived_at)}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isActive ? (
            <Link
              to="/plan"
              className="cyber-button px-3 py-1.5 border border-cyber-cyan-600 text-cyber-cyan-300 hover:bg-cyber-cyan-900/30 text-xs font-mono transition-colors"
            >
              VIEW →
            </Link>
          ) : (
            <AsyncButton
              onClick={onRestore}
              loading={restoring}
              disabled={restoring || deleting}
              className="cyber-button px-3 py-1.5 border border-cyber-purple-500 text-cyber-purple-300 hover:bg-cyber-purple-900/40 text-xs font-mono transition-colors"
            >
              RESTORE
            </AsyncButton>
          )}
          <AsyncButton
            onClick={onDelete}
            loading={deleting}
            disabled={restoring || deleting}
            className="cyber-button px-3 py-1.5 border border-cyber-red-700/60 text-cyber-red-400 hover:bg-cyber-red-900/30 text-xs font-mono transition-colors"
          >
            DELETE
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
