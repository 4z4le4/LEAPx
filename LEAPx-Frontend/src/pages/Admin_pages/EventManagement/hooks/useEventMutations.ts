/**
 * Custom hooks for Event API operations
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent, updateEvent } from '../../../../services/api/events/events.service';
import type { EventResponse } from '../../../../services/api/events/events.types';

export type EventFormMode = 'create' | 'edit';

interface UseEventMutationsResult {
  submitting: boolean;
  showResult: 'success' | 'error' | null;
  errorMsg: string;
  createdId: number | null;
  createdSlug: string | null;
  saveEvent: (formData: FormData, mode: EventFormMode, eventId?: number | null) => Promise<void>;
  setShowResult: (state: 'success' | 'error' | null) => void;
  navigateToEventList: () => void;
  navigateToEventDetail: () => void;
}

/**
 * Hook for creating and updating events
 */
export function useEventMutations(): UseEventMutationsResult {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const saveEvent = async (
    formData: FormData,
    mode: EventFormMode,
    eventId?: number | null
  ): Promise<void> => {
    try {
      setSubmitting(true);
      setShowResult(null);
      setErrorMsg('');

      let result: EventResponse;

      if (mode === 'edit') {
        if (!eventId) {
          throw new Error('ไม่พบ event_id สำหรับแก้ไข');
        }
        formData.append('event_id', String(eventId));
        result = await updateEvent(formData);
      } else {
        result = await createEvent(formData);
      }

      setCreatedId(result.data.id);
      setCreatedSlug(result.data.slug);
      setShowResult('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useEventMutations] Error:', err);
      setErrorMsg(msg);
      setShowResult('error');
    } finally {
      setSubmitting(false);
    }
  };

  const navigateToEventList = () => {
    navigate('/admin/events');
  };

  const navigateToEventDetail = () => {
    if (createdSlug) {
      navigate(`/activities/${createdSlug}`);
    } else if (createdId) {
      navigate(`/admin/events/${createdId}`);
    }
  };

  return {
    submitting,
    showResult,
    errorMsg,
    createdId,
    createdSlug,
    saveEvent,
    setShowResult,
    navigateToEventList,
    navigateToEventDetail,
  };
}
