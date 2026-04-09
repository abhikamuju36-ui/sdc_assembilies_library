import { useState, useEffect, useCallback, useRef } from 'react';

export default function useAssemblies({ search, categories, jobIds, preferences, sdcStandards, sortBy, page, limit = 20 }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const abortRef = useRef(null);

  // Debounce search input 300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async (overridePage = null) => {
    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const activePage = overridePage ?? page;

    try {
      const params = new URLSearchParams({ sortBy, page: activePage, limit });
      if (debouncedSearch)                       params.set('search',       debouncedSearch);
      if (categories   && categories.length)     params.set('categories',   categories.join(','));
      if (jobIds       && jobIds.length)         params.set('jobIds',       jobIds.join(','));
      if (preferences  && preferences.length)    params.set('preferences',  preferences.join(','));
      if (sdcStandards && sdcStandards.length)   params.set('sdcStandards', sdcStandards.join(','));

      const base = import.meta.env.VITE_API_URL ?? '';
      const res = await fetch(`${base}/api/assemblies?${params.toString()}`, { signal: controller.signal });

      if (!res.ok) {
        // Safely parse error body — server may return HTML on crash
        let message = `Server error (${res.status})`;
        try {
          const body = await res.json();
          message = body.error || body.detail || message;
        } catch {}
        throw new Error(message);
      }

      const json = await res.json();
      const results = json.data || json.value || [];
      const count   = json.total ?? json.totalRecords ?? 0;

      if (activePage === 1) {
        setData(Array.isArray(results) ? results : []);
      } else {
        setData(prev => {
          const seen = new Set(prev.map(r => r.partno));
          const fresh = (Array.isArray(results) ? results : []).filter(r => !seen.has(r.partno));
          return [...prev, ...fresh];
        });
      }
      setTotal(count);
    } catch (err) {
      if (err.name === 'AbortError') return; // silently ignore aborted requests
      // Friendly message for network failure
      const msg = err.message.includes('Failed to fetch') || err.message.includes('NetworkError')
        ? 'Cannot reach server — check your connection'
        : err.message;
      setError(msg);
    } finally {
      // Only clear loading if this request was NOT aborted
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, categories, jobIds, preferences, sdcStandards, sortBy, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasMore = data.length < total;

  // Always reloads from page 1 — use after add/save/delete
  const refetch = useCallback(() => fetchData(1), [fetchData]);

  return { data, total, loading, error, hasMore, refetch };
}
