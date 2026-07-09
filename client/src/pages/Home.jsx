
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function Home() {
  const { user } = useAuth();

  const features = [
    {
      icon: '⚡',
      title: 'AI-POWERED PLANS',
      description: 'Generate personalized workout protocols optimized by neural networks.',
    },
    {
      icon: '📊',
      title: 'QUANTUM TRACKING',
      description: 'Monitor every rep, set, and metric with precision analytics.',
    },
    {
      icon: '🎯',
      title: 'STREAK INTEGRITY',
      description: 'Build unbreakable habits with gamified consistency systems.',
    },
  ];

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid relative">
      <div className="scanline animate-scanline"></div>
      
      <nav className="flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 sm:py-6 relative z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-2xl sm:text-3xl md:text-4xl">🔧</span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-cyber-cyan-400 font-sans tracking-widest">
            CYBER-FIT
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {user ? (
            <Link
              to="/plan"
              className="cyber-button px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-cyber-darker text-cyber-cyan-300 hover:text-cyber-cyan-100 font-semibold hover:shadow-cyan-glow transition-all duration-300 text-xs sm:text-sm md:text-base font-mono"
            >
              [ ACCESS DASHBOARD ]
            </Link>
          ) : (
            <Link
              to="/login"
              className="cyber-button px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-cyber-darker text-cyber-cyan-300 hover:text-cyber-cyan-100 font-semibold hover:shadow-cyan-glow transition-all duration-300 text-xs sm:text-sm md:text-base font-mono"
            >
              [ INITIALIZE ]
            </Link>
          )}
        </div>
      </nav>

      <section className="px-4 sm:px-6 md:px-12 py-8 sm:py-12 md:py-16 lg:py-20 flex flex-col lg:flex-row items-center gap-6 sm:gap-8 md:gap-10 lg:gap-16 relative z-10">
        <div className="flex-1 text-center lg:text-left">
          <p className="text-cyber-purple-400 font-mono font-semibold mb-3 sm:mb-4 tracking-widest uppercase text-xs sm:text-sm md:text-base">
            // SYSTEM ONLINE
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight text-white font-sans">
            YOUR PERSONAL <br />
            <span className="text-cyber-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.7)]">
              CYBERNETIC COACH
            </span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 md:mb-10 max-w-lg mx-auto lg:mx-0 font-mono">
            &gt; Custom protocols tailored to your goals.<br />
            &gt; Real-time biometric feedback integration.<br />
            &gt; 24/7 neural network optimization.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start">
            {user ? (
              <Link
                to="/plan"
                className="cyber-button px-5 sm:px-6 md:px-8 py-3 sm:py-4 bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-600 text-white font-bold text-sm sm:text-base md:text-lg hover:shadow-purple-glow transition-all duration-300 flex items-center justify-center gap-2 font-mono"
              >
                ENTER THE GRID →
              </Link>
            ) : (
              <Link
                to="/login"
                className="cyber-button px-5 sm:px-6 md:px-8 py-3 sm:py-4 bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-600 text-white font-bold text-sm sm:text-base md:text-lg hover:shadow-purple-glow transition-all duration-300 flex items-center justify-center gap-2 font-mono"
              >
                START PROTOCOL →
              </Link>
            )}
            <Link
              to={user ? '/progress' : '/#features'}
              className="cyber-button px-5 sm:px-6 md:px-8 py-3 sm:py-4 bg-cyber-darker text-cyber-purple-300 hover:text-cyber-purple-100 font-semibold hover:border-cyber-purple-400 transition-all duration-300 font-mono text-sm sm:text-base md:text-lg"
            >
              SYSTEM SPECS
            </Link>
          </div>
        </div>
        
        <div className="flex-1 relative w-full max-w-sm sm:max-w-md md:max-w-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-cyber-purple-600/30 to-cyber-cyan-600/30 rounded-3xl blur-3xl animate-pulse-slow"></div>
          <div className="relative cyber-card bg-cyber-dark p-5 sm:p-6 md:p-8 shadow-2xl">
            <div className="text-3xl sm:text-4xl md:text-5xl mb-4 text-center">⚙️</div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-center mb-4 sm:mb-6 text-cyber-cyan-300 font-sans">
              TODAY'S MISSION
            </h3>
            <ul className="space-y-3 sm:space-y-4">
              {['PUSH PROTOCOL (3x15)', 'LEG DAY (3x20)', 'CORE STABILITY (3x60s)'].map((exercise, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 bg-cyber-darker p-3 sm:p-4 border border-cyber-purple-700 font-mono text-xs sm:text-sm md:text-base"
                >
                  <span className="text-cyber-cyan-400 text-base sm:text-lg md:text-xl">✓</span>
                  <span className="text-gray-300">{exercise}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="features" className="px-4 sm:px-6 md:px-12 py-8 sm:py-12 md:py-16 bg-cyber-darker/50 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-cyber-purple-400 font-sans">
            SYSTEM CAPABILITIES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="cyber-card bg-gradient-to-br from-cyber-darker to-cyber-dark p-5 sm:p-6 md:p-8 hover:shadow-purple-glow transition-all duration-300"
              >
                <div className="text-3xl sm:text-4xl md:text-5xl mb-4 sm:mb-6 text-cyber-cyan-400">{feature.icon}</div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-4 text-white font-sans">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-xs sm:text-sm md:text-base font-mono">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 md:px-12 py-8 sm:py-12 md:py-16 relative z-10">
        <div className="max-w-4xl mx-auto cyber-card bg-gradient-to-r from-cyber-purple-800 to-cyber-cyan-800 p-6 sm:p-8 md:p-10 lg:p-12 text-center shadow-2xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 md:mb-6 text-white font-sans">
            READY TO UPGRADE?
          </h2>
          <p className="text-sm sm:text-base md:text-xl text-cyber-cyan-200 mb-5 sm:mb-6 md:mb-10 max-w-2xl mx-auto font-mono">
            &gt; Join thousands of augmented athletes already in the network.<br />
            &gt; Your fitness evolution starts now.
          </p>
          <Link
            to={user ? '/plan' : '/login'}
            className="cyber-button px-6 sm:px-8 md:px-10 py-3 sm:py-4 bg-cyber-black text-cyber-cyan-300 rounded-xl font-bold text-sm sm:text-base md:text-lg hover:shadow-cyan-glow transition-all duration-300 inline-block font-mono"
          >
            {user ? 'CONTINUE MISSION' : 'CONNECT NOW'}
          </Link>
        </div>
      </section>

      <footer className="px-4 sm:px-6 md:px-12 py-4 sm:py-6 border-t border-cyber-purple-800 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🔧</span>
            <h4 className="text-base sm:text-lg md:text-xl font-bold text-cyber-cyan-400 font-sans tracking-widest">
              CYBER-FIT
            </h4>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm font-mono">
            © 2099 CYBER-FIT SYSTEMS. ALL PROTOCOLS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
