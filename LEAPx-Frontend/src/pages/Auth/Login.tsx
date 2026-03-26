import { ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import Logo_google from "../../assets/logo/google-login-logo.png";
import Logo_CMU from "../../assets/logo/cmu-login-logo.png";
import LEAP_logo from "../../assets/logo/Logo2_1.png";
import { useAuth } from "../../context/AuthContext";

function GoogleLoginButton() {
  const BACKEND_URL = import.meta.env.VITE_LEAP_BACKEND_URL as string;
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );
        const userInfo = await response.json();

        if (!userInfo.email) {
          toast.error("ไม่สามารถรับข้อมูลอีเมลจาก Google ได้", {
            duration: 3000,
            position: "top-center",
          });
          return;
        }

        const loginData = {
          email: userInfo.email,
          Fname: userInfo.given_name || "User",
          Lname: userInfo.family_name || "-",
          faculty: "Google User",
          picture: userInfo.picture || "",
        };

        const backendResponse = await fetch(`${BACKEND_URL}/api/auth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(loginData),
        });

        if (!backendResponse.ok) {
          const errorData = await backendResponse.json().catch(() => ({}));
          const errorMessage =
            errorData.error || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
          toast.error(errorMessage, {
            duration: 4000,
            position: "top-center",
          });
          console.error("Backend error:", errorData);
          return;
        }
        const backendResult = await backendResponse.json();
        if (backendResult.success && backendResult.user) {
          localStorage.setItem("token", backendResult.token);
          localStorage.setItem("user", JSON.stringify(backendResult.user));

          toast.success("เข้าสู่ระบบสำเร็จ!", {
            duration: 2000,
            position: "top-center",
          });

          setTimeout(() => {
            window.location.href = "/home";
          }, 1000);
        } else {
          toast.error("เกิดข้อผิดพลาดในการเข้าสู่ระบบ", {
            duration: 3000,
            position: "top-center",
          });
        }
      } catch (error) {
        console.error("Login error:", error);
        toast.error("เกิดข้อผิดพลาดในการเข้าสู่ระบบ", {
          duration: 3000,
          position: "top-center",
        });
      }
    },
    onError: () => {
      toast.error("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google", {
        duration: 3000,
        position: "top-center",
      });
    },
  });

  return (
    <button
      onClick={() => login()}
      className="w-full group relative rounded-xl px-6 py-4 font-semibold 
                bg-white text-gray-700 border-2 border-gray-300
                shadow-md hover:shadow-lg hover:border-gray-400
                hover:-translate-y-0.5 active:translate-y-0 
                transition-all duration-200 flex items-center justify-center space-x-3"
    >
      <img
        src={Logo_google}
        alt="Google Logo"
        className="h-6 w-auto flex-shrink-0"
      />
      <span className="flex-1 text-center">Login with Google Account</span>
      <ArrowRight
        size={20}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      />
    </button>
  );
}

export default function Login() {
  const clientId = import.meta.env.VITE_CMU_ENTRAID_CLIENT_ID as string;
  const redirectUri = import.meta.env.VITE_CMU_ENTRAID_REDIRECT_URL as string;
  const scope = import.meta.env.VITE_CMU_ENTRAID_SCOPE as string;
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
  const CmuentraidURL = `https://login.microsoftonline.com/cf81f1df-de59-4c29-91da-a2dfd04aa751/oauth2/v2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}&state=xyz`;

  const handleCMULogin = () => {
    toast.loading("กำลังเชื่อมต่อกับ CMU Account...", {
      duration: 2000,
      position: "top-center",
    });
  };

  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-200 via-emerald-100 to-cyan-200 p-4">
      <Toaster />
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-2xl overflow-hidden bg-white">
          <div className="bg-gradient-to-br from-sky-400 to-teal-400 px-8 py-10">
            <div className="flex flex-col items-center space-y-3">
              <img
                src={LEAP_logo}
                alt="LEAP Logo"
                className="h-auto w-auto"
              />
            </div>
          </div>

          <div className="p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                ยินดีต้อนรับ
              </h2>
              <p className="text-gray-600 text-sm">
                เข้าสู่ระบบเพื่อเริ่มต้นการเรียนรู้
              </p>
            </div>

            <div className="space-y-3">
              {/* CMU Login Button */}
              <a href={CmuentraidURL} onClick={handleCMULogin}>
                <button
                  className="w-full group relative rounded-xl px-6 py-4 font-semibold 
                                        bg-gradient-to-r from-sky-600 to-sky-700 text-white 
                                        shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40
                                        hover:-translate-y-0.5 active:translate-y-0 
                                        transition-all duration-200 flex items-center justify-center space-x-3"
                >
                  <img
                    src={Logo_CMU}
                    alt="CMU Logo"
                    className="h-6 w-auto flex-shrink-0"
                  />
                  <span className="flex-1 text-center">
                    Login with CMU Account
                  </span>
                  <ArrowRight
                    size={20}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  />
                </button>
              </a>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">หรือ</span>
                </div>
              </div>

              {/* Google Login Button */}
              {googleClientId ? (
                <GoogleOAuthProvider clientId={googleClientId}>
                  <GoogleLoginButton />
                </GoogleOAuthProvider>
              ) : (
                <button
                  disabled
                  className="w-full rounded-xl px-6 py-4 font-semibold 
                                        bg-gray-200 text-gray-500 border-2 border-gray-200
                                        cursor-not-allowed flex items-center justify-center space-x-3"
                >
                  <img
                    src={Logo_google}
                    alt="Google Logo"
                    className="h-6 w-auto flex-shrink-0 opacity-50"
                  />
                  <span className="flex-1 text-center">
                    Google Login (ไม่พร้อมใช้งาน)
                  </span>
                </button>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">
              การเข้าสู่ระบบแสดงว่าคุณยอมรับ
              <a href="/terms" className="text-sky-600 hover:underline ml-1">
                เงื่อนไขการใช้งาน
              </a>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-700">
          ต้องการความช่วยเหลือ{" "}
          <a href="#" className="text-sky-600 font-semibold hover:underline">
            ติดต่อเรา
          </a>
        </p>
      </div>
    </div>
  );
}