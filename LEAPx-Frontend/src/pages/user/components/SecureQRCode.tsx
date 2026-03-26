import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield } from 'lucide-react';
import { backend_url } from '../../../../utils/constants';

interface SecureQRCodeProps {
    userId: number;
    isVisible: boolean;
    validityMinutes?: number;
    apiBaseUrl?: string;
}

export const SecureQRCode: React.FC<SecureQRCodeProps> = ({ 
    userId, 
    isVisible,
    validityMinutes = 1,
    apiBaseUrl = backend_url || 'http://localhost:3000'
}) => {
    const [qrData, setQrData] = useState<string>('');
    const [expiryTime, setExpiryTime] = useState<string>('');

    useEffect(() => {
        const generateQR = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/api/qr/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // 'Authorization': `Bearer ${yourToken}`
                    },
                    body: JSON.stringify({
                        userId,
                        validityMinutes
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to generate QR code');
                }

                const result = await response.json();
                
                setQrData(result.encryptedData);
                
                const expiryDate = new Date(result.expiry);
                setExpiryTime(expiryDate.toLocaleTimeString('th-TH'));
            } catch (error) {
                console.error('Error generating QR code:', error);
            }
        };

        if (isVisible) {
            generateQR();
            // Auto-refresh ก่อนหมดอายุ
            const interval = setInterval(generateQR, validityMinutes * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [userId, isVisible, validityMinutes, apiBaseUrl]);

    if (!isVisible || !qrData) {
        return (
            <div className="flex items-center justify-center bg-white rounded-lg">
                <div className="text-center text-gray-600">
                    <Shield className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm font-medium">Protected</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col relative bg-white items-center">
            <QRCodeSVG
                value={qrData}
                size={200}
                level="H"
                imageSettings={{
                    src: "/logo.png",
                    height: 50,
                    width: 50,
                    excavate: true,
                }}
            />
            <div className="mt-2 text-center text-xs text-gray-600">
                <p>หมดอายุ: {expiryTime}</p>
            </div>
        </div>
    );
};