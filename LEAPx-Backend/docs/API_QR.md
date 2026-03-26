# QR Code Generation API

API สำหรับสร้าง QR code ที่เข้ารหัสและมีระยะเวลาหมดอายุ สำหรับระบบ check-in

## Table of Contents

- [POST /api/qr/generate](#post-apiqrgenerate) - สร้าง QR code สำหรับ check-in

---

## POST /api/qr/generate

สร้าง QR code ที่เข้ารหัสสำหรับ user check-in

### Endpoint
```
POST /api/qr/generate
```

### Authentication
ไม่ต้องการ (Public endpoint)

### Request Body

```json
{
  "userId": 123,
  "validityMinutes": 5
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | number | Yes | User ID ของผู้ใช้ที่ต้องการสร้าง QR code |
| validityMinutes | number | No | ระยะเวลาที่ QR code ใช้ได้ (1-60 นาที, default: 1) |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "encryptedData": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
  "expiry": 1642345678901,
  "validityMinutes": 5
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | สถานะความสำเร็จ |
| encryptedData | string | ข้อมูลที่เข้ารหัสแล้วสำหรับใส่ใน QR code |
| expiry | number | Timestamp (milliseconds) ที่ QR code จะหมดอายุ |
| validityMinutes | number | ระยะเวลาที่ใช้ได้ (นาที) |

#### Error Responses

**400 Bad Request** - ไม่มี userId
```json
{
  "error": "Missing required field: userId"
}
```

**400 Bad Request** - validityMinutes ไม่ถูกต้อง
```json
{
  "error": "Validity minutes must be between 1 and 60"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Encryption**:
   - เข้ารหัส userId และ timestamp ด้วย AES-256-CBC
   - ใช้ secret key จาก environment variable
   - สร้าง unique salt สำหรับแต่ละ QR code

2. **Expiry**:
   - คำนวณเวลาหมดอายุจาก validityMinutes
   - expiry = ปัจจุบัน + (validityMinutes × 60 × 1000)
   - QR code จะถูกตรวจสอบเวลาหมดอายุเมื่อ scan

3. **Validation**:
   - validityMinutes ต้องอยู่ระหว่าง 1-60 นาที
   - ป้องกัน QR code ที่มีอายุนานเกินไป

4. **Security**:
   - ไม่สามารถ reuse QR code ได้หลังหมดอายุ
   - ไม่สามารถ forge QR code ได้โดยไม่มี secret key
   - แต่ละ QR code มี unique salt

### QR Code Workflow

```
1. User requests QR code
   ↓
2. API generates encrypted data
   ↓
3. Client displays QR code (with encryptedData)
   ↓
4. Staff scans QR code
   ↓
5. Check-in API decrypts and validates:
   - Decrypt encryptedData
   - Check expiry time
   - Verify userId
   - Process check-in
```

### Example Usage

#### cURL

```bash
curl -X POST https://api.example.com/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "validityMinutes": 5
  }'
```

Response:
```json
{
  "success": true,
  "encryptedData": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
  "expiry": 1642345678901,
  "validityMinutes": 5
}
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/qr/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: user.id,
    validityMinutes: 5
  })
});

const data = await response.json();

if (data.success) {
  // Display QR code with data.encryptedData
  displayQRCode(data.encryptedData);
  
  // Show expiry countdown
  const expiryDate = new Date(data.expiry);
  console.log('QR expires at:', expiryDate);
}
```

#### React Component Example

```javascript
import QRCode from 'qrcode.react';
import { useState, useEffect } from 'react';

function UserQRCode({ userId }) {
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    generateQR();
  }, [userId]);

  useEffect(() => {
    if (!qrData) return;
    
    const timer = setInterval(() => {
      const remaining = Math.max(0, qrData.expiry - Date.now());
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        generateQR(); // Auto-refresh when expired
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [qrData]);

  const generateQR = async () => {
    const response = await fetch('/api/qr/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        validityMinutes: 5
      })
    });
    
    const data = await response.json();
    setQrData(data);
  };

  if (!qrData) return <div>Loading...</div>;

  const secondsLeft = Math.floor(timeLeft / 1000);

  return (
    <div>
      <QRCode value={qrData.encryptedData} size={256} />
      <p>Expires in: {secondsLeft} seconds</p>
      <button onClick={generateQR}>Refresh QR</button>
    </div>
  );
}
```

---

## QR Code Format

### Encrypted Data Structure

Before encryption (plain text):
```json
{
  "userId": 123,
  "timestamp": 1642345678901
}
```

After encryption (Base64 string):
```
U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=
```

### Decryption Process (Server-side)

```javascript
import { decryptSecureQRData } from '@/lib/qrEncryption';

// When staff scans QR code
const encryptedData = scannedQRCode; // From QR scanner

try {
  const { userId, timestamp } = decryptSecureQRData(encryptedData);
  
  // Check expiry
  const now = Date.now();
  if (now > timestamp) {
    throw new Error('QR code expired');
  }
  
  // Process check-in for userId
  await checkInUser(userId, eventId);
  
} catch (error) {
  console.error('Invalid or expired QR code:', error);
}
```

---

## Security Considerations

### Encryption

1. **Algorithm**: AES-256-CBC
2. **Key**: Stored in `QR_ENCRYPTION_SECRET` environment variable
3. **Salt**: Random salt generated for each QR code
4. **IV**: Random initialization vector

### Best Practices

1. **Short Validity Period**:
   - Default: 1 minute
   - Maximum: 60 minutes
   - Recommended: 2-5 minutes for events

2. **Auto-Refresh**:
   - Client should auto-refresh QR code before expiry
   - Recommended: refresh 10 seconds before expiry

3. **One-Time Use** (Optional):
   - Track used QR codes in database if needed
   - Prevent replay attacks

4. **Network Security**:
   - Always use HTTPS
   - Encrypted data should never be logged or exposed

### Common Issues

1. **Clock Synchronization**:
   - Server and client clocks must be reasonably synchronized
   - Use server timestamp as source of truth

2. **QR Code Quality**:
   - Use high error correction level (H = 30%)
   - Minimum size: 200x200 pixels
   - Good contrast for scanning

3. **Scanning Distance**:
   - QR code size should be appropriate for scanning distance
   - Recommended: 256x256 pixels for mobile scanning

---

## Testing

### Test Valid QR Generation

```bash
curl -X POST http://localhost:3000/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "validityMinutes": 5}'
```

### Test Invalid Validity

```bash
# Should fail - validityMinutes too high
curl -X POST http://localhost:3000/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "validityMinutes": 100}'

# Should fail - validityMinutes too low
curl -X POST http://localhost:3000/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "validityMinutes": 0}'
```

### Test Missing userId

```bash
# Should fail - missing userId
curl -X POST http://localhost:3000/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"validityMinutes": 5}'
```

---

## Integration with Check-in System

### Flow

1. **User generates QR code**:
   ```
   POST /api/qr/generate
   → Get encryptedData
   → Display as QR code
   ```

2. **Staff scans QR code**:
   ```
   Scan QR → Get encryptedData
   → POST /api/checkin/scan
   → Server decrypts and validates
   → Check-in successful
   ```

3. **Validation checks**:
   - QR code not expired
   - User exists
   - User registered for event
   - Check-in time valid
   - Not already checked in (if applicable)

### Related Endpoints

- `POST /api/checkin/scan` - Scan QR code to check-in
- `GET /api/checkin/status` - Check user's check-in status
- `POST /api/checkin/manual` - Manual check-in without QR

---

## Notes

### Recommended Validity Times by Use Case

| Use Case | Validity | Reason |
|----------|----------|--------|
| Event Check-in | 2-5 minutes | Balance security and convenience |
| Registration Desk | 1-2 minutes | Quick processing, high security |
| Self Check-in Kiosk | 5-10 minutes | Users may need time to approach kiosk |
| Testing | 1 minute | Fast expiry for testing |

### Performance

- Encryption time: < 10ms
- QR generation (client-side): 50-100ms
- Total latency: < 200ms

### Browser Compatibility

QR code display works on:
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Android Chrome)
- WebView in mobile apps

### Troubleshooting

**QR code won't scan:**
1. Check QR code size (minimum 200x200px)
2. Ensure good lighting
3. Check screen brightness
4. Verify encryptedData is complete

**QR code expired immediately:**
1. Check server/client time synchronization
2. Verify validityMinutes parameter
3. Check timezone settings

**Decryption fails:**
1. Verify QR_ENCRYPTION_SECRET is set correctly
2. Check encrypted data is not corrupted
3. Ensure same encryption library version on both ends
