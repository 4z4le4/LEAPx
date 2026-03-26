import { useEffect } from 'react';

export const useScreenshotProtection = (
    setIsQRVisible: (visible: boolean) => void
) => {
    useEffect(() => {
        const handleVisibilityChange = () => {
        setIsQRVisible(!document.hidden);
        };

        const preventScreenshot = (e: KeyboardEvent) => {
        if (
            (e.key === 'PrintScreen') ||
            (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
            (e.ctrlKey && e.key === 'p')
        ) {
            e.preventDefault();
            setIsQRVisible(false);
            setTimeout(() => setIsQRVisible(true), 2000);
        }
        };

        const handleBlur = () => setIsQRVisible(false);
        const handleFocus = () => setIsQRVisible(true);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('keyup', preventScreenshot);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('keyup', preventScreenshot);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
        };
    }, [setIsQRVisible]);
};