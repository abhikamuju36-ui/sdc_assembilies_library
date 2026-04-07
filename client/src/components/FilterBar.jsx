import { useState, useRef, useEffect } from 'react';

const SORT_OPTIONS = [
  { value: 'job_id', label: 'Job ID ↓' },
  { value: 'updated_at', label: 'Recent Update ↓' },
  { value: 'partno', label: 'Part Number (A-Z)' },
];

function MultiSelect({ label, options, selected, onChange, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  const toggle = (val) => {
    const next = selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val];
    onChange(next);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] transition-all shadow-sm min-w-[150px] active:scale-95"
      >
        <span className="truncate flex-1 text-left">
          {selected.length === 0 ? label : `${selected.length} ${label}${selected.length > 1 ? 's' : ''}`}
        </span>
        <svg className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-72 max-h-[400px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 origin-top backdrop-blur-xl">
          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]/50">
            <input
              type="text"
              autoFocus
              placeholder={`Search ${label}...`}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1 py-2 custom-scrollbar">
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="w-full text-left px-5 py-2.5 text-xs font-bold text-[var(--accent)] hover:bg-[var(--bg-main)] transition-colors uppercase tracking-wider"
              >
                Clear Selection
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-5 py-4 text-sm text-[var(--text-secondary)] italic opacity-60">No matches found</div>
            ) : (
              filtered.map((opt) => (
                <label key={opt} className="flex items-center gap-3.5 px-5 py-2.5 hover:bg-[var(--bg-main)] cursor-pointer transition-colors group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selected.includes(opt)}
                      onChange={() => toggle(opt)}
                      className="peer w-5 h-5 rounded-lg border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--accent)] focus:ring-[var(--accent)] accent-[var(--accent)] cursor-pointer appearance-none border transition-all checked:bg-[var(--accent)] checked:border-[var(--accent)]"
                    />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate transition-colors">
                    {opt}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FilterBar({
  selectedCategories, onCategoriesChange, allCategories,
  selectedJobIds, onJobIdsChange, allJobIds,
  selectedPreferences, onPreferencesChange,
  selectedSdcStandards, onSdcStandardsChange,
  sortBy, onSortByChange,
  total, shown,
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 py-2">
      <div className="flex flex-wrap items-center gap-4">
        <MultiSelect
          label="Category"
          options={allCategories}
          selected={selectedCategories}
          onChange={onCategoriesChange}
        />

        <MultiSelect
          label="Job ID"
          options={allJobIds}
          selected={selectedJobIds}
          onChange={onJobIdsChange}
        />

        <MultiSelect
          label="Preference"
          options={['Yes', 'No']}
          selected={selectedPreferences}
          onChange={onPreferencesChange}
        />

        <MultiSelect
          label="SDC Standard"
          options={['Yes', 'No']}
          selected={selectedSdcStandards}
          onChange={onSdcStandardsChange}
        />

        <div className="w-[1px] h-8 bg-[var(--border-color)] mx-2 hidden xl:block" />

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] hidden lg:block">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-sm transition-all hover:border-[var(--accent)] appearance-none pr-10 relative cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '1.2em'
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-[var(--bg-card)] px-6 py-3 rounded-2xl border border-[var(--border-color)] shadow-sm self-start xl:self-auto">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-[var(--accent)] animate-ping opacity-20" />
          <span className="relative block w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
        </div>
        <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
          Showing <span className="text-[var(--accent)]">{shown.toLocaleString()}</span> <span className="text-[var(--text-secondary)] font-medium">of</span> {total.toLocaleString()} <span className="text-[var(--text-secondary)] font-medium underline decoration-[var(--accent)] underline-offset-4">assemblies</span>
        </span>
      </div>
    </div>
  );
}
