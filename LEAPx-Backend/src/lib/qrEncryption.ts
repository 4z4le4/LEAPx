import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.QR_KEY || 'leap-32-character-secret-key!!'; // ต้องเป็น 32 characters
const IV_LENGTH = 16;

function getKey(): Buffer {
    return crypto.createHash('sha256').update(SECRET_KEY).digest();
}

export function encryptQRData(data: string): string {
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt QR data');
    }
}


export function decryptQRData(encryptedData: string): string {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted data format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt QR data');
    }
}


export function generateSecureQRData(userId: number, validityMinutes: number = 1): string {
    const now = Date.now();
    const expiry = now + (validityMinutes * 60 * 1000);
    
    const data = JSON.stringify({
        userId,
        timestamp: now,
        expiry,
        nonce: crypto.randomBytes(8).toString('hex') 
    });
    
    return encryptQRData(data);
}

export interface DecryptedQRData {
    userId: number;
    timestamp: number;
    expiry: number;
    nonce: string;
}

export function verifyAndDecryptQRData(encryptedData: string): {
    valid: boolean;
    data?: DecryptedQRData;
    error?: string;
} {
    try {
        // ถอดรหัส
        const decrypted = decryptQRData(encryptedData);
        const data: DecryptedQRData = JSON.parse(decrypted);
        
        // ตรวจสอบว่ามีข้อมูลครบถ้วน
        if (!data.userId || !data.timestamp || !data.expiry || !data.nonce) {
            return {
                valid: false,
                error: 'Invalid QR code format'
            };
        }
        
        // ตรวจสอบว่าหมดอายุหรือยัง
        const now = Date.now();
        if (now > data.expiry) {
            const expiredMinutes = Math.floor((now - data.expiry) / 60000);
            return {
                valid: false,
                error: `QR code expired ${expiredMinutes} minute(s) ago`
            };
        }
        
        // ตรวจสอบว่า timestamp ไม่อยู่ในอนาคต (ป้องกัน time manipulation)
        if (data.timestamp > now) {
            return {
                valid: false,
                error: 'Invalid QR code timestamp'
            };
        }
        
        return {
            valid: true,
            data
        };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Failed to verify QR code'
        };
    }
}