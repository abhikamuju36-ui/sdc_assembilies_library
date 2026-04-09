import { useState, useCallback, useEffect, useRef } from 'react';
import FilterBar from './components/FilterBar.jsx';
import AssemblyCard from './components/AssemblyCard.jsx';
import AssemblyTable from './components/AssemblyTable.jsx';
import AssemblyModal from './components/AssemblyModal.jsx';
import AddAssemblyModal from './components/AddAssemblyModal.jsx';
import SkeletonCard from './components/SkeletonCard.jsx';
import Toast from './components/Toast.jsx';
import useAssemblies from './hooks/useAssemblies.js';

const LIMIT = 40;

export default function App() {
  const [theme, setTheme]                           = useState(localStorage.getItem('sdc-theme') || 'light');
  const [search, setSearch]                         = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedJobIds, setSelectedJobIds]         = useState([]);
  const [selectedPreferences,  setSelectedPreferences]  = useState([]);
  const [selectedSdcStandards, setSelectedSdcStandards] = useState([]);
  const [sortBy, setSortBy]                         = useState('job_id');
  const [page, setPage]                             = useState(1);
  const [viewMode, setViewMode]                     = useState('table');
  const [selectedAssembly, setSelectedAssembly]     = useState(null);
  const [toast, setToast]                           = useState(null);
  const [selectedPartnos, setSelectedPartnos]       = useState(new Set());
  const [showBulkDelete, setShowBulkDelete]         = useState(false);
  const [bulkPassword, setBulkPassword]             = useState('');
  const [bulkAction,   setBulkAction]               = useState(null); // 'pref' | 'sdc'
  const [showAddModal, setShowAddModal]             = useState(false);

  const [categories, setCategories] = useState([]);
  const [jobs, setJobs]             = useState([]);

  const { data, total, loading, error, hasMore, refetch: _refetch } = useAssemblies({
    search,
    categories: selectedCategories,
    jobIds: selectedJobIds,
    preferences:  selectedPreferences,
    sdcStandards: selectedSdcStandards,
    sortBy,
    page,
    limit: LIMIT,
  });

  // After any mutation, reset to page 1 so infinite scroll restarts cleanly.
  // If already on page 1, page state won't change so force a direct refetch.
  const refetch = useCallback(() => {
    if (page === 1) {
      _refetch();
    } else {
      setPage(1); // triggers fetchData via useEffect in the hook
    }
  }, [page, _refetch]);

  const loadMoreRef = useRef(null);
  const searchRef   = useRef(null);

  // Press "/" from anywhere (when not already in an input) to focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== '/') return;
      const active = document.activeElement;
      const inInput = active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable
      );
      if (!inInput) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage(p => p + 1);
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  // Theme effect
  useEffect(() => {
    localStorage.setItem('sdc-theme', theme);
  }, [theme]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, selectedCategories, selectedJobIds, selectedPreferences, selectedSdcStandards, sortBy]);

  // Fetch distinct categories and jobs
  useEffect(() => {
    fetch('/api/assemblies/categories')
      .then(r => r.ok ? r.json() : [])
      .then(data => Array.isArray(data) ? setCategories(data) : setCategories([]))
      .catch(() => setCategories([]));

    fetch('/api/assemblies/jobs')
      .then(r => r.ok ? r.json() : [])
      .then(data => Array.isArray(data) ? setJobs(data) : setJobs([]))
      .catch(() => setJobs([]));
  }, []);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const handleHomeReset = useCallback(() => {
    setSearch('');
    setSelectedCategories([]);
    setSelectedJobIds([]);
    setSelectedPreferences([]);
    setSelectedSdcStandards([]);
    setSortBy('job_id');
    setPage(1);
    setSelectedAssembly(null);
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleSave = useCallback(async (partNumber, updates) => {
    const res = await fetch(`/api/assemblies/${encodeURIComponent(partNumber)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Save failed');

    showToast('Assembly saved successfully');
    refetch();
    setSelectedAssembly((prev) => prev ? { ...prev, ...updates, ...json.updated } : prev);
  }, [refetch, showToast]);

  const handleSaveWrapped = useCallback(async (partNumber, updates) => {
    try {
      await handleSave(partNumber, updates);
    } catch (e) {
      showToast(e.message, 'error');
      throw e;
    }
  }, [handleSave, showToast]);

  const handleAdd = useCallback(async (fields) => {
    const res = await fetch('/api/assemblies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || json.error || 'Create failed');
    showToast('Assembly added successfully');
    refetch();
  }, [refetch, showToast]);

  const handleDelete = useCallback(async (partNumber, password) => {
    const res = await fetch(`/api/assemblies/${encodeURIComponent(partNumber)}`, {
      method: 'DELETE',
      headers: {
        'X-Delete-Password': password,
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.detail || json?.error || 'Delete failed');

    showToast('Assembly removed successfully');
    refetch();
    setSelectedAssembly(null);
  }, [refetch, showToast]);

  const handleDeleteWrapped = useCallback(async (partNumber, password) => {
    try {
      await handleDelete(partNumber, password);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [handleDelete, showToast]);

  const handleToggleSelect = useCallback((partno, checked) => {
    setSelectedPartnos((prev) => {
      const next = new Set(prev);
      if (checked) next.add(partno); else next.delete(partno);
      return next;
    });
  }, []);

  const handleBulkUpdate = useCallback(async (field, value) => {
    const res = await fetch('/api/assemblies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnos: [...selectedPartnos], field, value }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json?.detail || json?.error || 'Update failed', 'error');
      return;
    }
    showToast(`${json.updated} record${json.updated !== 1 ? 's' : ''} updated`);
    setBulkAction(null);
    refetch();
  }, [selectedPartnos, showToast, refetch]);

  const handleBulkDelete = useCallback(async () => {
    const res = await fetch('/api/assemblies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Delete-Password': bulkPassword },
      body: JSON.stringify({ partnos: [...selectedPartnos] }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json?.detail || json?.error || 'Delete failed', 'error');
      return;
    }
    showToast(`${json.deleted} record${json.deleted !== 1 ? 's' : ''} deleted`);
    setSelectedPartnos(new Set());
    setShowBulkDelete(false);
    setBulkPassword('');
    refetch();
  }, [bulkPassword, selectedPartnos, showToast, refetch]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div data-theme={theme} className="min-h-screen flex flex-col font-sans transition-colors duration-500 selection:bg-[var(--accent)] bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--bg-header)] text-white shadow-xl border-b border-white backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <button
            onClick={handleHomeReset}
            className="flex items-center gap-4 hover:opacity-90 transition-all active:scale-95 shrink-0 group py-1"
          >
            <div className="flex flex-col items-center gap-1">
              <img src="/sdc-logo.png" alt="SDC Logo" className="h-10 w-auto object-contain" />
              <p className="text-[7px] font-bold text-brand-yellow/60 tracking-[0.4em] uppercase leading-none">Assemblies Library</p>
            </div>
          </button>

          <div className="flex-1 max-w-2xl relative group">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[var(--accent)] transition-colors pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search part no, job, description, comments… (press / to focus)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-mono-eng font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setSearch(''); e.currentTarget.blur(); } }}
            />
            {/* Clear button — only shown when there is text */}
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors p-0.5 rounded"
                title="Clear search (Esc)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {/* "/" hint badge — only shown when search box is empty */}
            {!search && (
              <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 pointer-events-none group-focus-within:opacity-0 transition-opacity">
                /
              </kbd>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 active:scale-[0.98]"
              title="Add assembly record manually"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={toggleTheme}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 active:scale-[0.98]"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m3.343-5.657l-.707.707m12.728 12.728l-.707.707M6.343 17.657l-.707-.707M17.657 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </button>

            <div className="bg-white/5 p-1 rounded-2xl flex gap-1 border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-xl transition-all duration-300 ${viewMode === 'grid' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-2 2zM11 13a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2a2 2 0 00-2 2v2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 rounded-xl transition-all duration-300 ${viewMode === 'table' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 flex flex-col gap-8">
        <FilterBar
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          allCategories={categories}
          selectedJobIds={selectedJobIds}
          onJobIdsChange={setSelectedJobIds}
          allJobIds={jobs}
          selectedPreferences={selectedPreferences}
          onPreferencesChange={setSelectedPreferences}
          selectedSdcStandards={selectedSdcStandards}
          onSdcStandardsChange={setSelectedSdcStandards}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          total={total}
          shown={data.length}
        />

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-6 py-4 text-sm text-red-700 dark:text-red-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Connectivity Error: {error}</span>
          </div>
        )}

        {(loading && page === 1) ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="sdc-card animate-pulse">
              <div className="h-12 bg-[var(--bg-main)] border-b border-[var(--border-color)]" />
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="p-5 border-b border-[var(--border-color)] last:border-0 h-16 flex items-center">
                  <div className="h-4 bg-[var(--bg-main)] rounded w-3/4" />
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {data.length === 0 ? (
              <div className="text-center py-32 bg-[var(--bg-card)] rounded-3xl border border-dashed border-[var(--border-color)]">
                <svg className="w-20 h-20 mx-auto mb-6 text-[var(--text-secondary)] opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xl font-bold text-[var(--text-primary)]">No assemblies match your search</p>
                <p className="text-[var(--text-secondary)] mt-2">Refine your filters to see more results</p>
                <button
                  onClick={handleHomeReset}
                  className="mt-8 sdc-btn-primary"
                >
                  Clear all filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.map((a) => (
                  <AssemblyCard key={a.partno} assembly={a} onClick={setSelectedAssembly} selected={selectedPartnos.has(a.partno)} onToggle={handleToggleSelect} />
                ))}
              </div>
            ) : (
              <div className="sdc-card">
                <AssemblyTable assemblies={data} onEdit={setSelectedAssembly} selectedPartnos={selectedPartnos} onToggle={handleToggleSelect} search={search} />
              </div>
            )}

            {hasMore && (
              <div ref={loadMoreRef} className="py-12 flex justify-center">
                <div className="flex items-center gap-3 bg-[var(--bg-card)] px-6 py-3 rounded-2xl border border-[var(--border-color)] shadow-sm">
                  <svg className="w-5 h-5 text-[var(--accent)] animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="text-sm font-bold text-[var(--text-secondary)]">Loading more assemblies...</span>
                </div>
              </div>
            )}
            
            {!hasMore && data.length > 0 && (
              <div className="py-12 text-center text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] opacity-30">
                End of Library — {total.toLocaleString()} records loaded
              </div>
            )}
          </div>
        )}
      </main>

      <AddAssemblyModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />

      <AssemblyModal
        assembly={selectedAssembly}
        onClose={() => setSelectedAssembly(null)}
        onSave={handleSaveWrapped}
        onDelete={handleDeleteWrapped}
      />

      {selectedPartnos.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl rounded-2xl px-6 py-4 animate-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {selectedPartnos.size} selected
          </span>
          <button
            onClick={() => { setSelectedPartnos(new Set()); setShowBulkDelete(false); setBulkPassword(''); setBulkAction(null); }}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-all"
          >
            Clear
          </button>

          {/* Bulk Pref */}
          {bulkAction === 'pref' ? (
            <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2 duration-200">
              <span className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">Pref:</span>
              {['Yes', 'No'].map((v) => (
                <button key={v} onClick={() => handleBulkUpdate('preference', v)}
                  className="px-4 py-1.5 rounded-xl text-xs font-black uppercase border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all">
                  {v}
                </button>
              ))}
              <button onClick={() => setBulkAction(null)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-all">
                Cancel
              </button>
            </div>
          ) : bulkAction !== 'sdc' && !showBulkDelete && (
            <button onClick={() => { setBulkAction('pref'); setShowBulkDelete(false); }}
              className="sdc-btn-outline px-5 text-sm">
              Set Pref
            </button>
          )}

          {/* Bulk SDC Standard */}
          {bulkAction === 'sdc' ? (
            <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2 duration-200">
              <span className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">SDC Std:</span>
              {['Yes', 'No'].map((v) => (
                <button key={v} onClick={() => handleBulkUpdate('sdc_standard', v)}
                  className="px-4 py-1.5 rounded-xl text-xs font-black uppercase border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all">
                  {v}
                </button>
              ))}
              <button onClick={() => setBulkAction(null)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-all">
                Cancel
              </button>
            </div>
          ) : bulkAction !== 'pref' && !showBulkDelete && (
            <button onClick={() => { setBulkAction('sdc'); setShowBulkDelete(false); }}
              className="sdc-btn-outline px-5 text-sm">
              Set SDC Std
            </button>
          )}

          {/* Bulk Delete */}
          {!showBulkDelete && bulkAction === null ? (
            <button
              onClick={() => setShowBulkDelete(true)}
              className="sdc-btn-outline px-5 text-red-500 border-red-500 hover:bg-red-500/10 text-sm"
            >
              Delete Selected
            </button>
          ) : showBulkDelete && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
              <input
                type="password"
                placeholder="Enter password"
                autoFocus
                value={bulkPassword}
                onChange={(e) => setBulkPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && bulkPassword) handleBulkDelete(); if (e.key === 'Escape') { setShowBulkDelete(false); setBulkPassword(''); } }}
                className="bg-[var(--bg-main)] border border-red-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 w-40"
              />
              <button
                onClick={handleBulkDelete}
                disabled={!bulkPassword}
                className="sdc-btn-primary px-4 bg-red-600 hover:bg-red-700 border-red-600 font-bold text-sm disabled:opacity-40"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => { setShowBulkDelete(false); setBulkPassword(''); }}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
