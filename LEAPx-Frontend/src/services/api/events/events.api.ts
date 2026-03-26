import { apiClient } from '../common/api-client';
import type {
  Event,
  EventResponse,
  DeleteEventResponse,
  GetEventsParams,
  GetEventsResponse,
  GetPublicEventsParams,
  GetPublicEventsResponse,
} from './events.types';

/**
 * Events API endpoints
 */
export const eventsAPI = {
  /**
   * Get all events (Admin only)
   * GET /api/events
   */
  getAll: (params?: GetEventsParams) =>
    apiClient.get<GetEventsResponse>('/api/events', { params }),

  /**
   * Get event by ID
   * GET /api/events/:id
   */
  getById: (id: number, params?: { includeSkillRewards?: boolean; includePhotos?: boolean; includeCreator?: boolean }) =>
    apiClient.get<{ success: boolean; data: Event }>(`/api/events/${id}`, { params }),

  /**
   * Get event by slug
   * GET /api/events/slug/:slug
   */
  getBySlug: (slug: string, params?: { includeSkillRewards?: boolean; includePhotos?: boolean; includeCreator?: boolean }) =>
    apiClient.get<{ success: boolean; data: Event }>(`/api/events/slug/${encodeURIComponent(slug)}`, { params }),

  /**
   * Get public events
   * GET /api/events/public
   */
  getPublic: (params?: GetPublicEventsParams) =>
    apiClient.get<GetPublicEventsResponse>('/api/events/public', { params }),

  /**
   * Create new event
   * POST /api/events
   * @param formData - FormData containing event data and images
   */
  create: (formData: FormData) =>
    apiClient.post<EventResponse>('/api/events', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  /**
   * Update event
   * PUT /api/events
   * @param formData - FormData containing event_id and fields to update
   */
  update: (formData: FormData) =>
    apiClient.put<EventResponse>('/api/events', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  /**
   * Delete event
   * DELETE /api/events?id={id}
   */
  delete: (id: number) =>
    apiClient.delete<DeleteEventResponse>('/api/events', {
      params: { id },
    }),

  /**
   * Get event registration summary
   * GET /api/events/:eventId/registrations/summary
   */
  getRegistrationSummary: (eventId: number) =>
    apiClient.get<{ success: boolean; data: unknown }>(`/api/events/${eventId}/registrations/summary`),

  /**
   * Export registrations to Excel
   * GET /api/events/:eventId/xlsx
   */
  exportRegistrations: (eventId: number) =>
    apiClient.get(`/api/events/${eventId}/xlsx`, {
      responseType: 'blob',
    }),
};
