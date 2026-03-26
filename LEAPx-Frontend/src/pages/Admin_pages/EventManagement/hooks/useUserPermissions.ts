/**
 * Custom hook for checking user permissions for major categories
 */

import { useState, useEffect } from 'react';
import { checkUserMajorRoles } from '../../../../services/api/majors/majors.service';

interface UseUserPermissionsResult {
  allowedMajorIds: Set<number> | null;
  allowedLoading: boolean;
  allowedError: string | null;
  majorsReady: boolean;
}

/**
 * Check user's permissions for managing major categories
 */
export function useUserPermissions(
  isActivityAdmin: boolean,
  loading: boolean
): UseUserPermissionsResult {
  const [allowedMajorIds, setAllowedMajorIds] = useState<Set<number> | null>(null);
  const [allowedLoading, setAllowedLoading] = useState(false);
  const [allowedError, setAllowedError] = useState<string | null>(null);

  // Determine if we're ready to fetch majors
  const majorsReady = isActivityAdmin ? allowedMajorIds !== null : !loading;

  useEffect(() => {
    if (!isActivityAdmin) {
      setAllowedMajorIds(new Set());
      return;
    }

    const ac = new AbortController();
    
    (async () => {
      try {
        setAllowedLoading(true);
        setAllowedError(null);
        
        const result = await checkUserMajorRoles();
        
        const ids = new Set<number>(
          result.majorCategories.map((mc) => mc.id)
        );

        setAllowedMajorIds(ids);
      } catch (e) {
        if ((e as DOMException).name !== 'AbortError') {
          setAllowedError('FETCH_FAILED');
          setAllowedMajorIds(new Set());
        }
      } finally {
        setAllowedLoading(false);
      }
    })();

    return () => ac.abort();
  }, [isActivityAdmin, loading]);

  return {
    allowedMajorIds,
    allowedLoading,
    allowedError,
    majorsReady,
  };
}
