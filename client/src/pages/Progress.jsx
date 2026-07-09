
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import api from '../lib/axios.js';
import { Skeleton } from '../components/Skeleton.jsx';
import { AsyncButton } from '../components/AsyncButton.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { getErrorMessage } from '../lib/utils.js';
import {
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';

export function Progress() {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/progress');
      setProgressData(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid relative">
        <div className="scanline animate-scanline"></div>
        <Navbar />
        <main className="max-w-6xl mx-auto py-8 sm:py-10 px-4 sm:px-6 space-y-6 sm:space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="cyber-card bg-cyber-dark p-5 sm:p-6">
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-8 w-1/3" />
              </div>
            ))}
          </div>
          <div className="cyber-card bg-cyber-dark p-5 sm:p-6">
            <Skeleton className="h-6 w-1/4 mb-6" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid flex items-center justify-center p-4 sm:p-6 relative">
        <div className="scanline animate-scanline"></div>
        <div className="max-w-sm sm:max-w-md w-full cyber-card bg-cyber-dark p-6 sm:p-8 text-center relative z-10">
          <div className="text-cyber-red-400 text-3xl sm:text-4xl md:text-5xl mb-4">⚠️</div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 sm:mb-4 font-sans">SYSTEM ERROR</h2>
          <p className="text-gray-400 mb-6 sm:mb-8 text-xs sm:text-sm md:text-base font-mono">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <AsyncButton
              onClick={fetchProgress}
              className="cyber-button px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-600 text-white hover:shadow-purple-glow text-xs sm:text-sm md:text-base font-mono"
            >
              [ RETRY ]
            </AsyncButton>
            <AsyncButton
              onClick={() => navigate('/plan')}
              className="cyber-button px-4 sm:px-6 py-2 sm:py-3 border-2 border-cyber-purple-500 text-cyber-purple-200 hover:bg-cyber-purple-900/50 text-xs sm:text-sm md:text-base font-mono"
            >
              [ BACK TO PLAN ]
            </AsyncButton>
          </div>
        </div>
      </div>
    );
  }

  const hasData =
    progressData &&
    (progressData.total_workouts > 0 ||
      progressData.current_streak > 0 ||
      progressData.weekly_volume?.length > 0);

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid relative">
      <div className="scanline animate-scanline"></div>

      <Navbar />

      <main className="max-w-6xl mx-auto py-8 sm:py-10 px-4 sm:px-6 space-y-6 sm:space-y-8 relative z-10">
        {!hasData ? (
          <div className="cyber-card bg-gradient-to-br from-cyber-dark to-cyber-darker p-8 sm:p-10 lg:p-12 text-center">
            <div className="text-5xl sm:text-6xl md:text-7xl mb-6">🏋️</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyber-purple-400 to-cyber-cyan-400 bg-clip-text text-transparent mb-4 font-sans">
              START YOUR JOURNEY!
            </h2>
            <p className="text-gray-400 text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 font-mono">
              Complete your first workout to begin tracking your stats!
            </p>
            <Link
              to="/plan"
              className="cyber-button px-6 sm:px-8 md:px-10 py-3 sm:py-4 bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-600 text-white font-bold text-sm sm:text-base md:text-lg hover:shadow-purple-glow transition-all duration-300 inline-block font-mono"
            >
              GO TO WORKOUT PLAN
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="cyber-card bg-gradient-to-br from-orange-900/70 to-cyber-purple-900/70 p-5 sm:p-6 md:p-8 border-l-4 border-orange-500">
                <div className="text-xs sm:text-sm md:text-base font-semibold text-orange-300 mb-3 font-mono">
                  🔥 CURRENT STREAK
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-sans">
                  {progressData.current_streak} {progressData.current_streak === 1 ? 'DAY' : 'DAYS'}
                </div>
              </div>

              <div className="cyber-card bg-gradient-to-br from-yellow-900/70 to-cyber-purple-900/70 p-5 sm:p-6 md:p-8 border-l-4 border-yellow-500">
                <div className="text-xs sm:text-sm md:text-base font-semibold text-yellow-300 mb-3 font-mono">
                  🏆 LONGEST STREAK
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-sans">
                  {progressData.longest_streak} {progressData.longest_streak === 1 ? 'DAY' : 'DAYS'}
                </div>
              </div>

              <div className="cyber-card bg-gradient-to-br from-cyber-cyan-900/70 to-cyber-purple-900/70 p-5 sm:p-6 md:p-8 border-l-4 border-cyber-cyan-500">
                <div className="text-xs sm:text-sm md:text-base font-semibold text-cyber-cyan-300 mb-3 font-mono">
                  ✅ TOTAL WORKOUTS
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-sans">
                  {progressData.total_workouts}
                </div>
              </div>
            </div>

            <div className="cyber-card bg-gradient-to-br from-cyber-dark to-cyber-darker p-5 sm:p-6 md:p-8">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-6 sm:mb-8 font-sans">
                LAST 30 DAYS
              </h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {progressData.consistency_last_30_days?.map((day, index) => (
                  <div
                    key={index}
                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xs sm:text-base font-bold cursor-help transition-all ${
                      day.completed
                        ? 'bg-gradient-to-br from-cyber-green-500 to-cyber-green-700 text-white hover:shadow-green-glow'
                        : 'bg-cyber-purple-900/50 text-cyber-purple-400 hover:bg-cyber-purple-800'
                    }`}
                    title={`${formatDate(day.date)}: ${
                      day.completed ? 'WORKOUT COMPLETED' : 'NO WORKOUT'
                    }`}
                  >
                    {new Date(day.date).getDate()}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-8 text-xs sm:text-sm md:text-base text-gray-400 font-mono">
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-cyber-purple-900/50"></div>
                  NO WORKOUT
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-cyber-green-500 to-cyber-green-700"></div>
                  COMPLETED
                </span>
              </div>
            </div>

            {progressData.weekly_volume?.length > 0 && (
              <div className="cyber-card bg-gradient-to-br from-cyber-dark to-cyber-darker p-5 sm:p-6 md:p-8">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-6 sm:mb-8 font-sans">
                  WEEKLY VOLUME
                </h3>
                <div className="h-60 sm:h-72 md:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData.weekly_volume}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                      <XAxis
                        dataKey="week_start"
                        tickFormatter={formatDate}
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0a0a0f',
                          border: '2px solid #7e22ce',
                          boxShadow: '0 0 20px rgba(126, 34, 206, 0.3)',
                        }}
                        formatter={(value) => [`${value} LBS`, 'TOTAL WEIGHT']}
                        labelFormatter={formatDate}
                        itemStyle={{ color: '#a78bfa', fontFamily: 'monospace' }}
                        labelStyle={{ color: '#9ca3af', fontFamily: 'monospace' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_weight_lifted"
                        stroke="#a78bfa"
                        strokeWidth={3}
                        dot={{ fill: '#a78bfa', r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
