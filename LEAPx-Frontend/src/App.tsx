import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes";
import { useNotification } from "./hooks/useNotification";
import NotificationPrompt from "./components/Notification/NotificationPrompt";

function App() {
  const { isSupported, isSubscribed, permission } = useNotification();

  useEffect(() => {
    // Log notification status เมื่อ app โหลด
    console.log('📱 Notification status:', {
      isSupported,
      isSubscribed,
      permission
    });
  }, [isSupported, isSubscribed, permission]);

  return (
    <div>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          // Default options
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '14px',
          },
          // Success
          success: {
            duration: 2000,
            style: {
              background: '#10b981',
            },
          },
          // Error
          error: {
            duration: 3000,
            style: {
              background: '#ef4444',
            },
          },
        }}
      />

      <NotificationPrompt />

      <AppRoutes />
    </div>
  );
}

export default App;