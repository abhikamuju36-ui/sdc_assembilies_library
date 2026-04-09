import { useState, useRef, useEffect } from 'react';

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

const TOGGLEABLE_COLS = [
  { key: 'file_name',    label: 'File Name' },
  { key: 'category',     label: 'Category' },
  { key: 'model_link',   label: 'Model' },
  { key: 'picture_link', label: 'Image' },
  { key: 'preference',   label: 'Pref' },
  { key: 'sdc_standard', label: 'SDC Standard' },
];

const STORAGE_KEY = 'sdc-visible-cols';

function loadVisibleCols() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved));
  } catch {}
  return new Set(TOGGLEABLE_COLS.map((c) => c.key));
}

// Styles for a hidden column cell — collapses width and fades out
const HIDDEN_CELL = {
  width: 0,
  maxWidth: 0,
  minWidth: 0,
  padding: 0,
  overflow: 'hidden',
  opacity: 0,
  whiteSpace: 'nowrap',
};

function ColCell({ visible, children, className = 'px-6 py-4' }) {
  return (
    <td
      style={visible ? undefined : HIDDEN_CELL}
      className={`${className} transition-all duration-300 ease-in-out`}
    >
      {children}
    </td>
  );
}

function ColTh({ visible, children }) {
  return (
    <th
      style={visible ? undefined : HIDDEN_CELL}
      className="px-6 py-4 text-left text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-300 ease-in-out"
    >
      {children}
    </th>
  );
}

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

function ColumnPicker({ visibleCols, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(key) {
    const next = new Set(visibleCols);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(next);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Show/hide columns"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
          open
            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
            : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        Columns
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl py-2 min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] border-b border-[var(--border-color)] mb-1">
            Toggle Columns
          </p>
          {TOGGLEABLE_COLS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--hover-bg)] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={visibleCols.has(key)}
                onChange={() => toggle(key)}
                className="w-3.5 h-3.5 rounded accent-[var(--accent)] cursor-pointer"
              />
              <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssemblyTable({ assemblies, onEdit, selectedPartnos = new Set(), onToggle }) {
  const [visibleCols, setVisibleCols] = useState(loadVisibleCols);

  function handleColChange(next) {
    setVisibleCols(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
  }

  const allSelected = assemblies.length > 0 && assemblies.every((a) => selectedPartnos.has(a.partno));

  function handleSelectAll() {
    if (allSelected) {
      assemblies.forEach((a) => onToggle(a.partno, false));
    } else {
      assemblies.forEach((a) => onToggle(a.partno, true));
    }
  }

  const show = (key) => visibleCols.has(key);

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
    <div>
      {/* Column picker toolbar */}
      <div className="flex justify-end px-4 py-2 border-b border-[var(--border-color)]">
        <ColumnPicker visibleCols={visibleCols} onChange={handleColChange} />
      </div>

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
              {/* Always visible */}
              <th className="px-6 py-4 text-left text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] whitespace-nowrap">Part Number</th>
              <ColTh visible={show('file_name')}>File Name</ColTh>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] whitespace-nowrap">Job ID</th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] whitespace-nowrap">Job Name</th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] whitespace-nowrap">Description</th>
              <ColTh visible={show('category')}>Category</ColTh>
              <ColTh visible={show('model_link')}>Model</ColTh>
              <ColTh visible={show('picture_link')}>Image</ColTh>
              <ColTh visible={show('preference')}>Pref</ColTh>
              <ColTh visible={show('sdc_standard')}>SDC Standard</ColTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {assemblies.map((a) => (
              <tr key={a.id ?? a.partno} className={`hover:bg-[var(--hover-bg)] transition-colors group ${selectedPartnos.has(a.partno) ? 'bg-[var(--accent)]/5' : ''}`}>
                <td className="pl-6 pr-2 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedPartnos.has(a.partno)}
                    onChange={(e) => { e.stopPropagation(); onToggle(a.partno, e.target.checked); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
                  />
                </td>

                {/* Part Number — always */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onEdit(a)}
                    className="font-mono-eng text-xs text-[var(--accent)] font-bold hover:underline text-left transition-all"
                  >
                    {a.partno}
                  </button>
                </td>

                {/* File Name — toggleable */}
                <ColCell visible={show('file_name')} className="px-6 py-4 whitespace-nowrap">
                  {a.file_name ? (
                    <span className={`font-mono-eng text-xs font-bold px-2 py-0.5 rounded-lg ${
                      a.file_name !== a.partno
                        ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40'
                        : 'text-[var(--text-secondary)]'
                    }`} title={a.file_name !== a.partno ? 'File name differs from part number' : ''}>
                      {a.file_name}
                    </span>
                  ) : (
                    <span className="text-[var(--text-secondary)] opacity-25 text-xs">—</span>
                  )}
                </ColCell>

                {/* Job ID — always */}
                <td className="px-6 py-4 font-mono-eng text-xs text-[var(--text-secondary)] whitespace-nowrap">
                  {a.job_id}
                </td>

                {/* Job Name — always */}
                <td className="px-6 py-4 text-xs text-[var(--text-secondary)] whitespace-nowrap max-w-[180px] truncate">
                  {a.job_name || '—'}
                </td>

                {/* Description — always */}
                <td className="px-6 py-4 text-[var(--text-primary)] font-medium max-w-sm truncate group-hover:text-[var(--accent)] transition-colors">
                  {a.description || '—'}
                </td>

                {/* Category — toggleable */}
                <ColCell visible={show('category')}>
                  {a.category ? (
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${categoryStyle(a.category)}`}>
                      {a.category}
                    </span>
                  ) : (
                    <span className="text-[var(--text-secondary)] opacity-30 text-xs">—</span>
                  )}
                </ColCell>

                {/* Model — toggleable */}
                <ColCell visible={show('model_link')}>
                  <ExternalLink href={a.model_link} label="CAD" />
                </ColCell>

                {/* Image — toggleable */}
                <ColCell visible={show('picture_link')}>
                  <ExternalLink href={a.picture_link} label="IMG" />
                </ColCell>

                {/* Pref — toggleable */}
                <ColCell visible={show('preference')}>
                  {a.preference === 'Yes' ? (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--accent-subtle)] text-[var(--accent)] uppercase tracking-wider border border-[var(--accent)] shadow-sm">YES</span>
                  ) : a.preference === 'No' ? (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 uppercase tracking-wider border border-transparent">NO</span>
                  ) : (
                    <span className="text-[var(--text-secondary)] opacity-30 text-xs">—</span>
                  )}
                </ColCell>

                {/* SDC Standard — toggleable */}
                <ColCell visible={show('sdc_standard')}>
                  {a.sdc_standard === 'Yes' ? (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--accent-subtle)] text-[var(--accent)] uppercase tracking-wider border border-[var(--accent)] shadow-sm">YES</span>
                  ) : a.sdc_standard === 'No' ? (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-400 dark:bg-slate-700/20 dark:text-slate-500 uppercase tracking-wider border border-transparent">NO</span>
                  ) : (
                    <span className="text-[var(--text-secondary)] opacity-30 text-xs">—</span>
                  )}
                </ColCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
