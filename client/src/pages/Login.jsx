import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { AsyncButton } from '../components/AsyncButton.jsx';

const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.94 2.5 30.46 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#4285F4" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  // 'idle' | 'confirm_email' — shown after successful sign-up when email confirmation is required
  const [signUpState, setSignUpState] = useState('idle');

  // Redirect when already logged in (or right after email-confirmed login)
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!email.trim()) { setError('Email is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Redirect to the current origin's /auth/callback after email confirmation.
            // This ensures the link in the confirmation email always points to the
            // deployed app — not to Supabase's default Site URL (which can be stale
            // or still set to localhost during development/staging).
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        // Supabase returns a session immediately when email confirmation is OFF.
        // When confirmation is ON, data.session is null and the user must check email.
        if (data.session) {
          // Confirmed instantly (email confirmation disabled in Supabase dashboard)
          // AuthContext picks up the session via onAuthStateChange → redirects to /plan
          return;
        }

        // No session → email confirmation required
        setSignUpState('confirm_email');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          // Give a friendlier message for the most common case
          if (signInError.message.toLowerCase().includes('invalid login')) {
            setError('Incorrect email or password.');
          } else if (signInError.message.toLowerCase().includes('email not confirmed')) {
            setError('Please confirm your email address before logging in. Check your inbox.');
          } else {
            setError(signInError.message);
          }
        }
        // On success AuthContext fires and the useEffect above redirects
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Email confirmation pending screen ─────────────────────────────────────
  if (signUpState === 'confirm_email') {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid flex items-center justify-center p-4 sm:p-6 relative">
        <div className="scanline animate-scanline"></div>
        <div className="cyber-card bg-cyber-dark p-6 sm:p-10 shadow-2xl w-full max-w-sm sm:max-w-md text-center relative z-10">
          <div className="text-5xl sm:text-6xl mb-6">📧</div>
          <h2 className="text-xl sm:text-2xl font-bold text-cyber-cyan-400 mb-3 font-sans tracking-widest">
            CHECK YOUR EMAIL
          </h2>
          <p className="text-gray-300 font-mono text-sm sm:text-base mb-2">
            A confirmation link was sent to:
          </p>
          <p className="text-cyber-cyan-300 font-mono font-semibold text-sm sm:text-base mb-6 break-all">
            {email}
          </p>
          <p className="text-gray-400 font-mono text-xs sm:text-sm mb-8">
            Click the link in the email to activate your account, then come back and log in.
          </p>
          <button
            onClick={() => {
              setSignUpState('idle');
              setIsSignUp(false);
              setPassword('');
              setError(null);
            }}
            className="cyber-button px-6 py-3 border-2 border-cyber-cyan-500 text-cyber-cyan-300 hover:bg-cyber-cyan-900/30 font-mono text-sm w-full"
          >
            ← BACK TO LOGIN
          </button>
          <button
            onClick={async () => {
              const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
              if (resendError) setError(resendError.message);
              else setError(null);
            }}
            className="mt-3 text-gray-500 hover:text-cyber-purple-300 font-mono text-xs w-full"
          >
            Didn't receive it? Resend email
          </button>
          {error && (
            <p className="mt-3 text-cyber-red-400 font-mono text-xs">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Main login / sign-up form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cyber-black cyber-grid flex items-center justify-center p-4 sm:p-6 md:p-8 relative">
      <div className="scanline animate-scanline"></div>

      <div className="cyber-card bg-cyber-dark p-5 sm:p-6 md:p-8 shadow-2xl w-full max-w-sm sm:max-w-md relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-3xl sm:text-4xl md:text-5xl mb-4">🔐</div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-cyber-cyan-400 mb-2 font-sans tracking-widest">
            CYBER-FIT
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm md:text-base font-mono">
            {isSignUp ? '// CREATE ACCOUNT' : '// LOGIN TO SYSTEM'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 mb-6" noValidate>
          <div>
            <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-cyber-cyan-300 mb-2 font-mono">
              EMAIL:
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              required
              autoComplete="email"
              className="w-full px-4 sm:px-5 py-3 bg-cyber-darker border-2 border-cyber-purple-700 text-cyber-cyan-100 placeholder-gray-500 focus:border-cyber-cyan-500 focus:shadow-cyan-glow outline-none transition-all text-sm sm:text-base font-mono"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs sm:text-sm font-semibold text-cyber-cyan-300 mb-2 font-mono">
              PASSWORD:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="w-full px-4 sm:px-5 py-3 bg-cyber-darker border-2 border-cyber-purple-700 text-cyber-cyan-100 placeholder-gray-500 focus:border-cyber-cyan-500 focus:shadow-cyan-glow outline-none transition-all text-sm sm:text-base font-mono"
              placeholder="••••••••"
            />
            {isSignUp && (
              <p className="text-gray-500 text-xs mt-1.5 font-mono">Minimum 6 characters</p>
            )}
          </div>

          {error && (
            <div className="bg-cyber-red-500/20 border border-cyber-red-500 text-cyber-red-300 px-4 py-3 text-xs sm:text-sm font-mono">
              ERROR: {error}
            </div>
          )}

          <AsyncButton
            type="submit"
            loading={loading}
            className="w-full cyber-button px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-600 text-white font-bold text-sm sm:text-base hover:shadow-purple-glow transition-all duration-300 font-mono"
          >
            {isSignUp ? '[ CREATE ACCOUNT ]' : '[ LOGIN ]'}
          </AsyncButton>
        </form>

        <div className="flex items-center gap-3 sm:gap-4 my-5 sm:my-6">
          <div className="flex-1 h-0.5 bg-cyber-purple-700"></div>
          <span className="text-gray-500 text-xs sm:text-sm font-mono">OR CONNECT VIA:</span>
          <div className="flex-1 h-0.5 bg-cyber-purple-700"></div>
        </div>

        <AsyncButton
          onClick={handleGoogleSignIn}
          className="w-full cyber-button px-4 sm:px-6 py-3 sm:py-4 bg-cyber-darker text-gray-300 hover:bg-cyber-dark hover:shadow-purple-glow transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 font-mono text-sm sm:text-base"
        >
          <GoogleLogo />
          GOOGLE
        </AsyncButton>

        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setPassword('');
            setSignUpState('idle');
          }}
          className="w-full mt-5 sm:mt-6 text-cyber-purple-300 hover:text-cyber-cyan-300 font-semibold text-xs sm:text-sm font-mono"
        >
          {isSignUp ? '← ALREADY HAVE ACCESS? LOGIN' : '← NEW USER? CREATE ACCOUNT'}
        </button>

        <div className="mt-4 text-center">
          <Link to="/" className="text-gray-500 hover:text-cyber-cyan-400 text-xs sm:text-sm font-mono">
            ← RETURN TO MAINFRAME
          </Link>
        </div>
      </div>
    </div>
  );
}
