'use client';

import { useState } from 'react';
import { useSavedFilters, SavedFilter } from '@/hooks/useSavedFilters';
import { FilterOptions } from '@/types';
import { Card } from './Card';
import { Bookmark, BookmarkCheck, X, Plus, Filter } from 'lucide-react';
import { Button } from './Button';

interface SavedFiltersPanelProps {
  currentFilters: FilterOptions;
  onApplyFilter: (filters: FilterOptions) => void;
  compact?: boolean;
}

export function SavedFiltersPanel({ 
  currentFilters, 
  onApplyFilter,
  compact = false 
}: SavedFiltersPanelProps) {
  const { savedFilters, saveFilter, deleteFilter, ready } = useSavedFilters();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  if (!ready) return null;

  const handleSave = () => {
    if (!filterName.trim()) return;
    saveFilter(filterName.trim(), currentFilters);
    setFilterName('');
    setShowSaveDialog(false);
  };

  const hasActiveFilters = Object.keys(currentFilters).length > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {savedFilters.length > 0 && (
          <select
            onChange={(e) => {
              const filter = savedFilters.find(f => f.id === e.target.value);
              if (filter) onApplyFilter(filter.filters);
            }}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
            defaultValue=""
          >
            <option value="">Saved filters...</option>
            {savedFilters.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}
        {hasActiveFilters && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Save
          </button>
        )}
        {showSaveDialog && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setFilterName('');
              }}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card title={
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5" />
        Saved Filters
      </div>
    }>
      {savedFilters.length === 0 ? (
        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
          No saved filters. Save your current filter settings for quick access.
        </div>
      ) : (
        <div className="space-y-2">
          {savedFilters.map((filter) => (
            <div
              key={filter.id}
              className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-800 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <button
                onClick={() => onApplyFilter(filter.filters)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <Bookmark className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {filter.name}
                </span>
              </button>
              <button
                onClick={() => deleteFilter(filter.id)}
                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                title="Delete filter"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          {showSaveDialog ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter filter name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setShowSaveDialog(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" variant="primary">
                  Save Filter
                </Button>
                <Button 
                  onClick={() => {
                    setShowSaveDialog(false);
                    setFilterName('');
                  }} 
                  size="sm" 
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowSaveDialog(true)}
              size="sm"
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Save Current Filters
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}


