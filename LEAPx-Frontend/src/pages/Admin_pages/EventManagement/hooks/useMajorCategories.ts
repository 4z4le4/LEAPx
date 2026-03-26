/**
 * Custom hook for fetching major categories with permission filtering
 */

import { useState, useEffect } from 'react';
import { getMajorCategories } from '../../../../services/api/majors/majors.service';

export interface MajorCategory {
  id: number;
  code: string;
  name_TH: string;
  name_EN: string;
  isActive?: boolean;
}

interface UseMajorCategoriesOptions {
  isSupreme: boolean;
  isActivityAdmin: boolean;
  allowedMajorIds: Set<number> | null;
}

interface UseMajorCategoriesResult {
  majors: MajorCategory[];
  majorsLoading: boolean;
  majorsLoaded: boolean;
  majorsError: string | null;
  showEmptyMajors: boolean;
}

/**
 * Fetch and filter major categories based on user permissions
 */
export function useMajorCategories(
  options: UseMajorCategoriesOptions,
  enabled: boolean = true
): UseMajorCategoriesResult {
  const { isSupreme, isActivityAdmin, allowedMajorIds } = options;
  
  const [majors, setMajors] = useState<MajorCategory[]>([]);
  const [majorsLoading, setMajorsLoading] = useState(false);
  const [majorsLoaded, setMajorsLoaded] = useState(false);
  const [majorsError, setMajorsError] = useState<string | null>(null);
  const [showEmptyMajors, setShowEmptyMajors] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const ac = new AbortController();
    
    (async () => {
      try {
        setMajorsLoading(true);
        setMajorsLoaded(false);
        setMajorsError(null);

        // Fetch active major categories
        const allMajors = await getMajorCategories({ isActive: true });
        
        let rows: MajorCategory[] = allMajors as MajorCategory[];

        // Filter based on user role and permissions
        if (isSupreme) {
          // SUPREME: no filtering
        } else if (isActivityAdmin) {
          // Activity Admin: filter by allowed majors
          if (allowedMajorIds) {
            rows = rows.filter((r) => allowedMajorIds.has(r.id));
          }
        } else {
          // Other roles: no access
          rows = [];
        }

        setMajors(rows);
      } catch (e) {
        if ((e as DOMException).name !== 'AbortError') {
          setMajors([]);
          setMajorsError('FETCH_FAILED');
        }
      } finally {
        setMajorsLoading(false);
        setMajorsLoaded(true);
      }
    })();

    return () => ac.abort();
  }, [enabled, isSupreme, isActivityAdmin, allowedMajorIds]);

  // Show empty state after delay
  useEffect(() => {
    if (majorsLoaded && !majorsLoading && majors.length === 0) {
      const t = setTimeout(() => setShowEmptyMajors(true), 800);
      return () => clearTimeout(t);
    }
    setShowEmptyMajors(false);
  }, [majorsLoaded, majorsLoading, majors.length]);

  return {
    majors,
    majorsLoading,
    majorsLoaded,
    majorsError,
    showEmptyMajors,
  };
}
