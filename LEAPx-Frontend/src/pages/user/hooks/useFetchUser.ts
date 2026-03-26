import { useState, useEffect } from 'react';
import type { User, ApiResponse } from '../../../../types/user/user';
import { backend_url } from '../../../../utils/constants';

export const useFetchUser = () => {
    const [userData, setUserData] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
        try {
            const response = await fetch(`${backend_url}/api/auth`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            });

            if (!response.ok) {
            throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
            }

            const data: ApiResponse = await response.json();

            if (data.success && data.user) {
            setUserData(data.user);
            } else {
            setError('ไม่พบข้อมูลผู้ใช้');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
            console.error('Error fetching user data:', err);
        } finally {
            setLoading(false);
        }
        };

        fetchUserData();
    }, []);

    return { userData, loading, error };
};