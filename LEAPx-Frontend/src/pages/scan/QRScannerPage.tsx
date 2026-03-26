'use client';
import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Camera, Users, UserCheck, CheckCircle, XCircle, Clock, Video, Scan } from 'lucide-react';
import type { QRCodeData, CheckInOutRequest, ScanResult, ScanMode, Event } from '../../../types/scan/scanner';

const QRScannerPage: React.FC = () => {
  const [scanMode, setScanMode] = useState<ScanMode>('user');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [action, setAction] = useState<'checkin' | 'checkout'>('checkin');
  const [eventId, setEventId] = useState<number>(1);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoadingEvents(true);
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL || ''}/api/events/public?page=1&limit=12&sortBy=activityStart`
        );
        
        if (!response.ok) {
          throw new Error('ไม่สามารถโหลดข้อมูลกิจกรรมได้');
        }

        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setEvents(result.data);
          if (result.data.length > 0) {
            setEventId(result.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting devices:', error);
      }
    };

    if (isScanning) {
      getDevices();
    }
  }, [isScanning, selectedDeviceId]);

  const validateQRCode = (data: string): QRCodeData | null => {
    try {
      const parsed: QRCodeData = JSON.parse(data);
      
      if (!parsed.userId || !parsed.timestamp || !parsed.expiry) {
        return null;
      }

      const now = Date.now();
      if (now > parsed.expiry) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  };

  const performCheckInOut = async (userId: number): Promise<ScanResult> => {
    const endpoint = scanMode === 'user' 
      ? '/api/events/checkin_out/user'
      : '/api/events/checkin_out/staff';

    const requestBody: CheckInOutRequest = {
      eventId,
      userId,
      action
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }

      return {
        success: true,
        message: `${action === 'checkin' ? 'เช็คอิน' : 'เช็คเอาท์'}สำเร็จ`,
        userId,
        action
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        userId
      };
    }
  };

  const handleScan = async (detectedCodes: { rawValue: string }[]): Promise<void> => {
    if (isProcessing || !detectedCodes || detectedCodes.length === 0) return;

    setIsProcessing(true);

    const result = detectedCodes[0].rawValue;
    const qrData = validateQRCode(result);

    if (!qrData) {
      setLastResult({
        success: false,
        message: 'QR Code ไม่ถูกต้องหรือหมดอายุแล้ว'
      });
      setIsProcessing(false);
      setTimeout(() => setLastResult(null), 3000);
      return;
    }

    const scanResult = await performCheckInOut(qrData.userId);
    setLastResult(scanResult);
    setIsProcessing(false);

    setTimeout(() => {
      setLastResult(null);
    }, 3000);
  };

  const handleError = (error: unknown): void => {
    console.error('Scanner error:', error);
    setLastResult({
      success: false,
      message: 'เกิดข้อผิดพลาดกับกล้อง กรุณาตรวจสอบการอนุญาตใช้งานกล้อง'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Scan className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                ระบบสแกน QR Code
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                เช็คอิน/เช็คเอาท์ สำหรับกิจกรรม
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ประเภทผู้ใช้
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setScanMode('user')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                    scanMode === 'user'
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>User</span>
                </button>
                <button
                  onClick={() => setScanMode('staff')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                    scanMode === 'staff'
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Staff</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                การดำเนินการ
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAction('checkin')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                    action === 'checkin'
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>เช็คอิน</span>
                </button>
                <button
                  onClick={() => setAction('checkout')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                    action === 'checkout'
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>เช็คเอาท์</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                เลือกกิจกรรม
              </label>
              {isLoadingEvents ? (
                <div className="w-full py-4 px-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-900 border-t-transparent"></div>
                  <span className="text-sm text-gray-600">กำลังโหลดกิจกรรม...</span>
                </div>
              ) : events.length > 0 ? (
                <select
                  value={eventId}
                  onChange={(e) => setEventId(Number(e.target.value))}
                  className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white text-gray-900 font-medium appearance-none cursor-pointer transition-all"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title_TH} ({new Date(event.activityStart).toLocaleDateString('th-TH', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full py-4 px-4 border border-red-200 rounded-lg bg-red-50 text-center">
                  <span className="text-sm font-medium text-red-700">ไม่พบกิจกรรม</span>
                </div>
              )}
            </div>

            {isScanning && devices.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  เลือกกล้อง
                </label>
                <div className="relative">
                  <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full py-3 pl-11 pr-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white font-medium appearance-none cursor-pointer transition-all"
                  >
                    {devices.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `กล้อง ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`w-full mt-8 py-4 px-6 rounded-lg font-semibold text-base transition-all flex items-center justify-center gap-2 ${
              isScanning
                ? 'bg-gray-900 hover:bg-gray-800 text-white'
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            <Camera className="w-5 h-5" />
            {isScanning ? 'หยุดสแกน' : 'เริ่มสแกน QR Code'}
          </button>
        </div>

        {isScanning && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="relative rounded-lg overflow-hidden bg-black">
              <Scanner
                onScan={handleScan}
                onError={handleError}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-6 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-3 border-gray-900 border-t-transparent"></div>
                    <span className="text-base font-medium text-gray-900">กำลังประมวลผล...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {lastResult && (
          <div
            className={`rounded-lg shadow-sm border p-6 mb-6 ${
              lastResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                lastResult.success ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {lastResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-1 ${
                  lastResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {lastResult.success ? 'สำเร็จ' : 'เกิดข้อผิดพลาด'}
                </h3>
                <p className={`text-sm mb-3 ${
                  lastResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {lastResult.message}
                </p>
                {lastResult.userId && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium ${
                      lastResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      <Users className="w-3.5 h-3.5" />
                      User ID: {lastResult.userId}
                    </span>
                    {lastResult.action && (
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium ${
                        lastResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        {lastResult.action === 'checkin' ? 'เช็คอิน' : 'เช็คเอาท์'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default QRScannerPage;