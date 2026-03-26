/**
 * Business logic layer for Events API
 * Handles data transformation and error handling
 */

import { eventsAPI } from './events.api';
import { handleApiError } from '../common/error-handler';
import type {
  Event,
  EventResponse,
  DeleteEventResponse,
  GetEventsParams,
  GetEventsResponse,
  GetPublicEventsParams,
  GetPublicEventsResponse,
  CreateEventRequest,
  UpdateEventRequest,
} from './events.types';

/**
 * Get all events (Admin only)
 * 
 * @param params - Query parameters for filtering and pagination
 * @returns Promise with events list and pagination data
 */
export async function getAllEvents(params?: GetEventsParams): Promise<GetEventsResponse> {
  try {
    const response = await eventsAPI.getAll(params);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get event by ID
 * 
 * @param id - Event ID
 * @param includeDetails - Whether to include skill rewards, photos, and creator
 * @returns Promise with event data
 */
export async function getEventById(
  id: number,
  includeDetails: boolean = true
): Promise<Event> {
  try {
    const params = includeDetails
      ? {
          includeSkillRewards: true,
          includePhotos: true,
          includeCreator: true,
        }
      : undefined;

    const response = await eventsAPI.getById(id, params);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get event by slug
 * 
 * @param slug - Event slug
 * @param includeDetails - Whether to include skill rewards, photos, and creator
 * @returns Promise with event data
 */
export async function getEventBySlug(
  slug: string,
  includeDetails: boolean = true
): Promise<Event> {
  try {
    const params = includeDetails
      ? {
          includeSkillRewards: true,
          includePhotos: true,
          includeCreator: true,
        }
      : undefined;

    const response = await eventsAPI.getBySlug(slug, params);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get public events
 * 
 * @param params - Query parameters for filtering and pagination
 * @returns Promise with public events list
 */
export async function getPublicEvents(params?: GetPublicEventsParams): Promise<GetPublicEventsResponse> {
  try {
    const response = await eventsAPI.getPublic(params);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Build FormData from CreateEventRequest
 * 
 * @param data - Event data to be sent
 * @returns FormData ready to be sent to API
 */
export function buildEventFormData(data: CreateEventRequest): FormData {
  const formData = new FormData();

  // Append all fields to FormData
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    // Handle File objects (images)
    if (value instanceof File) {
      formData.append(key, value);
      return;
    }

    // Handle arrays (convert to JSON string)
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
      return;
    }

    // Handle other values
    formData.append(key, String(value));
  });

  return formData;
}

/**
 * Create new event
 * 
 * @param data - Event data (can be CreateEventRequest object or FormData)
 * @returns Promise with created event data
 */
export async function createEvent(
  data: CreateEventRequest | FormData
): Promise<EventResponse> {
  try {
    const formData = data instanceof FormData ? data : buildEventFormData(data);
    const response = await eventsAPI.create(formData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Update event
 * 
 * @param data - Event data with event_id (can be UpdateEventRequest object or FormData)
 * @returns Promise with updated event data
 */
export async function updateEvent(
  data: UpdateEventRequest | FormData
): Promise<EventResponse> {
  try {
    const formData = data instanceof FormData ? data : buildEventFormData(data as CreateEventRequest);
    
    // Ensure event_id is present for FormData
    if (data instanceof FormData && !data.has('event_id')) {
      throw new Error('event_id is required for updating an event');
    }

    const response = await eventsAPI.update(formData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Delete event
 * 
 * @param id - Event ID to delete
 * @returns Promise with deletion confirmation
 */
export async function deleteEvent(id: number): Promise<DeleteEventResponse> {
  try {
    const response = await eventsAPI.delete(id);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get event registration summary
 * 
 * @param eventId - Event ID
 * @returns Promise with registration summary data
 */
export async function getEventRegistrationSummary(eventId: number): Promise<unknown> {
  try {
    const response = await eventsAPI.getRegistrationSummary(eventId);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Export event registrations to Excel
 * 
 * @param eventId - Event ID
 * @param filename - Optional filename for download
 * @returns Promise that triggers download
 */
export async function exportEventRegistrations(
  eventId: number,
  filename?: string
): Promise<void> {
  try {
    const response = await eventsAPI.exportRegistrations(eventId);
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `event-${eventId}-registrations.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw handleApiError(error);
  }
}
