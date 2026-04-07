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

const COLS = ['', 'Part Number', 'Job ID', 'Description', 'Category', 'Model', 'Image', 'Pref', 'SDC Standard'];

function ExternalLink({ href, label }) {
  if (!href) return <span className="text-[var(--text-secondary)] opacity-30">—</span>;

  const handleClick = (e) => {
    e.stopPropagation();
    if (href.startsWith('data:')) {
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${href}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        win.document.title = label;
      }
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="sdc-btn-outline px-3 py-1.5 h-8 text-xs font-bold border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-all"
    >
      {label}
    </button>
  );
}

export default function AssemblyTable({ assemblies, onEdit, selectedPartnos = new Set(), onToggle }) {
  const allSelected = assemblies.length > 0 && assemblies.every((a) => selectedPartnos.has(a.partno));

  function handleSelectAll() {
    if (allSelected) {
      assemblies.forEach((a) => onToggle(a.partno, false));
    } else {
      assemblies.forEach((a) => onToggle(a.partno, true));
    }
  }

  if (assemblies.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--text-secondary)]">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        No assemblies found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
            <th className="pl-6 pr-2 py-4 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
              />
            </th>
            {COLS.slice(1).map((col) => (
              <th
                key={col}
                className="px-6 py-4 text-left text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]">
          {assemblies.map((a) => (
            <tr key={a.partno} className={`hover:bg-[var(--hover-bg)] transition-colors group px-4 ${selectedPartnos.has(a.partno) ? 'bg-[var(--accent)]/5' : ''}`}>
              <td className="pl-6 pr-2 py-4 w-10">
                <input
                  type="checkbox"
                  checked={selectedPartnos.has(a.partno)}
                  onChange={(e) => { e.stopPropagation(); onToggle(a.partno, e.target.checked); }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onEdit(a)}
                  className="font-mono-eng text-xs text-[var(--accent)] font-bold hover:underline text-left transition-all"
                >
                  {a.partno}
                </button>
              </td>
              <td className="px-6 py-4 font-mono-eng text-xs text-[var(--text-secondary)] whitespace-nowrap">
                {a.job_id}
              </td>
              <td className="px-6 py-4 text-[var(--text-primary)] font-medium max-w-sm truncate group-hover:text-[var(--accent)] transition-colors">
                {a.description || '—'}
              </td>
              <td className="px-6 py-4">
                {a.category ? (
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${categoryStyle(a.category)}`}>
                    {a.category}
                  </span>
                ) : (
                  <span className="text-[var(--text-secondary)] opacity-30 text-xs">—</span>
                )}
              </td>
              <td className="px-6 py-4">
                <ExternalLink href={a.model_link} label="CAD" />
              </td>
              <td className="px-6 py-4">
                <ExternalLink href={a.picture_link} label="IMG" />
              </td>
              <td className="px-6 py-4">
                {a.preference === 'Yes' ? (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--accent-subtle)] text-[var(--accent)] uppercase tracking-wider border border-[var(--accent)] shadow-sm">
                    YES
                  </span>
                ) : a.preference === 'No' ? (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 uppercase tracking-wider border border-transparent">
                    NO
                  </span>
                ) : (
                  <span className="text-[var(--text-secondary)] opacity-30 text-xs">—</span>
                )}
              </td>
              <td className="px-6 py-4">
                {a.sdc_standard === 'Yes' ? (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--accent-subtle)] text-[var(--accent)] uppercase tracking-wider border border-[var(--accent)] shadow-sm">
                    YES
                  </span>
                ) : a.sdc_standard === 'No' ? (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-400 dark:bg-slate-700/20 dark:text-slate-500 uppercase tracking-wider border border-transparent">
                    NO
                  </span>
                ) : (
                  <span className="text-[var(--text-secondary)] opacity-30 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
