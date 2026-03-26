# Notifications API

API สำหรับการจัดการ Firebase Cloud Messaging (FCM) และการส่งการแจ้งเตือน

## Table of Contents

- [POST /api/notifications/subscribe](#post-apinotificationssubscribe) - บันทึก FCM token
- [DELETE /api/notifications/subscribe](#delete-apinotificationssubscribe) - ลบ FCM token
- [POST /api/notifications/broadcast](#post-apinotificationsbroadcast) - ส่ง broadcast notification
- [POST /api/notifications/test](#post-apinotificationstest) - ทดสอบส่ง notification

---

## POST /api/notifications/subscribe

บันทึกหรืออัปเดต FCM token สำหรับรับ push notifications

### Endpoint
```
POST /api/notifications/subscribe
```

### Authentication
ไม่ต้องการ (Public endpoint)

### Request Body

```json
{
  "token": "fcm_device_token_here...",
  "userId": 123,
  "deviceInfo": "iPhone 14 Pro - iOS 16.0"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | FCM device token |
| userId | number | No | User ID ของผู้ใช้ (สำหรับเชื่อมโยง token กับ user) |
| deviceInfo | string | No | ข้อมูลอุปกรณ์ (เช่น model, OS version) |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "tokenId": 456
}
```

#### Error Responses

**400 Bad Request** - ไม่มี token
```json
{
  "error": "Token is required"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to save token"
}
```

### Business Logic

1. **Upsert Token**:
   - หาก token มีอยู่แล้ว → อัปเดต userId, deviceInfo, isActive, lastUsed
   - หาก token ไม่มี → สร้างใหม่
   - ตั้งค่า isActive = true, lastUsed = ปัจจุบัน

2. **Token Management**:
   - Token สามารถผูกกับ userId (optional)
   - Token ที่ไม่ระบุ userId จะเป็น anonymous token

### Example Usage

#### cURL

```bash
curl -X POST https://api.example.com/api/notifications/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "token": "fcm_token_here...",
    "userId": 123,
    "deviceInfo": "iPhone 14 Pro"
  }'
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/notifications/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: fcmToken,
    userId: user.id,
    deviceInfo: navigator.userAgent
  })
});

const data = await response.json();
```

---

## DELETE /api/notifications/subscribe

ปิดการใช้งาน FCM token (unsubscribe from notifications)

### Endpoint
```
DELETE /api/notifications/subscribe?token={token}
```

### Authentication
ไม่ต้องการ (Public endpoint)

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | Yes | FCM token ที่ต้องการลบ |

### Response

#### Success (200 OK)

```json
{
  "success": true
}
```

#### Error Responses

**400 Bad Request** - ไม่มี token parameter
```json
{
  "error": "Token is required"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to delete token"
}
```

### Business Logic

1. **Soft Delete**:
   - ไม่ลบ token ออกจากฐานข้อมูล
   - ตั้งค่า isActive = false
   - Token จะไม่ถูกใช้ในการส่ง notification ต่อไป

### Example Usage

#### cURL

```bash
curl -X DELETE "https://api.example.com/api/notifications/subscribe?token=fcm_token_here..."
```

#### JavaScript (Fetch)

```javascript
const response = await fetch(`/api/notifications/subscribe?token=${fcmToken}`, {
  method: 'DELETE'
});

const data = await response.json();
```

---

## POST /api/notifications/broadcast

ส่ง notification แบบ broadcast ไปยังผู้ใช้หลายคน

### Endpoint
```
POST /api/notifications/broadcast
```

### Authentication
Required - X-Internal-Key header (Internal API only)

### Request Headers

```
X-Internal-Key: your-internal-api-key
```

### Request Body

```json
{
  "title_TH": "ประกาศจากระบบ",
  "title_EN": "System Announcement",
  "message_TH": "กิจกรรมจะเริ่มในอีก 30 นาที",
  "message_EN": "Event will start in 30 minutes",
  "type": "EVENT_REMINDER",
  "data": {
    "eventId": "123",
    "action": "open_event"
  },
  "icon": "https://example.com/icon.png",
  "targetUserIds": [1, 2, 3]
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title_TH | string | Yes | หัวข้อการแจ้งเตือน (ไทย) |
| title_EN | string | Yes | หัวข้อการแจ้งเตือน (อังกฤษ) |
| message_TH | string | Yes | ข้อความ (ไทย) |
| message_EN | string | Yes | ข้อความ (อังกฤษ) |
| type | string | No | ประเภทการแจ้งเตือน (default: SYSTEM_ANNOUNCEMENT) |
| data | object | No | ข้อมูลเพิ่มเติม (custom data) |
| icon | string | No | URL ของไอคอน notification |
| targetUserIds | number[] | No | รายการ user IDs ที่ต้องการส่ง (ไม่ระบุ = ส่งทุกคน) |

**Notification Types:**
- `EVENT_REMINDER` - เตือนก่อนกิจกรรมเริ่ม
- `REGISTRATION_CONFIRMED` - ยืนยันการลงทะเบียน
- `LEVEL_UP` - เลื่อนระดับ
- `EVALUATION_AVAILABLE` - มีแบบประเมินให้ทำ
- `SYSTEM_ANNOUNCEMENT` - ประกาศจากระบบ

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "result": {
    "sent": 150,
    "failed": 5,
    "total": 155
  }
}
```

#### Error Responses

**401 Unauthorized** - ไม่มี X-Internal-Key หรือไม่ถูกต้อง
```json
{
  "error": "Unauthorized"
}
```

**400 Bad Request** - ข้อมูลไม่ครบถ้วน
```json
{
  "error": "Missing required fields"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to send notification"
}
```

### Business Logic

1. **Target Selection**:
   - หากระบุ `targetUserIds` → ส่งเฉพาะ users เหล่านั้น
   - หากไม่ระบุ → ส่งให้ทุกคนที่มี active FCM token

2. **Message Format**:
   - ส่ง title_EN และ message_EN ใน notification payload
   - ส่ง title_TH และ message_TH ใน data payload
   - App สามารถเลือกแสดงภาษาตามการตั้งค่าของผู้ใช้

3. **Error Handling**:
   - นับจำนวนข้อความที่ส่งสำเร็จและล้มเหลว
   - Token ที่ invalid จะถูกปิดการใช้งานอัตโนมัติ

### Example Usage

#### cURL

```bash
curl -X POST https://api.example.com/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: your-secret-key" \
  -d '{
    "title_TH": "แจ้งเตือน",
    "title_EN": "Notification",
    "message_TH": "มีกิจกรรมใหม่",
    "message_EN": "New event available",
    "type": "EVENT_REMINDER"
  }'
```

---

## POST /api/notifications/test

ทดสอบการส่ง notification (สำหรับ testing และ debugging)

### Endpoint
```
POST /api/notifications/test
```

### Authentication
Required - X-Internal-Key header (Internal API only)

### Request Headers

```
X-Internal-Key: your-internal-api-key
```

### Request Body

```json
{
  "user_id": 123,
  "user_ids": [1, 2, 3],
  "sendToAll": false,
  "title_TH": "ทดสอบการแจ้งเตือน",
  "title_EN": "Test Notification",
  "message_TH": "นี่คือข้อความทดสอบ",
  "message_EN": "This is a test message",
  "type": "SYSTEM_ANNOUNCEMENT",
  "data": {
    "test": "true"
  },
  "icon": "https://example.com/test-icon.png",
  "saveToDatabase": false
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | number | No | ส่งไปยัง user คนเดียว |
| user_ids | number[] | No | ส่งไปยังหลาย users |
| sendToAll | boolean | No | ส่งไปยังทุก active tokens |
| title_TH | string | Yes | หัวข้อ (ไทย) |
| title_EN | string | Yes | หัวข้อ (อังกฤษ) |
| message_TH | string | Yes | ข้อความ (ไทย) |
| message_EN | string | Yes | ข้อความ (อังกฤษ) |
| type | string | No | ประเภท notification (default: SYSTEM_ANNOUNCEMENT) |
| data | object | No | Custom data |
| icon | string | No | URL ของไอคอน |
| saveToDatabase | boolean | No | บันทึกลงฐานข้อมูลหรือไม่ (default: false) |

### Response

#### Success (200 OK)

```json
{
  "success": 10,
  "failure": 2,
  "total": 12,
  "invalidTokens": 2,
  "savedNotifications": 0
}
```

| Field | Description |
|-------|-------------|
| success | จำนวนที่ส่งสำเร็จ |
| failure | จำนวนที่ส่งล้มเหลว |
| total | จำนวนทั้งหมด |
| invalidTokens | จำนวน token ที่ไม่ถูกต้อง (ถูกปิดการใช้งาน) |
| savedNotifications | จำนวนที่บันทึกลงฐานข้อมูล |

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**400 Bad Request** - ข้อมูลไม่ครบหรือไม่ถูกต้อง
```json
{
  "error": "Missing required fields: title_TH, title_EN, message_TH, message_EN"
}
```

```json
{
  "error": "Must provide user_id, user_ids, or sendToAll"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error sending notification"
}
```

### Business Logic

1. **Target Selection** (ต้องระบุอย่างใดอย่างหนึ่ง):
   - `sendToAll: true` → ส่งไปยังทุก active tokens
   - `user_id` → ส่งไปยัง user คนเดียว
   - `user_ids` → ส่งไปยังหลาย users

2. **Token Management**:
   - ค้นหา active FCM tokens ของ target users
   - ส่ง notification ไปยังทุก tokens
   - Token ที่ invalid หรือ unregistered จะถูกปิดการใช้งานอัตโนมัติ

3. **Database Persistence**:
   - `saveToDatabase: false` (default) → ไม่บันทึก (สำหรับทดสอบ)
   - `saveToDatabase: true` → บันทึกลงตาราง notifications

4. **Error Handling**:
   - Invalid registration token → ปิดการใช้งาน token
   - Registration token not registered → ปิดการใช้งาน token
   - อื่นๆ → นับเป็น failure แต่ไม่ปิดการใช้งาน

### Example Usage

#### Test Single User

```bash
curl -X POST https://api.example.com/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: your-secret-key" \
  -d '{
    "user_id": 123,
    "title_TH": "ทดสอบ",
    "title_EN": "Test",
    "message_TH": "ข้อความทดสอบ",
    "message_EN": "Test message",
    "saveToDatabase": false
  }'
```

#### Test Multiple Users

```bash
curl -X POST https://api.example.com/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: your-secret-key" \
  -d '{
    "user_ids": [1, 2, 3, 4, 5],
    "title_TH": "ทดสอบ",
    "title_EN": "Test",
    "message_TH": "ข้อความทดสอบ",
    "message_EN": "Test message"
  }'
```

#### Broadcast Test

```bash
curl -X POST https://api.example.com/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: your-secret-key" \
  -d '{
    "sendToAll": true,
    "title_TH": "ทดสอบส่งทุกคน",
    "title_EN": "Test Broadcast",
    "message_TH": "ข้อความทดสอบ",
    "message_EN": "Test message"
  }'
```

---

## Notes

### FCM Token Lifecycle

1. **Register**: Client app ได้รับ token จาก Firebase → เรียก POST /subscribe
2. **Active**: Token ถูกใช้ส่ง notifications
3. **Refresh**: Token เปลี่ยน → เรียก POST /subscribe ใหม่ (upsert จะอัปเดตโดยอัตโนมัติ)
4. **Unsubscribe**: User ออกจากระบบ → เรียก DELETE /subscribe
5. **Invalid**: ถ้า FCM ตอบกลับว่า token invalid → ระบบจะตั้ง isActive = false อัตโนมัติ

### Security Considerations

1. **Internal API Protection**:
   - `/broadcast` และ `/test` ต้องการ X-Internal-Key
   - ใช้สำหรับเรียกจาก backend services เท่านั้น
   - ห้ามเปิดเผย key ใน client-side code

2. **Token Privacy**:
   - FCM tokens เป็นข้อมูลละเอียดอ่อน
   - อย่าเปิดเผย tokens ใน logs หรือ responses
   - Truncate tokens เมื่อแสดงใน logs

### Best Practices

1. **Token Management**:
   - เรียก POST /subscribe ทุกครั้งที่ app เปิด (เพื่ออัปเดต lastUsed)
   - เรียก DELETE /subscribe เมื่อ user logout
   - Re-subscribe เมื่อ login ใหม่

2. **Notification Content**:
   - ให้ข้อมูลครบทั้งภาษาไทยและอังกฤษ
   - ใช้ type ที่เหมาะสมเพื่อให้ app จัดการได้ถูกต้อง
   - ใส่ data เพิ่มเติมสำหรับ deep linking

3. **Testing**:
   - ใช้ `/test` endpoint สำหรับทดสอบก่อนส่งจริง
   - ตั้ง saveToDatabase: false เมื่อทดสอบ
   - ทดสอบทั้ง single user และ broadcast
