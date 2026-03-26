# Check-in/Check-out System API

API สำหรับระบบเช็คอิน/เช็คเอาท์กิจกรรม รองรับทั้งผู้เข้าร่วมกิจกรรมและสตาฟฟ์

## Table of Contents

- [POST /api/events/checkin_out/user](#post-apieventscheckin_outuser) - เช็คอิน/เช็คเอาท์สำหรับผู้เข้าร่วมกิจกรรม
- [POST /api/events/checkin_out/staff](#post-apieventscheckin_outstaff) - เช็คอิน/เช็คเอาท์สำหรับสตาฟฟ์
- [QR Code System](#qr-code-system) - ระบบ QR Code และการเข้ารหัส
- [Operation Modes](#operation-modes) - โหมดการทำงาน Auto-detect และ Manual
- [Check-in Models](#check-in-models) - Single และ Multiple Check-ins
- [Walk-in Registration](#walk-in-registration) - การลงทะเบียนแบบ Walk-in
- [Late Penalty System](#late-penalty-system) - ระบบคิดคะแนนเข้าสาย
- [Experience Points](#experience-points) - ระบบคำนวณ EXP และ Skill Rewards

---

## POST /api/events/checkin_out/user

เช็คอิน/เช็คเอาท์สำหรับผู้เข้าร่วมกิจกรรม รองรับทั้ง Single check-in และ Multiple check-ins ตาม Time Slots

### Endpoint
```
POST /api/events/checkin_out/user
```

### Authentication
Required - Event Staff Authentication (withEventStaffAuth middleware)

### Request Body

#### Auto-detect Mode
```json
{
  "eventId": 123,
  "qrCode": "encrypted_qr_data...",
  "userId": 456
}
```

#### Manual Mode
```json
{
  "eventId": 123,
  "qrCode": "encrypted_qr_data...",
  "action": "checkin"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| eventId | number | Yes | ID ของกิจกรรม |
| qrCode | string | No | QR Code ที่เข้ารหัสพร้อม userId (ต้องมี qrCode หรือ userId) |
| userId | number | No | ID ของผู้ใช้ (ใช้เมื่อไม่มี qrCode) |
| action | string | No | "checkin" หรือ "checkout" (ถ้าไม่ระบุจะเป็น Auto-detect mode) |

### Response

#### Success - Single Check-in (200 OK)

```json
{
  "success": true,
  "action": "checkin",
  "mode": "single",
  "isAutomatic": true,
  "message": "Checked in successfully",
  "data": {
    "userId": 456,
    "registration": {
      "id": 789,
      "user_id": 456,
      "event_id": 123,
      "checkedIn": true,
      "checkInTime": "2026-02-27T10:30:00.000Z",
      "status": "ATTENDED"
    },
    "isLate": false,
    "checkInTime": "2026-02-27T10:30:00.000Z"
  }
}
```

#### Success - Multiple Check-in (200 OK)

```json
{
  "success": true,
  "action": "checkin",
  "mode": "multiple",
  "isAutomatic": true,
  "message": "Checked in for slot 1",
  "data": {
    "userId": 456,
    "slot": {
      "id": 10,
      "slot_number": 1,
      "startTime": "2026-02-27T10:00:00.000Z",
      "endTime": "2026-02-27T11:00:00.000Z"
    },
    "checkInTime": "2026-02-27T10:15:00.000Z",
    "isLate": false,
    "totalSlotsCheckedIn": 1,
    "totalSlots": 3,
    "absentSlots": 0
  }
}
```

#### Success - Walk-in Registration (200 OK)

```json
{
  "success": true,
  "action": "checkin",
  "mode": "single",
  "isAutomatic": true,
  "message": "Walk-in registration created and checked in successfully",
  "data": {
    "userId": 456,
    "registration": {
      "id": 789,
      "user_id": 456,
      "event_id": 123,
      "registrationType": "WALK_IN",
      "status": "ATTENDED"
    },
    "isLate": false
  }
}
```

#### Success - Checkout with EXP (200 OK)

```json
{
  "success": true,
  "action": "checkout",
  "mode": "multiple",
  "isAutomatic": true,
  "message": "Checked out from slot 3. Event completed!",
  "data": {
    "userId": 456,
    "slot": {
      "id": 12,
      "slot_number": 3
    },
    "checkOutTime": "2026-02-27T15:00:00.000Z",
    "completedSlots": 3,
    "totalSlots": 3,
    "isFullyCompleted": true,
    "finalStatus": "COMPLETED",
    "expEarned": 150,
    "skillRewards": [
      {
        "skill": "Leadership",
        "expEarned": 50,
        "slotNumber": 1
      },
      {
        "skill": "Teamwork",
        "expEarned": 100,
        "slotNumber": 2
      }
    ]
  }
}
```

### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบ
```json
{
  "error": "Missing required fields: eventId"
}
```

**400 Bad Request** - QR Code ไม่ถูกต้อง
```json
{
  "error": "Invalid or expired QR code",
  "details": "QR code has expired"
}
```

**400 Bad Request** - ไม่มี action ที่ถูกต้องในเวลานี้
```json
{
  "error": "No valid action available at this time",
  "details": {
    "currentTime": "2026-02-27T09:00:00.000Z",
    "availableSlots": [
      {
        "slot_number": 1,
        "startTime": "2026-02-27T10:00:00.000Z",
        "endTime": "2026-02-27T11:00:00.000Z"
      }
    ]
  }
}
```

**400 Bad Request** - Invalid action
```json
{
  "error": "Invalid action. Must be 'checkin' or 'checkout'"
}
```

**400 Bad Request** - Event ไม่พร้อมใช้งาน
```json
{
  "error": "Event is not available for check-in/check-out",
  "userId": 456
}
```

**403 Forbidden** - Walk-in เต็ม
```json
{
  "error": "Walk-in capacity is full",
  "userId": 456,
  "currentWalkins": 50,
  "maxCapacity": 50
}
```

**403 Forbidden** - ไม่ได้ลงทะเบียน
```json
{
  "error": "You are not registered for this event. Walk-in is not available.",
  "userId": 456,
  "walkinEnabled": false
}
```

**404 Not Found** - ไม่พบกิจกรรม
```json
{
  "error": "Event not found",
  "userId": 456
}
```

**409 Conflict** - เช็คอินแล้ว
```json
{
  "error": "You have already checked in for this event",
  "userId": 456
}
```

**409 Conflict** - เช็คเอาท์แล้ว
```json
{
  "error": "You have already checked out from this event",
  "userId": 456
}
```

**400 Bad Request** - หมดเวลาเช็คเอาท์
```json
{
  "error": "Check-out window has expired. Check-out is only allowed within 60 minutes after activity ends.",
  "details": {
    "activityEnd": "2024-03-15T16:00:00Z",
    "checkoutDeadline": "2024-03-15T17:00:00Z",
    "currentTime": "2024-03-15T17:30:00Z"
  },
  "userId": 456
}
```

**500 Internal Server Error** - การคำนวณ EXP ล้มเหลว
```json
{
  "error": "Failed to calculate experience points",
  "details": "Skill configuration not found",
  "userId": 456
}
```

### Business Logic

#### 1. User Identification
- รองรับทั้ง QR Code และ userId
- QR Code ผ่านการเข้ารหัสและมีอายุการใช้งาน
- ถอดรหัส QR Code เพื่อดึง userId

#### 2. Walk-in Registration
- ตรวจสอบว่ากิจกรรมเปิดรับ walk-in (`walkinEnabled`)
- ตรวจสอบจำนวนคนที่ walk-in (`currentWalkins` vs `walkinCapacity`)
- สร้าง EventRegistration แบบ `WALK_IN` อัตโนมัติ
- เพิ่มจำนวน `currentWalkins`

#### 3. Auto-detect vs Manual Mode
- **Auto-detect** (ไม่มี `action`): ระบบตัดสินใจเองว่าควร check-in หรือ check-out
- **Manual** (มี `action`): บังคับให้ทำตามที่ระบุ

#### 4. Single Check-in Model
- Check-in ครั้งเดียวตอนเริ่มกิจกรรม
- Check-out ครั้งเดียวหลังจบกิจกรรม ภายใน 60 นาที หลัง `activityEnd`
- Status: `REGISTERED` → `ATTENDED/LATE` → `COMPLETED/LATE`

#### 5. Multiple Check-ins Model (`allowMultipleCheckIns: true`)
- Check-in/out หลายครั้งตาม Time Slots
- แต่ละ Slot มี `slot_number`, `startTime`, `endTime`
- **`earlyCheckInMinutes`** (per-slot): กำหนดจำนวนนาทีที่อนุญาตให้เช็คอินก่อนเวลาเริ่ม slot
  - `null` → ใช้ค่า `checkInWindowBefore` ของ event (default 60 นาที)
  - `0` → เช็คอินได้ตั้งแต่เวลาเริ่ม slot เป๊ะ
  - `N > 0` → เช็คอินได้ก่อนเวลา N นาที
- Timezone adjustment: GMT+0 (UTC) → GMT+7
- Auto-mark absent สำหรับ slots ที่ผ่านไปแล้ว
- Auto-checkout สำหรับ slots ที่ยังค้างอยู่

#### 6. Late Penalty System
- `lateCheckInPenalty`: จำนวนนาทีหลังจาก start time ที่ถือว่าสาย
- Check-in หลังเวลา → `isLate: true`, `status: LATE`
- ส่งผลต่อการคำนวณ EXP

#### 7. Experience Points (Multiple Check-ins only)
- คำนวณเมื่อ checkout ครบทุก slot เท่านั้น
- ใช้ `calculateEventTotalExp()` และ `awardSkillExp()`
- บันทึก `expEarned` ลงใน UserCheckInRecord แต่ละ slot
- อัปเดต `experienceEarned` ใน EventRegistration
- บันทึก EXP ลงระบบ (UserSubSkillLevel, ExperienceHistory)

#### 8. Transaction Safety
- ใช้ Serializable isolation level
- Row-level locking (`FOR UPDATE`)
- Timeout: 10 seconds, Max wait: 5 seconds
- Rollback หากเกิด error (เช่น EXP calculation ล้มเหลว)

### Auto-detect Logic

#### Single Check-in Model
1. ยังไม่ check-in → `action: "checkin"`
2. Check-in แล้วแต่ยัง in-progress (eventEnd ยังไม่ถึง) → `error: "Already checked in. Please wait..."`
3. Check-in แล้วและถึงเวลา checkout (eventEnd ผ่านแล้ว และภายใน 60 นาที) → `action: "checkout"`
4. เกิน `activityEnd + 60 นาที` → `error: "Check-out window has expired"`
5. Checkout แล้ว → `error: "Already completed"`

#### Multiple Check-ins Model
1. หา current slot จากเวลาปัจจุบัน (รวม `earlyCheckInMinutes` ของแต่ละ slot)
2. ถ้าไม่มี current slot → หา last ended slot
3. ยังไม่ check-in slot → `action: "checkin"`
4. Check-in แล้วแต่ยัง in-slot time → `error: "Already checked in. Please wait..."`
5. Check-in แล้วและ slot จบแล้ว (ภายใน 60 นาที หลัง `activityEnd`) → `action: "checkout"`
6. เกิน `activityEnd + 60 นาที` → `error: "Check-out window has expired"`
7. Checkout แล้ว → `error: "Already completed"`

### Example Usage

#### cURL - Auto-detect Check-in

```bash
curl -X POST https://api.example.com/api/events/checkin_out/user \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -d '{
    "eventId": 123,
    "qrCode": "encrypted_qr_data..."
  }'
```

#### JavaScript - Manual Check-in

```javascript
const response = await fetch('/api/events/checkin_out/user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    eventId: 123,
    userId: 456,
    action: 'checkin'
  })
});

const data = await response.json();
if (data.success) {
  console.log(`${data.action} successful: ${data.message}`);
  console.log('Data:', data.data);
}
```

#### JavaScript - Walk-in Check-in

```javascript
// ผู้ใช้ที่ไม่ได้ลงทะเบียนล่วงหน้า
const response = await fetch('/api/events/checkin_out/user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    eventId: 123,
    qrCode: 'user_qr_code...'
  })
});

const data = await response.json();
if (data.success) {
  // Walk-in registration created automatically
  console.log('Walk-in check-in successful');
}
```

---

## POST /api/events/checkin_out/staff

เช็คอิน/เช็คเอาท์สำหรับสตาฟฟ์ที่ทำงานในกิจกรรม

### Endpoint
```
POST /api/events/checkin_out/staff
```

### Authentication
Required - Staff Authentication (withStaffAuth middleware)

### Permission Requirements
- **SUPREME role**: สามารถ scan ได้ทุกกิจกรรม
- **STAFF/ADMIN role**: สามารถ scan เฉพาะกิจกรรมใน major categories ที่ตนเองดูแล

### Request Body

#### Auto-detect Mode
```json
{
  "eventId": 123,
  "qrCode": "encrypted_qr_data..."
}
```

#### Manual Mode
```json
{
  "eventId": 123,
  "qrCode": "encrypted_qr_data...",
  "action": "checkin"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| eventId | number | Yes | ID ของกิจกรรม |
| qrCode | string | Yes (or userId) | QR Code ที่เข้ารหัส |
| userId | number | Yes (or qrCode) | ID ของสตาฟฟ์ |
| action | string | No | "checkin" หรือ "checkout" (ถ้าไม่ระบุจะเป็น Auto-detect mode) |

### Response

#### Success - Check-in (200 OK)

```json
{
  "success": true,
  "action": "checkin",
  "isAutomatic": true,
  "message": "Checked in successfully",
  "data": {
    "staffAssignment": {
      "id": 50,
      "user_id": 456,
      "event_id": 123,
      "checkedIn": true,
      "checkInTime": "2026-02-27T09:30:00.000Z",
      "status": "ATTENDED"
    },
    "isLate": false,
    "minutesLate": 0,
    "checkInTime": "2026-02-27T09:30:00.000Z",
    "activityStart": "2026-02-27T10:00:00.000Z",
    "lateThreshold": "2026-02-27T11:00:00.000Z"
  }
}
```

#### Success - Late Check-in (200 OK)

```json
{
  "success": true,
  "action": "checkin",
  "isAutomatic": true,
  "message": "Checked in successfully (Late by 45 minutes)",
  "data": {
    "staffAssignment": {
      "id": 50,
      "user_id": 456,
      "event_id": 123,
      "checkedIn": true,
      "checkInTime": "2026-02-27T10:45:00.000Z",
      "status": "LATE"
    },
    "isLate": true,
    "minutesLate": 45,
    "checkInTime": "2026-02-27T10:45:00.000Z",
    "activityStart": "2026-02-27T10:00:00.000Z",
    "lateThreshold": "2026-02-27T11:00:00.000Z"
  }
}
```

#### Success - Check-out (200 OK)

```json
{
  "success": true,
  "action": "checkout",
  "isAutomatic": true,
  "message": "Checked out successfully",
  "data": {
    "staffAssignment": {
      "id": 50,
      "user_id": 456,
      "event_id": 123,
      "checkedIn": true,
      "checkedOut": true,
      "checkInTime": "2026-02-27T09:30:00.000Z",
      "checkOutTime": "2026-02-27T15:00:00.000Z",
      "status": "COMPLETED"
    },
    "checkOutTime": "2026-02-27T15:00:00.000Z",
    "finalStatus": "COMPLETED"
  }
}
```

### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบ
```json
{
  "error": "Missing required fields: eventId and userId"
}
```

**400 Bad Request** - QR Code ไม่ถูกต้อง
```json
{
  "error": "Invalid or expired QR code",
  "details": "QR code signature verification failed"
}
```

**400 Bad Request** - ยังไม่ถึงเวลาเช็คอิน
```json
{
  "error": "Check-in period has not started yet. Please check in 60 minutes before the event starts.",
  "checkInAllowedFrom": "2026-02-27T09:00:00.000Z",
  "currentTime": "2026-02-27T08:30:00.000Z"
}
```

**400 Bad Request** - ต้องเช็คอินก่อน
```json
{
  "error": "You must check in before checking out"
}
```

**400 Bad Request** - Event ยังไม่จบ
```json
{
  "error": "Already checked in. Please wait until event ends to check out (45 minutes remaining).",
  "checkInTime": "2026-02-27T09:30:00.000Z",
  "activityEnd": "2026-02-27T15:00:00.000Z",
  "currentTime": "2026-02-27T14:15:00.000Z",
  "minutesUntilEnd": 45
}
```

**403 Forbidden** - ไม่มีสิทธิ์
```json
{
  "error": "You do not have permission to manage check-in/out for this event. You can only manage events in your assigned major categories."
}
```

**403 Forbidden** - ไม่ใช่สตาฟฟ์
```json
{
  "error": "You are not assigned as staff for this event"
}
```

**404 Not Found** - ไม่พบกิจกรรม
```json
{
  "error": "Event not found"
}
```

**404 Not Found** - ไม่พบผู้ใช้
```json
{
  "error": "User not found"
}
```

**409 Conflict** - เช็คอินแล้ว
```json
{
  "error": "You have already checked in for this event"
}
```

**409 Conflict** - เช็คเอาท์แล้ว
```json
{
  "error": "You have already checked out from this event"
}
```

### Business Logic

#### 1. Staff Requirements
- สตาฟฟ์ต้องถูก assign ให้กับกิจกรรม (EventStaff record)
- ต้องมี role: STAFF, ADMIN, หรือ SUPREME

#### 2. Permission Check
- **SUPREME**: สามารถจัดการได้ทุกกิจกรรม
- **STAFF/ADMIN**: จัดการได้เฉพาะกิจกรรมใน major category ที่ตนดูแล (`MajorAdmin`)
- ถ้ากิจกรรมไม่มี major category → เฉพาะ SUPREME เท่านั้น

#### 3. Check-in Time Window
- `staffCheckInTime`: จำนวนนาทีก่อนกิจกรรมเริ่มที่สามารถเช็คอินได้ (default: 60)
- Check-in เร็วเกินไป → Error
- Check-in หลัง (activityStart + lateCheckInPenalty) → Late

#### 4. Late Penalty
- `lateCheckInPenalty`: จำนวนนาทีหลัง activityStart ที่ถือว่าสาย (default: 60)
- เช็คอินสาย → Status: `LATE`
- เช็คเอาท์หลังจากเช็คอินสาย → Final Status: `LATE_PENALTY`

#### 5. Check-out Timing
- ต้อง check-in ก่อนถึงจะ check-out ได้
- Check-out ก่อนกิจกรรมจบ → Error
- Check-out หลังกิจกรรมจบ (`activityEnd`) → Success

#### 6. Status Flow
```
Initial: ASSIGNED
  ↓ (check-in on time)
ATTENDED
  ↓ (checkout)
COMPLETED

OR

Initial: ASSIGNED
  ↓ (check-in late)
LATE
  ↓ (checkout)
LATE_PENALTY
```

#### 7. Transaction Safety
- ใช้ Serializable isolation level
- Row-level locking (`FOR UPDATE`)
- Prevent race conditions

### Auto-detect Logic

1. **ยังไม่ check-in**:
   - เช็คว่าเวลาอยู่ใน check-in window หรือไม่
   - ถ้าเร็วเกินไป → Error พร้อมบอกเวลาที่เริ่มได้
   - ถ้าอยู่ใน window → `action: "checkin"`

2. **Check-in แล้วแต่ยัง in-progress**:
   - เช็คว่ากิจกรรมจบแล้วหรือยัง (`activityEnd`)
   - ถ้ายังไม่จบ → Error พร้อมบอกเวลาที่เหลือ
   - ถ้าจบแล้ว → `action: "checkout"`

3. **Check-in และ Check-out แล้ว**:
   - → Error: "Already completed"

### Example Usage

#### cURL - Staff Auto Check-in

```bash
curl -X POST https://api.example.com/api/events/checkin_out/staff \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -d '{
    "eventId": 123,
    "qrCode": "staff_qr_code..."
  }'
```

#### JavaScript - Manual Staff Check-in

```javascript
const response = await fetch('/api/events/checkin_out/staff', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    eventId: 123,
    userId: 789,
    action: 'checkin'
  })
});

const data = await response.json();
if (data.success) {
  if (data.data.isLate) {
    console.log(`Late check-in: ${data.data.minutesLate} minutes late`);
  } else {
    console.log('Check-in successful');
  }
}
```

#### React - Staff Check-in Scanner

```javascript
const handleStaffScan = async (qrCode) => {
  try {
    const response = await fetch('/api/events/checkin_out/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        eventId: currentEvent.id,
        qrCode: qrCode
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification({
        type: 'success',
        message: data.message,
        details: data.data
      });
    } else {
      showNotification({
        type: 'error',
        message: data.error
      });
    }
  } catch (error) {
    showNotification({
      type: 'error',
      message: 'Failed to process check-in/out'
    });
  }
};
```

---

## QR Code System

ระบบ QR Code ใช้การเข้ารหัสและมีอายุการใช้งานเพื่อความปลอดภัย

### QR Code Structure

```javascript
// Plaintext payload
{
  "userId": 456,
  "timestamp": 1709024400000 // epoch time in milliseconds
}

// Encrypted QR Code
"encrypted_base64_string_with_signature"
```

### Encryption Details

1. **Algorithm**: AES-256-GCM หรือ similar
2. **Signature**: HMAC-SHA256 สำหรับ verify integrity
3. **Expiry**: QR Code มีอายุการใช้งาน (configurable)
4. **Key Management**: ใช้ `QR_ENCRYPTION_KEY` จาก environment variables

### QR Code Verification Process

```javascript
// ใน verifyAndDecryptQRData()
1. Decode Base64
2. Verify signature (HMAC)
3. Decrypt payload
4. Check timestamp (expiry)
5. Return { valid: true, data: { userId, timestamp } }
   OR { valid: false, error: "reason" }
```

### Generate QR Code (Frontend)

```javascript
import QRCode from 'qrcode';

// Backend API generates encrypted QR data
const getQRCode = async (userId) => {
  const response = await fetch(`/api/user/qr?userId=${userId}`);
  const { qrData } = await response.json();
  
  // Generate QR image
  const qrImage = await QRCode.toDataURL(qrData);
  return qrImage;
};
```

### Scan QR Code (Staff Side)

```javascript
import { BrowserQRCodeReader } from '@zxing/library';

const codeReader = new BrowserQRCodeReader();

codeReader.decodeFromVideoDevice(null, 'video', (result, err) => {
  if (result) {
    const qrCode = result.getText();
    
    // Send to backend for processing
    handleCheckIn({ eventId, qrCode });
  }
});
```

### Security Considerations

1. **Expiry Time**: QR Code หมดอายุหลังระยะเวลาหนึ่ง (เช่น 2 นาที)
2. **One-time Use**: พิจารณาใช้ nonce เพื่อป้องกันการ replay
3. **Offline Mode**: รองรับการ scan offline และ sync ภายหลัง
4. **Rate Limiting**: จำกัดจำนวนครั้งของการ scan ต่อช่วงเวลา

---

## Operation Modes

ระบบรองรับ 2 โหมดการทำงาน: Auto-detect และ Manual

### Auto-detect Mode

ระบบตัดสินใจเองว่าควรทำ check-in หรือ check-out

#### Request Format
```json
{
  "eventId": 123,
  "qrCode": "encrypted_qr_data..."
}
```

#### Decision Logic

1. **ตรวจสอบสถานะปัจจุบัน**:
   - ดึงข้อมูล registration/staff assignment
   - ดูว่า checked-in หรือยัง
   - ดูว่า checked-out หรือยัง

2. **ตรวจสอบเวลา**:
   - Single check-in: เทียบกับ `activityEnd`
   - Multiple check-ins: หา current/last slot

3. **ตัดสินใจ**:
   - Return `{ action: "checkin" | "checkout" }`
   - หรือ `{ action: null, error: "reason" }`

#### ข้อดี
- ใช้งานง่าย: scan เดียวเท่านั้น
- ป้องกัน user mistake
- UX ดีกว่า

#### ข้อเสีย
- อาจไม่ flexible พอในบางกรณี
- ต้องมี logic ที่ดีในการตัดสินใจ

### Manual Mode

User ระบุชัดเจนว่าต้องการทำอะไร

#### Request Format
```json
{
  "eventId": 123,
  "qrCode": "encrypted_qr_data...",
  "action": "checkin"
}
```

#### Validation
- ตรวจสอบว่า action ถูกต้อง (`"checkin"` หรือ `"checkout"`)
- ตรวจสอบว่า action นั้นทำได้ในเวลานี้หรือไม่
- ถ้าไม่ได้ → Error

#### ข้อดี
- Flexible: force action ที่ต้องการ
- เหมาะสำหรับ admin/staff ที่ต้องการควบคุม
- Debug ง่ายกว่า

#### ข้อเสีย
- User ต้องเลือกเอง (มี button 2 ปุ่ม)
- อาจเกิด mistake ได้ง่ายกว่า

### Best Practice

1. **User Check-in**: ใช้ Auto-detect mode
   - User ทั่วไปไม่ต้องเลือก
   - Scan เดียวจบ

2. **Staff Override**: ใช้ Manual mode option
   - มี toggle/switch เปลี่ยนโหมด
   - สำหรับกรณีพิเศษ

3. **Error Handling**: แสดง helpful message
   ```javascript
   if (!data.success) {
     // แสดง error พร้อม details
     if (data.details?.currentTime) {
       console.log('Current time:', data.details.currentTime);
       console.log('Available slots:', data.details.availableSlots);
     }
   }
   ```

---

## Check-in Models

ระบบรองรับ 2 รูปแบบการเช็คอิน: Single และ Multiple

### Single Check-in Model

เช็คอินครั้งเดียวตอนเริ่ม และเช็คเอาท์ครั้งเดียวตอนจบ

#### Configuration
```javascript
// ใน Event model
{
  allowMultipleCheckIns: false, // default
  activityStart: "2026-02-27T10:00:00.000Z",
  activityEnd: "2026-02-27T15:00:00.000Z",
  lateCheckInPenalty: 60 // minutes
}
```

#### Flow
```
User scan QR → Check-in (10:15)
   ↓ (status: ATTENDED/LATE)
Work on event...
   ↓
User scan QR → Check-out (15:00)
   ↓ (status: COMPLETED/LATE)
Done
```

#### Status Progression
```
REGISTERED
  ↓ (check-in on time)
ATTENDED
  ↓ (checkout)
COMPLETED

OR

REGISTERED
  ↓ (check-in late)
LATE
  ↓ (checkout)
LATE
```

#### Use Cases
- กิจกรรมต่อเนื่องทั้งวัน
- Workshop แบบ one session
- Conference
- Seminar

#### Database Records
```
EventRegistration {
  checkedIn: true,
  checkInTime: "2026-02-27T10:15:00.000Z",
  checkedOut: true,
  checkOutTime: "2026-02-27T15:00:00.000Z",
  status: "COMPLETED"
}
```

### Multiple Check-ins Model

เช็คอิน/เช็คเอาท์หลายครั้งตาม Time Slots

#### Configuration
```javascript
// ใน Event model
{
  allowMultipleCheckIns: true,
  checkInWindowBefore: 60,  // fallback เมื่อ slot ไม่ระบุ earlyCheckInMinutes
  checkInWindowAfter: 30,
  checkInTimeSlots: [
    {
      slot_number: 1,
      startTime: "2026-02-27T10:00:00.000Z",
      endTime: "2026-02-27T12:00:00.000Z",
      earlyCheckInMinutes: 15    // เปิดเช็คอินตั้งแต่ 09:45
    },
    {
      slot_number: 2,
      startTime: "2026-02-27T13:00:00.000Z",
      endTime: "2026-02-27T15:00:00.000Z",
      earlyCheckInMinutes: 10    // เปิดเช็คอินตั้งแต่ 12:50
    },
    {
      slot_number: 3,
      startTime: "2026-02-27T16:00:00.000Z",
      endTime: "2026-02-27T18:00:00.000Z",
      earlyCheckInMinutes: null  // fallback → ใช้ checkInWindowBefore = 60 นาที
    }
  ],
  lateCheckInPenalty: 60
}
```

#### Flow (3 Slots)
```
Slot 1 (10:00-12:00):
  User scan → Check-in (10:15)
  ...
  12:00 → Auto-checkout (หรือ manual)

Slot 2 (13:00-15:00):
  User scan → Check-in (13:10)
  ...
  15:00 → Check-out

Slot 3 (16:00-18:00):
  User scan → Check-in (16:05)
  ...
  User scan → Check-out (17:50)
  ↓
  Calculate EXP (all slots completed)
```

#### Slot Rules

1. **Early Check-in Window (per-slot)**: เปิดเช็คอินได้ตั้งแต่ `startTime - earlyCheckInMinutes` ถึง `endTime`
   - `earlyCheckInMinutes = null` → ใช้ `event.checkInWindowBefore` (default 60 นาที)
   - `earlyCheckInMinutes = 0` → เช็คอินได้ตั้งแต่ `startTime` เท่านั้น
2. **Check-out Window**: หลัง `startTime` ถึงก่อน slot ถัดไป `startTime`
3. **Late Check-in**: หลัง `startTime + lateCheckInPenalty` (earlyCheckInMinutes ไม่มีผลต่อ isLate)
4. **Absent Marking**: Slot ที่ผ่านไปแล้วและไม่ได้ check-in → Mark as absent

#### Auto-mark Absent
```javascript
// เมื่อ scan ใน slot 3, auto-mark slot 1-2 ที่พลาดไป
for (const pastSlot of pastSlots) {
  if (!existingRecord) {
    // Create absent record
    UserCheckInRecord.create({
      checkedIn: false,
      checkedOut: false,
      isLate: false,
      expEarned: 0
    });
  }
}
```

#### Auto-checkout
```javascript
// เมื่อ scan ใน slot 3, auto-checkout slot 2 ที่ค้างอยู่
if (existingRecord.checkedIn && !existingRecord.checkedOut) {
  UserCheckInRecord.update({
    checkedOut: true,
    checkOutTime: slot.endTime // ใช้เวลาจบ slot
  });
}
```

#### Status Progression
```
Slot 1: Check-in → ATTENDED (registration.status)
Slot 2: Check-in → ATTENDED
Slot 3: Check-in → ATTENDED
        Check-out (all complete) → COMPLETED
```

#### Use Cases
- กิจกรรมหลายวัน
- Training แบบหลาย session
- Conference แบบ multi-track
- Internship (daily check-in)

#### Database Records
```
EventRegistration {
  checkedIn: true,
  checkInTime: "2026-02-27T10:15:00.000Z",
  checkedOut: true,
  checkOutTime: "2026-02-27T17:50:00.000Z",
  status: "COMPLETED",
  experienceEarned: 150
}

UserCheckInRecord (Slot 1) {
  checkInTimeSlot_id: 10,
  checkedIn: true,
  checkInTime: "2026-02-27T10:15:00.000Z",
  checkedOut: true,
  checkOutTime: "2026-02-27T12:00:00.000Z",
  isLate: false,
  expEarned: 50
}

UserCheckInRecord (Slot 2) {
  checkInTimeSlot_id: 11,
  checkedIn: true,
  checkInTime: "2026-02-27T13:10:00.000Z",
  checkedOut: true,
  checkOutTime: "2026-02-27T15:00:00.000Z",
  isLate: false,
  expEarned: 50
}

UserCheckInRecord (Slot 3) {
  checkInTimeSlot_id: 12,
  checkedIn: true,
  checkInTime: "2026-02-27T16:05:00.000Z",
  checkedOut: true,
  checkOutTime: "2026-02-27T17:50:00.000Z",
  isLate: false,
  expEarned: 50
}
```

### Comparison

| Feature | Single Check-in | Multiple Check-ins |
|---------|----------------|-------------------|
| Complexity | Low | High |
| Database records | 1 EventRegistration | 1 EventRegistration + N UserCheckInRecord |
| EXP Calculation | On checkout | On last checkout (all slots completed) |
| Flexibility | Low | High |
| Use case | Single-day events | Multi-day/session events |
| Auto-mark absent | N/A | Yes |
| Auto-checkout | N/A | Yes (previous slots) |

---

## Walk-in Registration

ระบบรองรับการลงทะเบียนแบบ Walk-in (ลงทะเบียนทันทีขณะเข้าร่วม)

### Configuration

```javascript
// ใน Event model
{
  walkinEnabled: true,
  walkinCapacity: 50,
  currentWalkins: 12
}
```

### How It Works

1. **User ที่ไม่ได้ลงทะเบียน** scan QR Code
2. **ระบบตรวจสอบ**:
   - มี EventRegistration อยู่แล้วหรือไม่?
   - ถ้าไม่มี → เช็ค `walkinEnabled`
3. **ถ้า walkinEnabled = true**:
   - เช็ค `currentWalkins < walkinCapacity`
   - ถ้าเต็ม → Error 403
   - ถ้ายังไม่เต็ม → สร้าง EventRegistration
4. **สร้าง Walk-in Registration**:
   ```javascript
   EventRegistration.create({
     user_id: userId,
     event_id: eventId,
     registrationType: "WALK_IN",
     status: "REGISTERED"
   });
   
   // Increment counter
   Event.update({
     currentWalkins: currentWalkins + 1
   });
   ```
5. **ดำเนินการ Check-in** ตามปกติ

### Request Example

```json
{
  "eventId": 123,
  "qrCode": "user_qr_code..."
}
```

### Response - Walk-in Created

```json
{
  "success": true,
  "action": "checkin",
  "mode": "single",
  "isAutomatic": true,
  "message": "Walk-in registration created and checked in successfully",
  "data": {
    "userId": 456,
    "registration": {
      "id": 789,
      "user_id": 456,
      "event_id": 123,
      "registrationType": "WALK_IN",
      "status": "ATTENDED",
      "checkedIn": true,
      "checkInTime": "2026-02-27T10:30:00.000Z"
    },
    "isLate": false
  }
}
```

### Error - Walk-in Disabled

```json
{
  "error": "You are not registered for this event. Walk-in is not available.",
  "userId": 456,
  "walkinEnabled": false
}
```

### Error - Walk-in Full

```json
{
  "error": "Walk-in capacity is full",
  "userId": 456,
  "currentWalkins": 50,
  "maxCapacity": 50
}
```

### Business Rules

1. **Capacity Management**:
   - `walkinCapacity` คือจำนวนคนสูงสุดที่รับ walk-in
   - `currentWalkins` increment เมื่อมี walk-in ใหม่
   - Decrement เมื่อ walk-in cancel (ถ้ามี feature)

2. **Registration Type**:
   - `REGULAR`: ลงทะเบียนปกติล่วงหน้า
   - `WALK_IN`: ลงทะเบียนแบบ walk-in
   - `INVITED`: ได้รับเชิญโดยตรง

3. **Walk-in vs Pre-registered**:
   - Walk-in: สร้าง registration ตอน check-in
   - Pre-registered: มี registration อยู่แล้ว
   - ทั้ง 2 แบบใช้ระบบเดียวกันหลังจากนั้น

4. **Permissions**:
   - Walk-in ใช้ได้กับทุก user ที่มี valid QR code
   - ไม่จำเป็นต้องเป็นสมาชิกล่วงหน้า

### Use Cases

1. **Drop-in Workshop**: ไม่ต้องลงทะเบียนล่วงหน้า
2. **Community Event**: เปิดรับทุกคน จำกัดจำนวน
3. **Backup Capacity**: มี quota สำรอง สำหรับคนที่พลาดลงทะเบียน

### Frontend Implementation

```javascript
const handleWalkInScan = async (qrCode) => {
  try {
    const response = await fetch('/api/events/checkin_out/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        eventId: currentEvent.id,
        qrCode: qrCode
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      if (data.data.registration?.registrationType === 'WALK_IN') {
        showNotification({
          type: 'info',
          message: 'Walk-in registration created successfully!',
          description: 'You have been checked in to the event.'
        });
      }
    } else if (data.error?.includes('Walk-in capacity is full')) {
      showNotification({
        type: 'error',
        message: 'Walk-in capacity reached',
        description: `Sorry, we've reached our walk-in capacity (${data.maxCapacity} people).`
      });
    }
  } catch (error) {
    console.error('Walk-in error:', error);
  }
};
```

---

## Late Penalty System

ระบบคำนวณการเข้าร่วมล่าช้า (Late Penalty)

### Configuration

```javascript
// ใน Event model
{
  activityStart: "2026-02-27T10:00:00.000Z",
  lateCheckInPenalty: 60 // minutes after start time
}
```

### How It Works

#### For User Check-in

1. **Calculate Late Threshold**:
   ```javascript
   const lateThresholdTime = new Date(
     activityStart.getTime() + lateCheckInPenalty * 60 * 1000
   );
   // Example: 10:00 + 60 minutes = 11:00
   ```

2. **Check Current Time**:
   ```javascript
   const isLate = now > lateThresholdTime;
   ```

3. **Set Status**:
   - On time: `status = "ATTENDED"`
   - Late: `status = "LATE"`

4. **Record in Database**:
   ```javascript
   EventRegistration.update({
     checkedIn: true,
     checkInTime: now,
     status: isLate ? "LATE" : "ATTENDED"
   });
   
   // For multiple check-ins
   UserCheckInRecord.create({
     isLate: isLate,
     checkInTime: now
   });
   ```

#### For Staff Check-in

1. **Calculate Late Threshold**:
   ```javascript
   const staffCheckInMinutes = event.staffCheckInTime || 60;
   const lateThresholdMinutes = event.lateCheckInPenalty || 60;
   
   const lateThresholdTime = new Date(
     activityStart.getTime() + lateThresholdMinutes * 60 * 1000
   );
   ```

2. **Calculate Minutes Late**:
   ```javascript
   const minutesLate = isLate
     ? Math.floor((now.getTime() - activityStart.getTime()) / (60 * 1000))
     : 0;
   ```

3. **Set Status**:
   - On time: `status = "ATTENDED"`
   - Late: `status = "LATE"`
   - Checkout after late check-in: `status = "LATE_PENALTY"`

### Status Flow

#### User
```
Check-in on time (before 11:00)
  ↓
status: ATTENDED
  ↓ (checkout)
status: COMPLETED

Check-in late (after 11:00)
  ↓
status: LATE
  ↓ (checkout)
status: LATE (remains)
```

#### Staff
```
Check-in on time
  ↓
status: ATTENDED
  ↓ (checkout)
status: COMPLETED

Check-in late
  ↓
status: LATE
  ↓ (checkout)
status: LATE_PENALTY
```

### Response Example

#### On-time Check-in
```json
{
  "success": true,
  "action": "checkin",
  "message": "Checked in successfully",
  "data": {
    "isLate": false,
    "checkInTime": "2026-02-27T10:15:00.000Z"
  }
}
```

#### Late Check-in (User)
```json
{
  "success": true,
  "action": "checkin",
  "message": "Checked in successfully (Late)",
  "data": {
    "isLate": true,
    "checkInTime": "2026-02-27T11:30:00.000Z"
  }
}
```

#### Late Check-in (Staff)
```json
{
  "success": true,
  "action": "checkin",
  "message": "Checked in successfully (Late by 45 minutes)",
  "data": {
    "isLate": true,
    "minutesLate": 45,
    "checkInTime": "2026-02-27T10:45:00.000Z",
    "activityStart": "2026-02-27T10:00:00.000Z",
    "lateThreshold": "2026-02-27T11:00:00.000Z"
  }
}
```

### Impact on Experience Points

Late check-in affects EXP calculation:

```javascript
// ใน calculateEventTotalExp()
const hasAnyLate = checkInRecords.some(r => r.isLate);

if (hasAnyLate) {
  // Apply penalty to EXP calculation
  // (implementation details in expCalculation.ts)
}
```

### Multiple Check-ins Late Logic

แต่ละ slot คำนวณแยกกัน และ **`earlyCheckInMinutes` ไม่มีผลต่อ `isLate`**:

```javascript
// Slot 1: startTime=10:00, earlyCheckInMinutes=15
//   → เปิดเช็คอินตั้งแต่ 09:45
//   → Check-in 09:47 → isLate: false (ก่อน 10:00)
//   → Check-in 10:15 → isLate: false (ก่อน startTime + lateCheckInPenalty)
//   → Check-in 11:30 → isLate: true  (หลัง 10:00 + 60 นาที = 11:00)
// Slot 2: Check-in 14:30 (late) → isLate: true
// Slot 3: Check-in 16:05 (on time) → isLate: false

// Final status: LATE (because hasAnyLate = true)
```

### Configuration Best Practices

1. **Default Value**: 60 minutes (1 hour)
2. **Strict Events**: 15-30 minutes
3. **Casual Events**: 90-120 minutes
4. **Multi-day Events**: Per-slot penalty

### Frontend Display

```javascript
// Display late status
if (data.data.isLate) {
  return (
    <Alert type="warning">
      <Icon name="clock" />
      Check-in recorded as LATE
      {data.data.minutesLate && 
        ` (${data.data.minutesLate} minutes after start)`
      }
    </Alert>
  );
}
```

---

## Experience Points

ระบบคำนวณและมอบ Experience Points (EXP) และ Skill Rewards

### When EXP is Calculated

#### Single Check-in Model
- คำนวณหลัง check-out (TBD - ยังไม่ implement)

#### Multiple Check-ins Model
- คำนวณเมื่อ checkout **ครบทุก slot เท่านั้น**
- ถ้า checkout ไม่ครบ → ไม่ได้ EXP

### EXP Calculation Flow

```javascript
// 1. เมื่อ user checkout slot สุดท้าย
if (completedSlots === totalSlots) {
  
  // 2. คำนวณ EXP
  const expResult = await calculateEventTotalExp(eventId, userId);
  // Returns: { totalExp, skillRewards: [...] }
  
  // 3. บันทึก EXP ใน UserCheckInRecord แต่ละ slot
  for (const record of allRecords) {
    const slotRewards = expResult.skillRewards.filter(
      r => r.slotNumber === record.checkInTimeSlot.slot_number
    );
    
    const slotTotalExp = slotRewards.reduce((sum, r) => sum + r.expEarned, 0);
    
    await UserCheckInRecord.update({
      expEarned: slotTotalExp
    });
  }
  
  // 4. อัปเดต EventRegistration
  await EventRegistration.update({
    experienceEarned: expResult.totalExp
  });
  
  // 5. Award EXP ให้ user (UserSubSkillLevel, ExperienceHistory)
  await awardSkillExp(userId, eventId, expResult.skillRewards);
}
```

### Response Format

```json
{
  "success": true,
  "action": "checkout",
  "mode": "multiple",
  "message": "Checked out from slot 3. Event completed!",
  "data": {
    "userId": 456,
    "completedSlots": 3,
    "totalSlots": 3,
    "isFullyCompleted": true,
    "finalStatus": "COMPLETED",
    "expEarned": 150,
    "skillRewards": [
      {
        "skill": "Leadership",
        "subSkill": "Team Management",
        "expEarned": 50,
        "slotNumber": 1,
        "levelBefore": 2,
        "levelAfter": 3,
        "leveledUp": true
      },
      {
        "skill": "Technical",
        "subSkill": "Programming",
        "expEarned": 100,
        "slotNumber": 2,
        "levelBefore": 5,
        "levelAfter": 5,
        "leveledUp": false
      }
    ]
  }
}
```

### Skill Rewards Structure

```javascript
{
  skill: "Leadership",           // Main skill name
  subSkill: "Team Management",   // Sub-skill name
  expEarned: 50,                 // EXP earned for this skill
  slotNumber: 1,                 // Which slot this reward is from
  levelBefore: 2,                // User's level before
  levelAfter: 3,                 // User's level after
  leveledUp: true                // Whether user leveled up
}
```

### Database Records

#### UserCheckInRecord
```javascript
{
  id: 100,
  eventRegistration_id: 789,
  checkInTimeSlot_id: 10,
  checkedIn: true,
  checkInTime: "2026-02-27T10:15:00.000Z",
  checkedOut: true,
  checkOutTime: "2026-02-27T12:00:00.000Z",
  isLate: false,
  expEarned: 50  // EXP from this slot
}
```

#### EventRegistration
```javascript
{
  id: 789,
  user_id: 456,
  event_id: 123,
  status: "COMPLETED",
  experienceEarned: 150  // Total EXP from all slots
}
```

#### UserSubSkillLevel
```javascript
{
  user_id: 456,
  subSkill_id: 10,
  currentExp: 250,
  level: 3
}
```

#### ExperienceHistory
```javascript
{
  user_id: 456,
  event_id: 123,
  expEarned: 50,
  skill: "Leadership",
  subSkill: "Team Management",
  earnedAt: "2026-02-27T12:00:00.000Z"
}
```

### Transaction Safety

EXP calculation is wrapped in transaction:

```javascript
await prisma.$transaction(async (tx) => {
  // 1. Checkout
  // 2. Calculate EXP
  // 3. Update UserCheckInRecord
  // 4. Update EventRegistration
  // 5. Award EXP (UserSubSkillLevel, ExperienceHistory)
  
  // ถ้า step ไหนล้มเหลว → rollback ทั้งหมด
}, {
  isolationLevel: 'Serializable',
  maxWait: 5000,
  timeout: 10000
});
```

### Error Handling

```json
{
  "error": "Failed to calculate experience points",
  "details": "Skill configuration not found for event",
  "userId": 456
}
```

หาก EXP calculation ล้มเหลว:
1. Transaction rollback
2. User ยังไม่ checkout
3. สามารถลองใหม่ได้

### Impact of Late Check-in

```javascript
// ตัวอย่างการลด EXP เมื่อมี late check-in
if (hasAnyLate) {
  const penalty = 0.8; // 80% of original EXP
  expEarned = Math.floor(baseExp * penalty);
}
```

### Frontend Display

```javascript
// Display EXP rewards
if (data.data.skillRewards?.length > 0) {
  return (
    <div className="exp-rewards">
      <h3>Congratulations! You earned {data.data.expEarned} EXP</h3>
      <div className="skills">
        {data.data.skillRewards.map(reward => (
          <div key={reward.skill} className="skill-reward">
            <span className="skill-name">{reward.skill}</span>
            <span className="exp">+{reward.expEarned} EXP</span>
            {reward.leveledUp && (
              <Badge color="gold">
                Level Up! {reward.levelBefore} → {reward.levelAfter}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Security Considerations

### 1. Authentication & Authorization

**User Check-in**:
- Middleware: `withEventStaffAuth`
- ต้องเป็นสตาฟฟ์ที่ได้รับมอบหมายให้จัดการกิจกรรม
- หรือเป็น ADMIN/SUPREME

**Staff Check-in**:
- Middleware: `withStaffAuth`
- ต้องเป็นสตาฟฟ์ที่ assign ให้กับกิจกรรม
- Permission check ตาม major category

### 2. QR Code Security

1. **Encryption**: AES-256-GCM
2. **Signature**: HMAC-SHA256
3. **Expiry**: Time-based expiration
4. **Validation**: Server-side verification
5. **No replay**: พิจารณาใช้ nonce

### 3. Race Condition Prevention

```javascript
// Row-level locking
const lockedReg = await tx.$queryRaw`
  SELECT * FROM "EventRegistration"
  WHERE user_id = ${userId} AND event_id = ${eventId}
  FOR UPDATE
`;

// Serializable isolation level
await prisma.$transaction(async (tx) => {
  // ...
}, {
  isolationLevel: 'Serializable'
});
```

### 4. Input Validation

```javascript
// Validate required fields
if (!body.eventId) {
  return error("Missing required fields");
}

// Validate action
if (body.action && !["checkin", "checkout"].includes(body.action)) {
  return error("Invalid action");
}

// Validate QR code
const qrVerification = verifyAndDecryptQRData(body.qrCode);
if (!qrVerification.valid) {
  return error("Invalid QR code");
}
```

### 5. Error Information

ไม่ expose sensitive data ใน error messages:

```javascript
// Good
{ "error": "Invalid QR code" }

// Bad
{ "error": "QR signature mismatch: expected abc123, got xyz789" }
```

### 6. Rate Limiting

พิจารณาใช้ rate limiting:

```javascript
// จำกัดจำนวนครั้งของการ scan ต่อ user ต่อช่วงเวลา
// เช่น: 5 attempts ต่อนาที
```

### 7. Audit Logging

Log important events:

```javascript
console.log('Check-in attempt:', {
  userId,
  eventId,
  timestamp: new Date(),
  ip: req.headers['x-forwarded-for'],
  action: 'checkin',
  success: true
});
```

---

## Common Error Scenarios

### Scenario 1: QR Code Expired
```
User action: Scan QR code
Error: 400 "Invalid or expired QR code"
Cause: QR code หมดอายุ
Solution: สร้าง QR code ใหม่
```

### Scenario 2: Not in Check-in Window
```
User action: Scan for check-in
Error: 400 "No valid action available at this time"
Cause: อยู่นอกช่วงเวลา check-in
Solution: รอให้ถึงเวลา check-in
```

### Scenario 3: Already Checked In
```
User action: Scan for check-in
Error: 409 "You have already checked in"
Cause: Check-in ไปแล้ว
Solution: รอเวลา checkout
```

### Scenario 4: Walk-in Full
```
User action: Walk-in check-in
Error: 403 "Walk-in capacity is full"
Cause: จำนวนคน walk-in เต็มแล้ว
Solution: ลงทะเบียนล่วงหน้าครั้งหน้า
```

### Scenario 5: Permission Denied
```
Staff action: Scan user QR
Error: 403 "You do not have permission..."
Cause: ไม่ใช่ major admin ของกิจกรรมนี้
Solution: ให้ SUPREME หรือ major admin ที่ถูกต้อง scan
```

### Scenario 6: Race Condition
```
User action: Scan twice quickly
Error: 409 "Already checked in"
Cause: Transaction locking ทำงาน
Solution: System handled correctly
```

---

## Testing Examples

### Test 1: User Auto Check-in

```bash
curl -X POST http://localhost:3000/api/events/checkin_out/user \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -d '{
    "eventId": 1,
    "qrCode": "encrypted_qr_data..."
  }'
```

### Test 2: User Manual Check-out

```bash
curl -X POST http://localhost:3000/api/events/checkin_out/user \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -d '{
    "eventId": 1,
    "userId": 10,
    "action": "checkout"
  }'
```

### Test 3: Walk-in Registration

```bash
# User ที่ไม่ได้ลงทะเบียน
curl -X POST http://localhost:3000/api/events/checkin_out/user \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -d '{
    "eventId": 1,
    "qrCode": "new_user_qr..."
  }'
```

### Test 4: Staff Check-in

```bash
curl -X POST http://localhost:3000/api/events/checkin_out/staff \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -d '{
    "eventId": 1,
    "qrCode": "staff_qr_code..."
  }'
```

### Test 5: Multiple Check-ins (Slot 2)

```bash
curl -X POST http://localhost:3000/api/events/checkin_out/user \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -d '{
    "eventId": 1,
    "userId": 10
  }'
```

---

## Best Practices

### 1. Frontend Implementation

```javascript
// QR Scanner Component
const QRScanner = ({ eventId, mode = 'auto' }) => {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState(null);
  
  const handleScan = async (qrCode) => {
    setScanning(false);
    
    try {
      const response = await fetch('/api/events/checkin_out/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          qrCode,
          ...(mode === 'manual' && { action: selectedAction })
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          data: data.data
        });
        
        // Show success notification
        showSuccessToast(data.message);
        
        // Play success sound
        playSound('success');
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          setScanning(true);
          setResult(null);
        }, 3000);
      } else {
        setResult({
          success: false,
          error: data.error
        });
        
        // Show error notification
        showErrorToast(data.error);
        
        // Allow retry
        setTimeout(() => setScanning(true), 2000);
      }
    } catch (error) {
      console.error('Scan error:', error);
      showErrorToast('Failed to process QR code');
      setScanning(true);
    }
  };
  
  return (
    <div className="qr-scanner">
      {scanning ? (
        <QRCodeReader onScan={handleScan} />
      ) : (
        <ResultDisplay result={result} />
      )}
    </div>
  );
};
```

### 2. Error Handling

```javascript
// Centralized error handler
const handleCheckInError = (error) => {
  if (error.error?.includes('QR code')) {
    return {
      title: 'Invalid QR Code',
      message: 'Please generate a new QR code',
      action: 'Regenerate'
    };
  }
  
  if (error.error?.includes('Walk-in capacity')) {
    return {
      title: 'Event is Full',
      message: 'Walk-in capacity has been reached',
      action: null
    };
  }
  
  if (error.error?.includes('No valid action')) {
    return {
      title: 'Not Available',
      message: error.details?.currentTime 
        ? `Please try again at ${formatTime(error.details.availableSlots[0]?.startTime)}`
        : 'Check-in is not available at this time',
      action: 'Show Schedule'
    };
  }
  
  return {
    title: 'Error',
    message: error.error || 'Something went wrong',
    action: 'Retry'
  };
};
```

### 3. Timezone Handling

```javascript
// Always use UTC for API calls
const activityStart = new Date(event.activityStart); // UTC

// Display in local timezone
const displayTime = activityStart.toLocaleString('th-TH', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

// Server adjusts for GMT+7
const adjustedTime = new Date(utcTime);
adjustedTime.setHours(adjustedTime.getHours() - 7);
```

### 4. Loading States

```javascript
// Show loading state during scan
const [isProcessing, setIsProcessing] = useState(false);

const handleScan = async (qrCode) => {
  setIsProcessing(true);
  
  try {
    const response = await fetch('/api/events/checkin_out/user', {
      ...
    });
    
    // Handle response
  } finally {
    setIsProcessing(false);
  }
};

return (
  <Button disabled={isProcessing}>
    {isProcessing ? (
      <>
        <Spinner size="small" />
        Processing...
      </>
    ) : (
      'Scan QR Code'
    )}
  </Button>
);
```

### 5. Offline Support

```javascript
// Queue scan for later if offline
const queueScan = async (qrCode) => {
  const queueItem = {
    id: generateId(),
    eventId,
    qrCode,
    timestamp: Date.now(),
    synced: false
  };
  
  // Save to IndexedDB
  await db.scanQueue.add(queueItem);
  
  // Show queued status
  showNotification({
    type: 'info',
    message: 'Scan queued. Will sync when online.'
  });
};

// Sync when online
window.addEventListener('online', async () => {
  const queue = await db.scanQueue.where('synced').equals(false).toArray();
  
  for (const item of queue) {
    try {
      await processCheckIn(item);
      await db.scanQueue.update(item.id, { synced: true });
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
});
```

### 6. Real-time Updates

```javascript
// WebSocket connection for real-time updates
const useCheckInUpdates = (eventId) => {
  useEffect(() => {
    const ws = new WebSocket(`wss://api.example.com/events/${eventId}/checkins`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update UI with new check-in
      updateCheckInList(data);
      
      // Update statistics
      updateStats({
        totalCheckedIn: data.totalCheckedIn,
        totalRegistered: data.totalRegistered,
        walkinCount: data.walkinCount
      });
    };
    
    return () => ws.close();
  }, [eventId]);
};
```

---

## Performance Considerations

### 1. Database Optimization

```javascript
// Use select to fetch only needed fields
const event = await prisma.event.findUnique({
  where: { id: eventId },
  select: {
    id: true,
    title_EN: true,
    activityStart: true,
    activityEnd: true,
    allowMultipleCheckIns: true,
    walkinEnabled: true,
    walkinCapacity: true,
    currentWalkins: true,
    lateCheckInPenalty: true,
    status: true
  }
});

// Use include only when needed
const registration = await prisma.eventRegistration.findUnique({
  where: { user_id_event_id: { user_id: userId, event_id: eventId } },
  include: {
    checkInRecords: {
      where: { checkedIn: true },
      include: { checkInTimeSlot: true }
    }
  }
});
```

### 2. Transaction Timeout

```javascript
// Set appropriate timeout
await prisma.$transaction(async (tx) => {
  // ...
}, {
  isolationLevel: 'Serializable',
  maxWait: 5000,    // Wait max 5s for lock
  timeout: 10000     // Transaction timeout 10s
});
```

### 3. Caching

```javascript
// Cache event details (rarely change)
const getEventDetails = async (eventId) => {
  const cacheKey = `event:${eventId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  
  await redis.set(cacheKey, JSON.stringify(event), {
    EX: 300 // 5 minutes
  });
  
  return event;
};
```

### 4. Batch Operations

```javascript
// Update multiple records in one query
await prisma.userCheckInRecord.updateMany({
  where: {
    eventRegistration_id: registrationId,
    checkInTimeSlot_id: { in: pastSlotIds },
    checkedIn: true,
    checkedOut: false
  },
  data: {
    checkedOut: true,
    checkOutTime: now
  }
});
```

---

## Monitoring & Logging

### 1. Key Metrics

- Check-in/out success rate
- Average processing time
- QR code validation failures
- Walk-in conversion rate
- Late check-in percentage
- EXP calculation errors

### 2. Logging Format

```javascript
logger.info('CheckIn', {
  userId,
  eventId,
  action: 'checkin',
  mode: 'auto',
  model: 'multiple',
  slotNumber: 1,
  isLate: false,
  processingTime: 245, // ms
  success: true
});

logger.error('CheckInError', {
  userId,
  eventId,
  error: 'QR_EXPIRED',
  details: error.message,
  timestamp: new Date()
});
```

### 3. Alerts

```javascript
// Alert if error rate > 5%
if (errorRate > 0.05) {
  alerting.send({
    severity: 'high',
    message: `Check-in error rate: ${errorRate * 100}%`,
    eventId
  });
}

// Alert if processing time > 5s
if (processingTime > 5000) {
  alerting.send({
    severity: 'medium',
    message: `Slow check-in processing: ${processingTime}ms`,
    eventId,
    userId
  });
}
```
