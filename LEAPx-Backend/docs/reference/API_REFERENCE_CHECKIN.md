# API Reference - Check-in System

คู่มืออ้างอิง API สำหรับระบบเช็คอิน-เช็คเอ้าท์และการจัดการ Time Slots

## Base URL

```
https://api.leap.example.com
```

## Authentication

ทุก API ต้องมี Authentication header:

```http
Authorization: Bearer {jwt_token}
```

---

## Time Slots Management

### GET /api/events/{eventId}/time-slots

ดึงรายการ Time Slots ทั้งหมดของกิจกรรม

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| eventId | integer | Yes | รหัสกิจกรรม |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "event": {
      "id": 1,
      "title_EN": "Workshop Series",
      "title_TH": "ชุดกิจกรรม Workshop"
    },
    "timeSlots": [
      {
        "id": 1,
        "event_id": 1,
        "slot_number": 1,
        "startTime": "2024-03-01T09:00:00.000Z",
        "endTime": "2024-03-01T12:00:00.000Z",
        "name_TH": "รอบเช้า",
        "name_EN": "Morning Session",
        "description_TH": null,
        "description_EN": null,
        "createdAt": "2024-02-27T10:00:00.000Z",
        "updatedAt": "2024-02-27T10:00:00.000Z",
        "skillRewards": [
          {
            "id": 1,
            "checkInTimeSlot_id": 1,
            "subSkillCategory_id": 1,
            "levelType": "I",
            "baseExperience": 8,
            "bonusExperience": 2,
            "requireCheckIn": true,
            "requireCheckOut": true,
            "requireOnTime": false,
            "subSkillCategory": {
              "id": 1,
              "name_EN": "Communication Skills",
              "name_TH": "ทักษะการสื่อสาร",
              "mainSkillCategory": {
                "id": 1,
                "name_EN": "Communication",
                "name_TH": "การสื่อสาร",
                "color": "#FF5733",
                "icon": "message-circle"
              }
            }
          }
        ]
      }
    ],
    "totalSlots": 3
  }
}
```

**Error Responses:**

- **400 Bad Request**: Invalid event ID
- **403 Forbidden**: No permission to access this event
- **404 Not Found**: Event not found

---

### POST /api/events/{eventId}/time-slots

สร้าง Time Slot ใหม่

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| eventId | integer | Yes | รหัสกิจกรรม |

**Request Body:**

```json
{
  "startTime": "2024-03-01T09:00:00+07:00",
  "endTime": "2024-03-01T12:00:00+07:00",
  "slot_number": 1,
  "name_TH": "รอบเช้า",
  "name_EN": "Morning Session",
  "description_TH": "กิจกรรมช่วงเช้า",
  "description_EN": "Morning activities",
  "skillRewards": [
    {
      "subSkillCategory_id": 1,
      "levelType": "I",
      "baseExperience": 8,
      "bonusExperience": 2,
      "requireCheckIn": true,
      "requireCheckOut": true,
      "requireOnTime": false
    }
  ]
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| startTime | string (ISO 8601) | Yes | เวลาเริ่มต้นของรอบ |
| endTime | string (ISO 8601) | Yes | เวลาสิ้นสุดของรอบ |
| slot_number | integer | Yes | ลำดับของรอบ (1, 2, 3, ...) |
| name_TH | string | No | ชื่อรอบภาษาไทย |
| name_EN | string | No | ชื่อรอบภาษาอังกฤษ |
| description_TH | string | No | คำอธิบายภาษาไทย |
| description_EN | string | No | คำอธิบายภาษาอังกฤษ |
| skillRewards | array | No | รายการ Skill Rewards (ถ้าต้องการเพิ่มพร้อมกัน) |

**Skill Reward Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| subSkillCategory_id | integer | Yes | รหัสทักษะย่อย |
| levelType | string | Yes | ระดับ: "I", "II", "III", "IV" |
| baseExperience | integer | Yes | EXP พื้นฐาน |
| bonusExperience | integer | No | EXP โบนัส (default: 0) |
| requireCheckIn | boolean | No | ต้องเช็คอิน (default: true) |
| requireCheckOut | boolean | No | ต้องเช็คเอ้าท์ (default: true) |
| requireOnTime | boolean | No | ต้องมาตรงเวลา (default: false) |

**Response 200:**

```json
{
  "success": true,
  "message": "Time slot created successfully",
  "data": {
    "id": 1,
    "event_id": 1,
    "slot_number": 1,
    "startTime": "2024-03-01T02:00:00.000Z",
    "endTime": "2024-03-01T05:00:00.000Z",
    "name_TH": "รอบเช้า",
    "name_EN": "Morning Session",
    "description_TH": "กิจกรรมช่วงเช้า",
    "description_EN": "Morning activities",
    "createdAt": "2024-02-27T10:00:00.000Z",
    "updatedAt": "2024-02-27T10:00:00.000Z",
    "skillRewards": [...]
  }
}
```

**Error Responses:**

- **400 Bad Request**: Missing required fields or invalid data
- **403 Forbidden**: No permission to manage this event
- **409 Conflict**: Slot number already exists

---

### PATCH /api/events/{eventId}/time-slots

อัพเดท Time Slot

**Request Body:**

```json
{
  "id": 1,
  "startTime": "2024-03-01T09:30:00+07:00",
  "endTime": "2024-03-01T12:30:00+07:00",
  "name_TH": "รอบเช้า (ปรับเวลา)",
  "name_EN": "Morning Session (Adjusted)"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | Yes | รหัส Time Slot ที่ต้องการแก้ไข |
| startTime | string | No | เวลาเริ่มต้นใหม่ |
| endTime | string | No | เวลาสิ้นสุดใหม่ |
| slot_number | integer | No | ลำดับรอบใหม่ |
| name_TH | string | No | ชื่อรอบใหม่ (ไทย) |
| name_EN | string | No | ชื่อรอบใหม่ (อังกฤษ) |
| description_TH | string | No | คำอธิบายใหม่ (ไทย) |
| description_EN | string | No | คำอธิบายใหม่ (อังกฤษ) |

**Response 200:**

```json
{
  "success": true,
  "message": "Time slot updated successfully",
  "data": {
    "id": 1,
    ...updated fields
  }
}
```

**Error Responses:**

- **400 Bad Request**: Missing id or invalid data
- **403 Forbidden**: No permission
- **404 Not Found**: Time slot not found

---

### DELETE /api/events/{eventId}/time-slots

ลบ Time Slot

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| slotId | integer | Yes | รหัส Time Slot ที่ต้องการลบ |

**Example:**

```http
DELETE /api/events/1/time-slots?slotId=1
```

**Response 200:**

```json
{
  "success": true,
  "message": "Time slot deleted successfully"
}
```

**Error Responses:**

- **400 Bad Request**: Invalid slotId
- **403 Forbidden**: No permission
- **404 Not Found**: Time slot not found
- **409 Conflict**: Cannot delete (has check-in records)

---

## Skill Rewards Management

### GET /api/events/{eventId}/time-slots/{slotId}/skill-rewards

ดึง Skill Rewards ของ Time Slot

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| eventId | integer | Yes | รหัสกิจกรรม |
| slotId | integer | Yes | รหัส Time Slot |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "timeSlot": {
      "id": 1,
      "slot_number": 1,
      "startTime": "2024-03-01T02:00:00.000Z",
      "endTime": "2024-03-01T05:00:00.000Z",
      "name_TH": "รอบเช้า",
      "name_EN": "Morning Session"
    },
    "skillRewards": [
      {
        "id": 1,
        "checkInTimeSlot_id": 1,
        "subSkillCategory_id": 1,
        "levelType": "I",
        "baseExperience": 8,
        "bonusExperience": 2,
        "requireCheckIn": true,
        "requireCheckOut": true,
        "requireOnTime": false,
        "subSkillCategory": {...}
      }
    ],
    "totalRewards": 1
  }
}
```

---

### POST /api/events/{eventId}/time-slots/{slotId}/skill-rewards

เพิ่ม Skill Reward ให้ Time Slot

**Request Body:**

```json
{
  "subSkillCategory_id": 2,
  "levelType": "II",
  "baseExperience": 16,
  "bonusExperience": 4,
  "requireCheckIn": true,
  "requireCheckOut": true,
  "requireOnTime": true
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Skill reward added successfully",
  "data": {
    "id": 2,
    "checkInTimeSlot_id": 1,
    "subSkillCategory_id": 2,
    "levelType": "II",
    "baseExperience": 16,
    "bonusExperience": 4,
    ...
  }
}
```

**Error Responses:**

- **400 Bad Request**: Missing required fields
- **404 Not Found**: Time slot or sub skill category not found
- **409 Conflict**: Skill reward already exists

---

### PATCH /api/events/{eventId}/time-slots/{slotId}/skill-rewards

อัพเดท Skill Reward

**Request Body:**

```json
{
  "id": 1,
  "baseExperience": 20,
  "bonusExperience": 5,
  "requireOnTime": false
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Skill reward updated successfully",
  "data": {...}
}
```

---

### DELETE /api/events/{eventId}/time-slots/{slotId}/skill-rewards

ลบ Skill Reward

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| rewardId | integer | Yes | รหัส Skill Reward |

**Example:**

```http
DELETE /api/events/1/time-slots/1/skill-rewards?rewardId=1
```

**Response 200:**

```json
{
  "success": true,
  "message": "Skill reward deleted successfully"
}
```

---

## Check-in / Check-out

### POST /api/events/checkin_out/user

เช็คอิน หรือ เช็คเอ้าท์ (Auto Mode)

ระบบจะกำหนด action (checkin/checkout) อัตโนมัติตามเวลาปัจจุบัน

**Request Body (ใช้ QR Code):**

```json
{
  "eventId": 1,
  "qrCode": "encrypted_qr_data_string"
}
```

**Request Body (ระบุ userId):**

```json
{
  "eventId": 1,
  "userId": 123456
}
```

**Response 200 (Check-in):**

```json
{
  "success": true,
  "action": "checkin",
  "mode": "multiple",
  "isAutomatic": true,
  "message": "Checked in for slot 1",
  "data": {
    "userId": 123456,
    "slot": {
      "id": 1,
      "slot_number": 1,
      "startTime": "2024-03-01T09:00:00.000Z",
      "endTime": "2024-03-01T12:00:00.000Z"
    },
    "checkInTime": "2024-03-01T09:15:00.000Z",
    "isLate": false,
    "totalSlotsCheckedIn": 1,
    "totalSlots": 3,
    "absentSlots": 0
  }
}
```

**Response 200 (Check-out รอบกลาง):**

```json
{
  "success": true,
  "action": "checkout",
  "mode": "multiple",
  "isAutomatic": true,
  "message": "Checked out from slot 1",
  "data": {
    "userId": 123456,
    "slot": {
      "id": 1,
      "slot_number": 1
    },
    "checkOutTime": "2024-03-01T12:00:00.000Z",
    "completedSlots": 1,
    "totalSlots": 3,
    "isFullyCompleted": false,
    "finalStatus": "ATTENDED",
    "expEarned": 0,
    "skillRewards": []
  }
}
```

**Response 200 (Check-out รอบสุดท้าย - ได้ EXP):**

```json
{
  "success": true,
  "action": "checkout",
  "mode": "multiple",
  "isAutomatic": true,
  "message": "Checked out from slot 3. Event completed!",
  "data": {
    "userId": 123456,
    "slot": {
      "id": 3,
      "slot_number": 3
    },
    "checkOutTime": "2024-03-01T18:00:00.000Z",
    "completedSlots": 3,
    "totalSlots": 3,
    "isFullyCompleted": true,
    "finalStatus": "COMPLETED",
    "expEarned": 48,
    "skillRewards": [
      {
        "subSkillCategory_id": 1,
        "levelType": "I",
        "expEarned": 24,
        "baseExperience": 24,
        "bonusExperience": 0,
        "reason_TH": "เข้าร่วมกิจกรรมครบถ้วน",
        "reason_EN": "Fully attended activity"
      },
      {
        "subSkillCategory_id": 2,
        "levelType": "II",
        "expEarned": 24,
        "baseExperience": 24,
        "bonusExperience": 0,
        "reason_TH": "เข้าร่วมกิจกรรมครบถ้วน",
        "reason_EN": "Fully attended activity"
      }
    ]
  }
}
```

**Error Responses:**

- **400 Bad Request**: Missing required fields / No active slot / Invalid QR code
- **403 Forbidden**: Not registered / Walk-in capacity full
- **404 Not Found**: Event not found
- **409 Conflict**: Already checked in/out

---

## Error Codes

### Common Error Format

```json
{
  "error": "Error message in English",
  "details": "Additional details (optional)",
  "userId": 123456
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Duplicate/constraint violation |
| 500 | Internal Server Error |

---

## Rate Limiting

- **Check-in/Check-out**: 10 requests per minute per user
- **Time Slots Management**: 30 requests per minute per admin
- **Skill Rewards Management**: 30 requests per minute per admin

---

## Webhook Events

ระบบจะส่ง webhook เมื่อเกิด events สำคัญ:

### event.checkin.completed

```json
{
  "event": "event.checkin.completed",
  "timestamp": "2024-03-01T09:15:00.000Z",
  "data": {
    "eventId": 1,
    "userId": 123456,
    "slotNumber": 1,
    "isLate": false
  }
}
```

### event.checkout.completed

```json
{
  "event": "event.checkout.completed",
  "timestamp": "2024-03-01T12:00:00.000Z",
  "data": {
    "eventId": 1,
    "userId": 123456,
    "slotNumber": 1,
    "expEarned": 0
  }
}
```

### event.fully.completed

```json
{
  "event": "event.fully.completed",
  "timestamp": "2024-03-01T18:00:00.000Z",
  "data": {
    "eventId": 1,
    "userId": 123456,
    "totalExpEarned": 48,
    "finalStatus": "COMPLETED"
  }
}
```

---

## TypeScript Types

### Request Types

```typescript
interface CreateCheckInTimeSlotRequest {
  event_id?: number; // จะถูกเติมจาก URL parameter
  startTime: string;
  endTime: string;
  slot_number: number;
  name_TH?: string;
  name_EN?: string;
  description_TH?: string;
  description_EN?: string;
  skillRewards?: CreateTimeSlotSkillRewardRequest[];
}

interface CreateTimeSlotSkillRewardRequest {
  subSkillCategory_id: number;
  levelType: "I" | "II" | "III" | "IV";
  baseExperience: number;
  bonusExperience?: number;
  requireCheckIn?: boolean;
  requireCheckOut?: boolean;
  requireOnTime?: boolean;
}

interface AutoCheckInOutRequest {
  eventId: number;
  userId?: number;
  qrCode?: string;
}
```

### Response Types

```typescript
interface CheckInOutResponse {
  success: boolean;
  action: "checkin" | "checkout";
  mode: "single" | "multiple";
  isAutomatic: boolean;
  message: string;
  data: {
    userId: number;
    slot?: {
      id: number;
      slot_number: number;
      startTime: Date;
      endTime: Date;
    };
    checkInTime?: Date;
    checkOutTime?: Date;
    isLate?: boolean;
    expEarned?: number;
    skillRewards?: SkillReward[];
    totalSlotsCheckedIn?: number;
    totalSlots?: number;
    completedSlots?: number;
    isFullyCompleted?: boolean;
    finalStatus?: string;
  };
}

interface SkillReward {
  subSkillCategory_id: number;
  levelType: "I" | "II" | "III" | "IV";
  expEarned: number;
  baseExperience: number;
  bonusExperience: number;
  reason_TH: string;
  reason_EN: string;
}
```

---

## Best Practices

### 1. Error Handling

ควรจัดการ error ทุกกรณี:

```typescript
try {
  const response = await fetch('/api/events/1/time-slots', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    
    switch (response.status) {
      case 400:
        // Handle validation error
        break;
      case 403:
        // Handle permission error
        break;
      case 409:
        // Handle conflict (duplicate)
        break;
      default:
        // Handle other errors
    }
  }

  const result = await response.json();
  // Handle success
  
} catch (error) {
  // Handle network error
}
```

### 2. Timezone Handling

เวลาทั้งหมดใช้ ISO 8601 format และควรระบุ timezone:

```typescript
// ❌ ไม่ดี
"startTime": "2024-03-01 09:00:00"

// ✅ ดี
"startTime": "2024-03-01T09:00:00+07:00"

// ✅ หรือใช้ UTC
"startTime": "2024-03-01T02:00:00Z"
```

### 3. Polling for Check-in Status

ไม่ควร poll บ่อยเกินไป:

```typescript
// ✅ ดี - Poll ทุก 30 วินาที
setInterval(checkStatus, 30000);

// ❌ ไม่ดี - Poll บ่อยเกินไป
setInterval(checkStatus, 1000);
```

### 4. Transaction Handling

เมื่อสร้าง Time Slot พร้อม Skill Rewards หลายอัน ใช้ single request:

```typescript
// ✅ ดี - สร้างพร้อมกัน
POST /api/events/1/time-slots
{
  ...,
  "skillRewards": [...]
}

// ❌ ไม่ดี - แยกสร้าง (มี race condition)
POST /api/events/1/time-slots
POST /api/events/1/time-slots/1/skill-rewards
POST /api/events/1/time-slots/1/skill-rewards
```

---

## Support

หากมีคำถามหรือพบปัญหา:

- Email: support@leap.example.com
- GitHub Issues: https://github.com/leap/backend/issues
- Documentation: https://docs.leap.example.com
