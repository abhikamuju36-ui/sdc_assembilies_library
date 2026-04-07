const CATEGORY_STYLES = {
  Structural:  'bg-brand-green/20 text-brand-green dark:bg-brand-green/40 dark:text-brand-lime',
  Mechanical:  'bg-brand-blue/20 text-brand-blue dark:bg-brand-blue/40 dark:text-brand-lightBlue',
  Electrical:  'bg-brand-yellow/20 text-brand-yellow dark:bg-brand-yellow/30 dark:text-brand-yellow',
  Enclosure:   'bg-brand-navy/20 text-brand-navy dark:bg-brand-navy/40 dark:text-brand-lightBlue',
  Other:       'bg-brand-gray/20 text-gray-500 dark:bg-brand-gray/30 dark:text-gray-400',
};

function categoryStyle(cat) {
  return CATEGORY_STYLES[cat] || 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
}

export default function AssemblyCard({ assembly, onClick, selected = false, onToggle }) {
  const { partno, job_id, job_name, description, category, comments, preference } = assembly;

  return (
    <div className={`sdc-card p-6 text-left group flex flex-col h-full transition-all duration-300 relative ${selected ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)]/5' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onToggle(partno, e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 left-4 w-4 h-4 rounded accent-[var(--accent)] cursor-pointer z-10"
      />
      <button
        onClick={() => onClick(assembly)}
        className="absolute inset-0 w-full h-full hover:scale-[1.02] active:scale-95 transition-all duration-300"
        aria-label={`Open ${partno}`}
      />
      <div className="flex items-start justify-between gap-3 mb-5 pl-6">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em] opacity-80">Part Number</span>
          <span className="font-mono-eng text-sm font-black text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
            {partno}
          </span>
        </div>
        {preference === 'Yes' && (
          <div className="p-1.5 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/5">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )}
      </div>

      <div className="mb-4 grow">
        <h3 className="text-base font-black text-[var(--text-primary)] leading-tight mb-2 line-clamp-2 uppercase tracking-tight">
          {job_name || 'Unnamed Assembly'}
        </h3>
        <p className="text-xs font-bold text-[var(--text-secondary)] font-mono-eng mb-4 opacity-60">
          JOB: {job_id}
        </p>
        
        {description && (
          <p className="text-sm font-medium text-[var(--text-secondary)] line-clamp-3 mb-4 leading-relaxed italic border-l-2 border-[var(--accent)]/20 pl-3">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-[var(--border-color)]/30 mt-auto">
        {category ? (
          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${categoryStyle(category)} shadow-sm`}>
            {category}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase opacity-30">
            No Category
          </span>
        )}
        
        {comments && (
          <div className="p-1 text-[var(--accent)] opacity-40 group-hover:opacity-100 transition-opacity" title="Contains comments">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.862 9.862 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
