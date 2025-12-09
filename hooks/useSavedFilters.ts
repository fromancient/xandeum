'use client';

import { useState, useEffect, useCallback } from 'react';
import { FilterOptions } from '@/types';

const SAVED_FILTERS_KEY = 'xpic_saved_filters_v1';
const MAX_SAVED_FILTERS = 10;

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterOptions;
  createdAt: number;
}

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const raw = window.localStorage.getItem(SAVED_FILTERS_KEY);
      if (raw) {
        setSavedFilters(JSON.parse(raw));
      }
    } catch {
      // ignore
    } finally {
      setReady(true);
    }
  }, []);

  const saveFilter = useCallback((name: string, filters: FilterOptions) => {
    if (typeof window === 'undefined') return;
    
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: Date.now(),
    };

    const updated = [...savedFilters, newFilter]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_SAVED_FILTERS);

    setSavedFilters(updated);
    
    try {
      window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, [savedFilters]);

  const deleteFilter = useCallback((id: string) => {
    if (typeof window === 'undefined') return;
    
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    
    try {
      window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, [savedFilters]);

  const clearAllFilters = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    setSavedFilters([]);
    try {
      window.localStorage.removeItem(SAVED_FILTERS_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
    clearAllFilters,
    ready,
  };
}

