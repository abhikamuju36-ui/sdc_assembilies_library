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

  const fetchData = useCallback(async () => {
    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ sortBy, page, limit });
      if (debouncedSearch)             params.set('search', debouncedSearch);
      if (categories && categories.length) params.set('categories', categories.join(','));
      if (jobIds && jobIds.length)         params.set('jobIds', jobIds.join(','));
      if (preferences && preferences.length)   params.set('preferences',   preferences.join(','));
      if (sdcStandards && sdcStandards.length) params.set('sdcStandards', sdcStandards.join(','));

      const base = import.meta.env.VITE_API_URL ?? '';
      const res = await fetch(`${base}/api/assemblies?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();

      if (page === 1) {
        setData(json.data);
      } else {
        setData(prev => [...prev, ...json.data]);
      }
      setTotal(json.total);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categories, jobIds, preferences, sdcStandards, sortBy, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasMore = data.length < total;

  return { data, total, loading, error, hasMore, refetch: fetchData };
}
