import { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import Loader from "../../components/Loader/Loader";

interface CMUBasicInfo {
  cmuitaccount_name: string;
  cmuitaccount: string;
  student_id: string;
  prename_id: string;
  prename_TH: string;
  prename_EN: string;
  firstname_TH: string;
  firstname_EN: string;
  lastname_TH: string;
  lastname_EN: string;
  organization_code: string;
  organization_name_TH: string;
  organization_name_EN: string;
  itaccounttype_id: string;
  itaccounttype_TH: string;
  itaccounttype_EN: string;
}

interface WhoAmIResponse {
  ok: boolean;
  cmuBasicInfo?: CMUBasicInfo[];
  message?: string;
}

interface AuthRequest {
  cmu_id?: string;
  email: string;
  Fname: string;
  Lname: string;
  faculty: string;
  picture: string;
}

interface AuthResponse {
  success: boolean;
  user?: CMUBasicInfo | Record<string, unknown>;
  token?: string;
  error?: string;
}

export default function Leap_CMU() {
  const [, setUserInfo] = useState<CMUBasicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(false);

  const hasAuthenticated = useRef(false);

  const LEAP_BACKEND_URL = import.meta.env.VITE_LEAP_BACKEND_URL as string;
  const LEAP_Code = import.meta.env.VITE_LEAP_BACKEND_CODE as string;

  useEffect(() => {
    if (hasAuthenticated.current) return;
    hasAuthenticated.current = true;

    const authenticateUser = async () => {
      setAuthLoading(true);
      let loadingToast: string | undefined;

      try {
        // Show loading toast
        loadingToast = toast.loading("กำลังตรวจสอบข้อมูล CMU Account...", {
          position: "top-center",
        });

        // First fetch user info
        const response = await axios.get<WhoAmIResponse>(
          `${LEAP_BACKEND_URL}/api/whoAmI`,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.ok && response.data.cmuBasicInfo) {
          const user = response.data.cmuBasicInfo[0];
          setUserInfo(user);

          // Update toast
          toast.loading("กำลังเข้าสู่ระบบ...", {
            id: loadingToast,
            position: "top-center",
          });

          // Create auth request body
          const authData: AuthRequest = {
            cmu_id: `${user.student_id}` || undefined,
            email: `${user.cmuitaccount}`,
            Fname: user.firstname_EN,
            Lname: user.lastname_EN,
            faculty: user.organization_name_EN,
            picture: "-",
          };

          // Send auth request
          const authResponse = await axios.post<AuthResponse>(
            `${LEAP_BACKEND_URL}/api/auth`,
            authData,
            {
              withCredentials: true,
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (
            (authResponse.status === 200 || authResponse.status === 201) &&
            authResponse.data.success
          ) {
            // Store token and user data in localStorage
            if (authResponse.data.token) {
              localStorage.setItem("token", authResponse.data.token);
            }
            if (authResponse.data.user) {
              localStorage.setItem(
                "user",
                JSON.stringify(authResponse.data.user)
              );
            }

            toast.dismiss(loadingToast);

            // Success toast
            toast.success("เข้าสู่ระบบสำเร็จ!", {
              duration: 2000,
              position: "top-center",
            });

            // Redirect after short delay
            setTimeout(() => {
              window.location.href = "/home";
            }, 1500);
          } else {
            throw new Error(
              authResponse.data.error || "Authentication failed"
            );
          }
        } else {
          if (loadingToast) toast.dismiss(loadingToast);
          const errorMsg =
            response.data.message || "ไม่สามารถดึงข้อมูลผู้ใช้ได้";
          toast.error(errorMsg, {
            duration: 3000,
            position: "top-center",
          });
          setError(errorMsg);
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        }
      } catch (err: unknown) {
        console.error("Authentication error:", err);

        if (loadingToast) toast.dismiss(loadingToast);

        const getErrorMessage = (error: unknown): string => {
          if (axios.isAxiosError(error)) {
            const respData = error.response?.data;
            const serverError =
              respData && typeof respData === "object" && "error" in respData
                ? (respData as { error?: unknown }).error
                : undefined;
            if (typeof serverError === "string" && serverError.length > 0) {
              return serverError;
            }
            return error.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
          }

          if (error instanceof Error) {
            return error.message;
          }
          if (typeof error === "string") {
            return error;
          }
          return "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
        };

        const errorMsg = getErrorMessage(err);

        toast.error(errorMsg, {
          duration: 3000,
          position: "top-center",
        });

        setError(errorMsg);
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } finally {
        setLoading(false);
        setAuthLoading(false);
      }
    };

    authenticateUser();
  }, [LEAP_BACKEND_URL, LEAP_Code]);

  if (loading || authLoading) {
    return (
      <>
        <Toaster />
        <Loader />
      </>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Toaster />
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <Loader />
    </>
  );
}