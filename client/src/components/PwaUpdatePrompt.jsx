import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Shows a slim banner when a new app version is available.
 * User can tap "Update" to reload, or dismiss.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 bg-cyber-dark border border-cyber-cyan-600/60 px-4 py-3 shadow-lg shadow-cyber-cyan-900/30 font-mono text-xs"
      style={{ clipPath: 'polygon(0 8px,8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px))' }}
    >
      <span className="text-cyber-cyan-300">⚡ New version available</span>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1 bg-cyber-cyan-600/80 text-white hover:bg-cyber-cyan-500 transition-colors"
        >
          Update
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="px-3 py-1 text-gray-500 hover:text-gray-300 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
