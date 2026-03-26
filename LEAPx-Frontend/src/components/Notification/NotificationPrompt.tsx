import { useNotificationPrompt } from '../../hooks/useNotification';
import { useNotification } from '../../hooks/useNotification';

export default function NotificationPrompt() {
    const { showPrompt, dismissPrompt } = useNotificationPrompt();
    const { requestPermission } = useNotification();

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white shadow-xl rounded-lg p-4 border border-gray-200 z-50 animate-slide-up">
        <div className="flex items-start gap-3">
            {/* Icon */}
            {/* <div className="flex-shrink-0 text-3xl">
            </div> */}

            {/* Content */}
            <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-base">
                รับการแจ้งเตือน
            </h3>
            <p className="text-sm text-gray-600 mt-1">
                ไม่พลาดกิจกรรม ข่าวสาร และการอัปเดตสำคัญจาก LEAP
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
                <button
                onClick={async () => {
                    const success = await requestPermission();
                    if (success) {
                    dismissPrompt();
                    }
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                เปิดการแจ้งเตือน
                </button>
                <button
                onClick={dismissPrompt}
                className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800 transition-colors"
                >
                ไว้ทีหลัง
                </button>
            </div>
            </div>

            {/* Close Button */}
            <button
            onClick={dismissPrompt}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
            >
            <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
            >
                <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
                />
            </svg>
            </button>
        </div>
        </div>
    );
}

