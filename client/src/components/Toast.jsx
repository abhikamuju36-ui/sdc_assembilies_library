export default function Toast({ message, type = 'success' }) {
  if (!message) return null;

  const base =
    'fixed bottom-10 right-10 z-[1000] flex items-center gap-4 px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-sm font-black uppercase tracking-wider transition-all animate-in slide-in-from-right-10 duration-500';
  
  const styles = {
    success: 'bg-[#002540] text-white border-2 border-[var(--accent)]/30',
    error: 'bg-red-600 text-white border-2 border-red-400/20',
  };

  return (
    <div className={`${base} ${styles[type] ?? styles.success}`}>
      {type === 'success' ? (
        <div className="p-1.5 bg-[var(--accent)] rounded-full text-white shadow-[0_0_15px_var(--accent)]">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : (
        <div className="p-1.5 bg-white/20 rounded-full text-white">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
      <span className="drop-shadow-md">{message}</span>
    </div>
  );
}
