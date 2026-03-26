import { useState, useEffect } from 'react';
import axios from 'axios';
import type {
    SkillSummaryResponse,
    SkillDetailResponse,
    EventHistoryResponse,
    StaffHistoryResponse,
} from '../../../../types/user/user';

const BACKEND_URL = import.meta.env.VITE_LEAP_BACKEND_URL;
const BACKEND_CODE = import.meta.env.VITE_LEAP_BACKEND_CODE;

const api = axios.create({
    baseURL: BACKEND_URL,
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': BACKEND_CODE,
    },
    withCredentials: true,
});

export const useSkillSummary = () => {
    const [data, setData] = useState<SkillSummaryResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await api.get<SkillSummaryResponse>('/api/exp?format=summary');
                if (response.data.success) {
                    setData(response.data.data);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch skill summary');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};

export const useSkillDetail = () => {
    const [data, setData] = useState<SkillDetailResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await api.get<SkillDetailResponse>('/api/exp/lv');
                if (response.data.success) {
                    setData(response.data.data);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch skill details');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};

// Server-side pagination for Event History
export const useEventHistory = (page: number = 1, limit: number = 10) => {
    const [data, setData] = useState<EventHistoryResponse['data']>([]);
    const [pagination, setPagination] = useState<{
        currentPage: number;
        totalPages: number;
        totalCount: number;
        limit: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await api.get<EventHistoryResponse>(
                    `/api/events/register/user?page=${page}&limit=${limit}`
                );
                if (response.data.success) {
                    setData(response.data.data);
                    setPagination(response.data.pagination || null);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch event history');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [page, limit]);

    return { data, pagination, loading, error };
};

// Server-side pagination for Staff History
export const useStaffHistory = (page: number = 1, limit: number = 10) => {
    const [data, setData] = useState<StaffHistoryResponse['data']>([]);
    const [pagination, setPagination] = useState<{
        currentPage: number;
        totalPages: number;
        totalCount: number;
        limit: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await api.get<StaffHistoryResponse>(
                    `/api/events/register/staff?page=${page}&limit=${limit}`
                );
                if (response.data.success) {
                    setData(response.data.data);
                    setPagination(response.data.pagination || null);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch staff history');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [page, limit]);

    return { data, pagination, loading, error };
};

// Optional: Hook for getting all data without pagination (for statistics)
export const useAllEventHistory = () => {
    const [data, setData] = useState<EventHistoryResponse['data']>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch with large limit to get all data for stats
                const response = await api.get<EventHistoryResponse>(
                    '/api/events/register/user?limit=9999'
                );
                if (response.data.success) {
                    setData(response.data.data);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch event history');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};

export const useAllStaffHistory = () => {
    const [data, setData] = useState<StaffHistoryResponse['data']>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch with large limit to get all data for stats
                const response = await api.get<StaffHistoryResponse>(
                    '/api/events/register/staff?limit=9999'
                );
                if (response.data.success) {
                    setData(response.data.data);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch staff history');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};