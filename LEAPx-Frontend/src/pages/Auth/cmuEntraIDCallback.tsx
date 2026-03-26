import axios, { AxiosError } from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";

interface SignInResponse {
    ok: boolean;
    message: string;
}

export default function CmuEntraIDCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const LEAP_BACKEND_URL = import.meta.env.VITE_LEAP_BACKEND_URL as string;

    const code = searchParams.get("code");
    const hasCalledRef = useRef(false);

    useEffect(() => {
        if (!code || hasCalledRef.current) return;

        hasCalledRef.current = true;

        axios
            .post<SignInResponse>(
                `${LEAP_BACKEND_URL}/api/signIn`,
                { authorizationCode: code },
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            )
            .then((resp) => {
                if (resp.data.ok) {
                    navigate("/leap_cmu");
                }
            })
            .catch((error: AxiosError<SignInResponse>) => {
                console.error("CMU EntraID callback error:", error);
                navigate("/login");
            });
    }, [LEAP_BACKEND_URL, code, navigate]);
    return <div className="min-h-screen w-full bg-white"></div>;
}