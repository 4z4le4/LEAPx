# Event Registration API

API สำหรับการลงทะเบียนเข้าร่วมกิจกรรมในฐานะผู้เข้าร่วมหรือสตาฟ

## Table of Contents

- [POST /api/events/register/user](#post-apieventsregisteruser) - ลงทะเบียน/ยกเลิกการเข้าร่วมกิจกรรมในฐานะผู้เข้าร่วม
- [GET /api/events/register/user](#get-apieventsregisteruser) - ดึงข้อมูลการลงทะเบียนของผู้ใช้
- [POST /api/events/register/staff](#post-apieventsregisterstaff) - ลงทะเบียน/ยกเลิกการเข้าร่วมกิจกรรมในฐานะสตาฟ
- [GET /api/events/register/staff](#get-apieventsregisterstaff) - ดึงข้อมูลการลงทะเบียนสตาฟของผู้ใช้
- [POST /api/events/[eventId]/register-with-invitation](#post-apieventseventidregister-with-invitation) - ลงทะเบียนด้วย invitation
- [GET /api/events/[eventId]/register-with-invitation](#get-apieventseventidregister-with-invitation) - ตรวจสอบ invitation ของผู้ใช้

---

## Overview

### Registration Flow

1. **ตรวจสอบสิทธิ์**: ยืนยันตัวตนผ่าน authentication middleware
2. **ตรวจสอบช่วงเวลา**: ตรวจสอบว่าอยู่ในช่วงเวลาลงทะเบียนหรือไม่
3. **ตรวจสอบระดับชั้นปี**: ตรวจสอบว่าผู้ใช้มีสิทธิ์ตามระดับชั้นปีที่กำหนด
4. **ตรวจสอบคณะ**: ตรวจสอบว่าผู้ใช้มีสิทธิ์ตามคณะที่กำหนด (ถ้ามี)
5. **ตรวจสอบจำนวนที่นั่ง**: ตรวจสอบว่ามีที่นั่งว่างหรือไม่
6. **ตรวจสอบการยกเลิก**: ตรวจสอบประวัติการยกเลิกไม่เกิน 2 ครั้ง
7. **สร้าง Registration**: สร้างข้อมูลการลงทะเบียนในฐานข้อมูล

### Capacity Management

ระบบจัดการจำนวนที่นั่งโดยอัตโนมัติผ่าน transaction:

- **User Registration**: อัปเดต `currentParticipants`
- **Staff Registration**: อัปเดต `currentStaffCount`
- **Cancellation**: ลดจำนวนที่นั่งและบันทึกประวัติการยกเลิก
- **Row Locking**: ใช้ `FOR UPDATE` เพื่อป้องกันการลงทะเบียนพร้อมกันเกินที่นั่ง

### Year Level Restrictions

ระบบสามารถจำกัดการลงทะเบียนตามชั้นปี:

- ดึง year level จาก CMU ID (2 หลักแรก)
- ตรวจสอบใน array `allowedYearLevels` (สำหรับ user) หรือ `staffAllowedYears` (สำหรับ staff)
- นักศึกษาปีที่ 4+ จะถูกนับเป็นปี 4
- บุคคลภายนอก (EXTERNAL) ไม่สามารถลงทะเบียนกิจกรรมที่จำกัดระดับชั้นปีได้

### Staff Registration Differences

การลงทะเบียนสตาฟมีความแตกต่างจากผู้เข้าร่วม:

1. **ตารางแยก**: ใช้ตาราง `EventStaff` แทน `EventRegistration`
2. **จำนวนที่นั่ง**: ตรวจสอบ `maxStaffCount` และ `currentStaffCount`
3. **Year Restrictions**: ใช้ `staffAllowedYears` แทน `allowedYearLevels`
4. **Staff Role**: กำหนด `StaffRole_id` เริ่มต้น = 1
5. **Responsibilities**: เริ่มต้นเป็น "-" ทั้งภาษาไทยและอังกฤษ
6. **สิทธิพิเศษ**: SUPREME และ ACTIVITY_ADMIN สามารถเข้าถึงกิจกรรมที่ดูแลได้โดยตรง

### Invitation-based Registration

การลงทะเบียนผ่าน invitation มีคุณสมบัติพิเศษ:

1. **ไม่นับจำนวนที่นั่ง**: ตัวแปร `bypassCapacity = true` ทำให้ไม่ต้องตรวจสอบที่นั่งเต็ม
2. **ตรวจสอบความเป็นเจ้าของ**: ตรวจสอบ email หรือ studentId ตรงกับ invitation
3. **สถานะ Invitation**: เปลี่ยนสถานะจาก PENDING เป็น REGISTERED
4. **บันทึก Registered Time**: บันทึกเวลาที่ลงทะเบียนสำเร็จ
5. **เชื่อมโยง Student ID**: อัปเดต studentId ใน invitation record

### Transaction Safety

ระบบใช้ Prisma Transaction เพื่อความปลอดภัยของข้อมูล:

```typescript
prisma.$transaction(async (tx) => {
  // Database operations
}, {
  isolationLevel: 'Serializable',  // ความปลอดภัยสูงสุด
  maxWait: 5000,                   // รอ lock สูงสุด 5 วินาที
  timeout: 10000                   // timeout ทั้งหมด 10 วินาที
})
```

**Isolation Level: Serializable**
- ป้องกัน race condition
- ป้องกันการลงทะเบียนเกินที่นั่ง
- รับประกันความสอดคล้องของข้อมูล

**Row Locking**
```sql
SELECT * FROM "Event" WHERE id = ? FOR UPDATE
```
- Lock row ของ event เพื่อป้องกันการเขียนพร้อมกัน
- ทำให้การตรวจสอบและอัปเดตเป็น atomic operation

---

## POST /api/events/register/user

ลงทะเบียนหรือยกเลิกการเข้าร่วมกิจกรรมในฐานะผู้เข้าร่วม

### Endpoint
```
POST /api/events/register/user
```

### Authentication
Required - LEAP_AUTH และ LEAP_USER cookies

### Request Body

```json
{
  "eventId": 123,
  "action": "register",
  "registrationType": "NORMAL"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| eventId | number | Yes | ID ของกิจกรรม |
| action | string | Yes | "register" หรือ "cancel" |
| registrationType | string | No | ประเภทการลงทะเบียน (default: "NORMAL") |

### Response

#### Success (201 Created) - Register

```json
{
  "success": true,
  "action": "register",
  "message": "Registered successfully",
  "data": {
    "id": 456,
    "user_id": 789,
    "event_id": 123,
    "status": "PENDING",
    "registrationType": "NORMAL",
    "createdAt": "2026-02-27T10:30:00.000Z",
    "updatedAt": "2026-02-27T10:30:00.000Z"
  }
}
```

#### Success (200 OK) - Cancel

```json
{
  "success": true,
  "action": "cancel",
  "message": "Registration cancelled successfully"
}
```

#### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบหรือไม่ถูกต้อง
```json
{
  "error": "Missing required fields: eventId and action"
}
```

```json
{
  "error": "Invalid action. Must be 'register' or 'cancel'"
}
```

```json
{
  "error": "Event registration period is not set"
}
```

```json
{
  "error": "Event is not open for registration"
}
```

**403 Forbidden** - ไม่มีสิทธิ์เข้าถึง

```json
{
  "error": "This event is only available for students"
}
```

```json
{
  "error": "This event is only available for year 1,2,3 students"
}
```

```json
{
  "error": "Faculty of Engineering ONLY"
}
```

```json
{
  "error": "You have reached the maximum number of cancellations for this event."
}
```

```json
{
  "error": "Event has reached maximum number of participants"
}
```

**404 Not Found** - ไม่พบข้อมูล

```json
{
  "error": "Event not found"
}
```

```json
{
  "error": "You are not registered for this event"
}
```

**409 Conflict** - ข้อมูลขัดแย้ง

```json
{
  "error": "You have already registered for this event"
}
```

```json
{
  "error": "You have already registered as staff for this event"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

#### Register Action

1. **Transaction Start**: เริ่ม Serializable transaction
2. **Lock Event**: ใช้ `FOR UPDATE` เพื่อ lock event row
3. **ตรวจสอบกิจกรรม**: ตรวจสอบว่ากิจกรรมมีอยู่จริง
4. **ตรวจสอบช่วงเวลา**: 
   - ตรวจสอบว่ามี `registrationStart` และ `registrationEnd`
   - ปรับเวลาเป็น GMT+0 (ลบ 7 ชั่วโมง)
   - ตรวจสอบว่าเวลาปัจจุบันอยู่ระหว่างช่วงเปิดลงทะเบียน
5. **ตรวจสอบระดับชั้นปี**:
   - ดึง year level จาก user ID
   - ถ้า `allowedYearLevels` ไม่ว่าง ตรวจสอบว่า user มีสิทธิ์
   - นักศึกษาปีที่ 4+ ถือเป็นปี 4
   - EXTERNAL ไม่สามารถลงทะเบียนได้
6. **ตรวจสอบคณะ**:
   - ถ้า `isForCMUEngineering = true` ตรวจสอบว่าเป็นคณะวิศวกรรมศาสตร์
7. **ตรวจสอบประวัติการยกเลิก**:
   - นับจำนวนครั้งที่ยกเลิกในตาราง `EventRegistrationCancellation`
   - ถ้ายกเลิกแล้ว >= 2 ครั้ง ไม่สามารถลงทะเบียนได้
8. **ตรวจสอบการลงทะเบียนซ้ำ**:
   - ตรวจสอบว่ามี registration อยู่แล้วหรือไม่
   - ตรวจสอบว่าเป็นสตาฟอยู่แล้วหรือไม่
9. **ตรวจสอบที่นั่ง**:
   - ตรวจสอบ `currentParticipants < maxParticipants`
10. **อัปเดตจำนวนผู้เข้าร่วม**:
   - `currentParticipants` เพิ่มขึ้น 1
11. **สร้าง Registration Record**:
   - สร้าง record ใน `EventRegistration`
   - สถานะเริ่มต้น = "PENDING"
12. **Commit Transaction**

#### Cancel Action

1. **Transaction Start**: เริ่ม Serializable transaction
2. **Lock Event**: ใช้ `FOR UPDATE` เพื่อ lock event row
3. **ตรวจสอบกิจกรรม**: ตรวจสอบว่ากิจกรรมมีอยู่จริง
4. **ตรวจสอบ Registration**:
   - ตรวจสอบว่ามี registration record อยู่จริง
5. **ลบ Registration**:
   - ลบ record จาก `EventRegistration`
6. **อัปเดตจำนวนผู้เข้าร่วม**:
   - `currentParticipants` ลดลง 1
7. **บันทึกประวัติการยกเลิก**:
   - สร้าง record ใน `EventRegistrationCancellation`
   - สถานะ = "CANCELLED"
8. **Commit Transaction**

### Example Usage

#### cURL - Register

```bash
curl -X POST https://api.example.com/api/events/register/user \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=xxx; LEAP_USER=yyy" \
  -d '{
    "eventId": 123,
    "action": "register",
    "registrationType": "NORMAL"
  }'
```

#### cURL - Cancel

```bash
curl -X POST https://api.example.com/api/events/register/user \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=xxx; LEAP_USER=yyy" \
  -d '{
    "eventId": 123,
    "action": "cancel"
  }'
```

#### JavaScript (Fetch)

```javascript
// Register
const registerResponse = await fetch('/api/events/register/user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    eventId: 123,
    action: 'register',
    registrationType: 'NORMAL'
  })
});

const registerData = await registerResponse.json();

// Cancel
const cancelResponse = await fetch('/api/events/register/user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    eventId: 123,
    action: 'cancel'
  })
});

const cancelData = await cancelResponse.json();
```

---

## GET /api/events/register/user

ดึงข้อมูลการลงทะเบียนของผู้ใช้

### Endpoint
```
GET /api/events/register/user
```

### Authentication
Required - LEAP_AUTH และ LEAP_USER cookies

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| eventId | number | No | - | กรองตาม event ID |
| page | number | No | 1 | หน้าที่ต้องการ |
| limit | number | No | 10 | จำนวนรายการต่อหน้า |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "user_id": 789,
      "event_id": 123,
      "status": "PENDING",
      "registrationType": "NORMAL",
      "createdAt": "2026-02-27T10:30:00.000Z",
      "updatedAt": "2026-02-27T10:30:00.000Z",
      "event": {
        "id": 123,
        "title_EN": "Workshop: Introduction to AI",
        "title_TH": "เวิร์กช็อป: แนะนำปัญญาประดิษฐ์",
        "status": "UPCOMING",
        "activityStart": "2026-03-01T09:00:00.000Z",
        "activityEnd": "2026-03-01T16:00:00.000Z",
        "skillsByMainCategory": [
          {
            "mainSkill": {
              "id": 1,
              "name_TH": "ทักษะการเรียนรู้",
              "name_EN": "Learning Skills",
              "slug": "learning-skills",
              "icon": "book",
              "color": "#3B82F6"
            },
            "subSkills": [
              {
                "id": 10,
                "name_TH": "ทักษะการวิเคราะห์",
                "name_EN": "Analytical Skills",
                "slug": "analytical-skills",
                "icon": "chart",
                "color": "#3B82F6",
                "levelType": "BEGINNER",
                "baseExperience": 50,
                "bonusExperience": 10
              }
            ]
          }
        ]
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 42,
    "limit": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Error Responses

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. ดึง userId จาก authentication token
2. สร้าง where clause กรองตาม user_id (และ event_id ถ้ามี)
3. นับจำนวนทั้งหมดสำหรับ pagination
4. ดึงข้อมูล registrations พร้อม:
   - ข้อมูล event พื้นฐาน
   - ข้อมูล skill rewards พร้อม main/sub categories
5. จัดกลุ่ม skills ตาม main category
6. คำนวณ pagination metadata
7. เรียงลำดับตาม createdAt (ใหม่สุดก่อน)

### Example Usage

#### cURL

```bash
curl -X GET "https://api.example.com/api/events/register/user?page=1&limit=10" \
  -H "Cookie: LEAP_AUTH=xxx; LEAP_USER=yyy"
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/events/register/user?page=1&limit=10', {
  method: 'GET',
  credentials: 'include'
});

const data = await response.json();
console.log('Registrations:', data.data);
console.log('Pagination:', data.pagination);
```

---

## POST /api/events/register/staff

ลงทะเบียนหรือยกเลิกการเข้าร่วมกิจกรรมในฐานะสตาฟ

### Endpoint
```
POST /api/events/register/staff
```

### Authentication
Required - LEAP_AUTH และ LEAP_USER cookies

### Request Body

```json
{
  "eventId": 123,
  "action": "register"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| eventId | number | Yes | ID ของกิจกรรม |
| action | string | Yes | "register" หรือ "cancel" |

### Response

#### Success (201 Created) - Register

```json
{
  "success": true,
  "action": "register",
  "message": "Registered as staff successfully",
  "data": {
    "id": 789,
    "user_id": 456,
    "event_id": 123,
    "StaffRole_id": 1,
    "status": "PENDING",
    "responsibilities_TH": "-",
    "responsibilities_EN": "-",
    "assignedAt": "2026-02-27T10:30:00.000Z",
    "assignedBy": null,
    "createdAt": "2026-02-27T10:30:00.000Z",
    "updatedAt": "2026-02-27T10:30:00.000Z",
    "checkedIn": false,
    "checkInTime": null,
    "checkedOut": false,
    "checkOutTime": null
  }
}
```

#### Success (200 OK) - Cancel

```json
{
  "success": true,
  "action": "cancel",
  "message": "Staff registration cancelled successfully"
}
```

#### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบหรือไม่ถูกต้อง
```json
{
  "error": "Missing required fields: eventId and action"
}
```

```json
{
  "error": "Invalid action. Must be 'register' or 'cancel'"
}
```

```json
{
  "error": "Event registration period is not set"
}
```

```json
{
  "error": "Event is not open for registration"
}
```

**403 Forbidden** - ไม่มีสิทธิ์เข้าถึง

```json
{
  "error": "This event is only available for students"
}
```

```json
{
  "error": "This event is only available for year 2,3,4 students"
}
```

```json
{
  "error": "Faculty of Engineering ONLY"
}
```

```json
{
  "error": "You have reached the maximum number of cancellations for this event."
}
```

```json
{
  "error": "Event has reached maximum number of staff positions"
}
```

**404 Not Found** - ไม่พบข้อมูล

```json
{
  "error": "Event not found"
}
```

```json
{
  "error": "You are not registered as staff for this event"
}
```

**409 Conflict** - ข้อมูลขัดแย้ง

```json
{
  "error": "You have already registered for this event"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

#### Register Action

1. **Transaction Start**: เริ่ม Serializable transaction
2. **Lock Event**: ใช้ `FOR UPDATE` เพื่อ lock event row
3. **ตรวจสอบกิจกรรม**: ตรวจสอบว่ากิจกรรมมีอยู่จริง
4. **ตรวจสอบช่วงเวลา**: 
   - ตรวจสอบว่ามี `registrationStart` และ `registrationEnd`
   - ปรับเวลาเป็น GMT+0 (ลบ 7 ชั่วโมง)
   - ตรวจสอบว่าเวลาปัจจุบันอยู่ระหว่างช่วงเปิดลงทะเบียน
5. **ตรวจสอบระดับชั้นปี**:
   - ดึง year level จาก user ID
   - ถ้า `staffAllowedYears` ไม่ว่าง ตรวจสอบว่า user มีสิทธิ์
   - นักศึกษาปีที่ 4+ ถือเป็นปี 4
   - EXTERNAL ไม่สามารถลงทะเบียนได้
6. **ตรวจสอบคณะ**:
   - ถ้า `isForCMUEngineering_Staff = true` ตรวจสอบว่าเป็นคณะวิศวกรรมศาสตร์
7. **ตรวจสอบประวัติการยกเลิก**:
   - นับจำนวนครั้งที่ยกเลิกในตาราง `EventRegistrationCancellation`
   - ถ้ายกเลิกแล้ว >= 2 ครั้ง ไม่สามารถลงทะเบียนได้
8. **ตรวจสอบการลงทะเบียนซ้ำ**:
   - ตรวจสอบว่ามี user registration อยู่แล้วหรือไม่
   - ตรวจสอบว่ามี staff registration อยู่แล้วหรือไม่
9. **ตรวจสอบจำนวนสตาฟ**:
   - ตรวจสอบ `currentStaffCount < maxStaffCount`
10. **อัปเดตจำนวนสตาฟ**:
   - `currentStaffCount` เพิ่มขึ้น 1
11. **สร้าง Staff Record**:
   - สร้าง record ใน `EventStaff`
   - สถานะเริ่มต้น = "PENDING"
   - StaffRole_id = 1
   - responsibilities_TH และ responsibilities_EN = "-"
12. **Commit Transaction**

#### Cancel Action

1. **Transaction Start**: เริ่ม Serializable transaction
2. **Lock Event**: ใช้ `FOR UPDATE` เพื่อ lock event row
3. **ตรวจสอบกิจกรรม**: ตรวจสอบว่ากิจกรรมมีอยู่จริง
4. **ตรวจสอบ Staff Registration**:
   - ตรวจสอบว่ามี staff record อยู่จริง
5. **ลบ Staff Record**:
   - ลบ record จาก `EventStaff`
6. **อัปเดตจำนวนสตาฟ**:
   - `currentStaffCount` ลดลง 1
7. **บันทึกประวัติการยกเลิก**:
   - สร้าง record ใน `EventRegistrationCancellation`
   - สถานะ = "CANCELLED"
8. **Commit Transaction**

### Differences from User Registration

1. **ตารางที่ใช้**: `EventStaff` แทน `EventRegistration`
2. **จำนวนที่นั่ง**: `maxStaffCount`/`currentStaffCount` แทน `maxParticipants`/`currentParticipants`
3. **การจำกัดชั้นปี**: `staffAllowedYears` แทน `allowedYearLevels`
4. **การจำกัดคณะ**: `isForCMUEngineering_Staff` แทน `isForCMUEngineering`
5. **Role Assignment**: มีการกำหนด `StaffRole_id` และ responsibilities
6. **Check-in/out**: มีฟิลด์ `checkedIn`, `checkInTime`, `checkedOut`, `checkOutTime`

### Example Usage

#### cURL - Register

```bash
curl -X POST https://api.example.com/api/events/register/staff \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=xxx; LEAP_USER=yyy" \
  -d '{
    "eventId": 123,
    "action": "register"
  }'
```

#### cURL - Cancel

```bash
curl -X POST https://api.example.com/api/events/register/staff \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=xxx; LEAP_USER=yyy" \
  -d '{
    "eventId": 123,
    "action": "cancel"
  }'
```

#### JavaScript (Fetch)

```javascript
// Register as staff
const registerResponse = await fetch('/api/events/register/staff', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    eventId: 123,
    action: 'register'
  })
});

const registerData = await registerResponse.json();

// Cancel staff registration
const cancelResponse = await fetch('/api/events/register/staff', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    eventId: 123,
    action: 'cancel'
  })
});

const cancelData = await cancelResponse.json();
```

---

## GET /api/events/register/staff

ดึงข้อมูลการลงทะเบียนสตาฟของผู้ใช้

### Endpoint
```
GET /api/events/register/staff
```

### Authentication
Required - LEAP_AUTH และ LEAP_USER cookies

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| eventId | number | No | - | กรองตาม event ID |
| page | number | No | 1 | หน้าที่ต้องการ |
| limit | number | No | 10 | จำนวนรายการต่อหน้า |
| search | string | No | "" | ค้นหาตามชื่อหรือสถานที่กิจกรรม |
| filter | string | No | "all" | "all", "pending", "upcoming", "ongoing", "completed" |
| sort | string | No | "activityStart_desc" | "activityStart_asc", "activityStart_desc", "createdAt_asc", "createdAt_desc" |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 789,
      "user_id": 456,
      "event_id": 123,
      "StaffRole_id": 1,
      "status": "REGISTERED",
      "responsibilities_TH": "ประสานงานผู้เข้าร่วม",
      "responsibilities_EN": "Coordinate participants",
      "assignedAt": "2026-02-27T10:30:00.000Z",
      "assignedBy": 999,
      "createdAt": "2026-02-27T10:30:00.000Z",
      "updatedAt": "2026-02-27T10:30:00.000Z",
      "checkedIn": false,
      "checkInTime": null,
      "checkedOut": false,
      "checkOutTime": null,
      "event": {
        "id": 123,
        "title_EN": "Workshop: Introduction to AI",
        "title_TH": "เวิร์กช็อป: แนะนำปัญญาประดิษฐ์",
        "status": "UPCOMING",
        "activityStart": "2026-03-01T09:00:00.000Z",
        "activityEnd": "2026-03-01T16:00:00.000Z",
        "location_TH": "ห้อง 301 อาคารวิศวกรรมคอมพิวเตอร์",
        "location_EN": "Room 301, Computer Engineering Building",
        "skillsByMainCategory": [
          {
            "mainSkill": {
              "id": 2,
              "name_TH": "การทำงานเป็นทีม",
              "name_EN": "Teamwork",
              "slug": "teamwork",
              "icon": "users",
              "color": "#10B981"
            },
            "subSkills": [
              {
                "id": 15,
                "name_TH": "การประสานงาน",
                "name_EN": "Coordination",
                "slug": "coordination",
                "icon": "link",
                "color": "#10B981",
                "levelType": "INTERMEDIATE",
                "baseExperience": 75,
                "bonusExperience": 15
              }
            ]
          }
        ]
      },
      "role": {
        "id": 1,
        "name": "General Staff",
        "canScanQR": false,
        "description_TH": "สตาฟทั่วไป",
        "description_EN": "General staff member",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalCount": 25,
    "limit": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Error Responses

**404 Not Found** - ไม่พบผู้ใช้
```json
{
  "error": "User not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **ดึงข้อมูลผู้ใช้**:
   - ดึง user พร้อม role และ major admin assignments
   - ตรวจสอบว่าเป็น SUPREME หรือ ACTIVITY_ADMIN
2. **สร้างรายการ Event IDs**:
   - SUPREME: เข้าถึงได้ทุกกิจกรรม
   - ACTIVITY_ADMIN: เฉพาะกิจกรรมในสาขาที่ดูแล
   - User ทั่วไป: เฉพาะที่ลงทะเบียน
3. **ดึง Staff Registrations**:
   - กรองตาม user_id (และ event_id ถ้ามี)
   - ดึงข้อมูล event, skills, และ role
4. **เพิ่ม Admin Events**:
   - สำหรับ SUPREME/ACTIVITY_ADMIN
   - เพิ่มกิจกรรมที่ยังไม่ได้ลงทะเบียนแต่มีสิทธิ์ดูแล
5. **Search & Filter**:
   - ค้นหาจาก title หรือ location (ภาษาไทย/อังกฤษ)
   - กรองตามสถานะ: pending, upcoming, ongoing, completed
6. **Sort**:
   - เรียงตาม activityStart หรือ createdAt
   - รองรับทั้ง ascending และ descending
7. **Pagination**:
   - คำนวณ skip และ take
   - ส่ง metadata กลับ
8. **Transform Skills**:
   - จัดกลุ่ม skills ตาม main category

### Filter Logic

- **pending**: `status === "PENDING"`
- **upcoming**: `status !== "PENDING" && now < activityStart`
- **ongoing**: `status !== "PENDING" && now >= activityStart && now <= activityEnd`
- **completed**: `status !== "PENDING" && now > activityEnd`

### Example Usage

#### cURL

```bash
curl -X GET "https://api.example.com/api/events/register/staff?page=1&limit=10&filter=upcoming&sort=activityStart_asc" \
  -H "Cookie: LEAP_AUTH=xxx; LEAP_USER=yyy"
```

#### JavaScript (Fetch)

```javascript
const params = new URLSearchParams({
  page: '1',
  limit: '10',
  search: 'workshop',
  filter: 'upcoming',
  sort: 'activityStart_asc'
});

const response = await fetch(`/api/events/register/staff?${params}`, {
  method: 'GET',
  credentials: 'include'
});

const data = await response.json();
console.log('Staff Registrations:', data.data);
console.log('Pagination:', data.pagination);
```

---

## POST /api/events/[eventId]/register-with-invitation

ลงทะเบียนเข้าร่วมกิจกรรมด้วย invitation

### Endpoint
```
POST /api/events/{eventId}/register-with-invitation
```

### Authentication
Required - LEAP_AUTH และ LEAP_USER cookies

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | number | Yes | ID ของกิจกรรม |

### Request Body

```json
{
  "invitationId": 456
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| invitationId | number | Yes | ID ของ invitation |

### Response

#### Success (201 Created)

```json
{
  "success": true,
  "message": "Registered successfully with invitation",
  "data": {
    "registration": {
      "id": 789,
      "user_id": 123,
      "event_id": 456,
      "status": "PENDING",
      "registrationType": "NORMAL",
      "createdAt": "2026-02-27T10:30:00.000Z",
      "updatedAt": "2026-02-27T10:30:00.000Z"
    },
    "invitation": {
      "id": 456,
      "event_id": 789,
      "email": "user@cmu.ac.th",
      "studentId": 123,
      "status": "REGISTERED",
      "sentAt": "2026-02-20T10:00:00.000Z",
      "registeredAt": "2026-02-27T10:30:00.000Z",
      "createdAt": "2026-02-20T10:00:00.000Z",
      "updatedAt": "2026-02-27T10:30:00.000Z"
    }
  }
}
```

#### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบหรือไม่ถูกต้อง

```json
{
  "error": "Invitation ID is required"
}
```

```json
{
  "error": "Invitation is no longer valid"
}
```

**403 Forbidden** - ไม่มีสิทธิ์เข้าถึง

```json
{
  "error": "This invitation is not for you"
}
```

```json
{
  "error": "Event has reached maximum number of participants"
}
```

**404 Not Found** - ไม่พบข้อมูล

```json
{
  "error": "Invitation not found"
}
```

```json
{
  "error": "Event not found"
}
```

```json
{
  "error": "User not found"
}
```

**409 Conflict** - ข้อมูลขัดแย้ง

```json
{
  "error": "You have already registered for this event"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **ดึง Event ID**: จาก URL parameter
2. **ดึง Invitation ID**: จาก request body
3. **Validate Invitation ID**: ตรวจสอบว่ามีการส่ง invitationId มา
4. **ค้นหา Invitation**:
   - ตรวจสอบว่า invitation มีอยู่จริง
   - ตรวจสอบว่า invitation ตรงกับ event_id
5. **ตรวจสอบสถานะ Invitation**:
   - สถานะต้องเป็น "PENDING"
   - ถ้าไม่ใช่ PENDING แสดงว่าถูกใช้ไปแล้ว
6. **ตรวจสอบผู้ใช้**:
   - ดึงข้อมูล user จาก userId
   - ตรวจสอบว่า user มีอยู่จริง
7. **ตรวจสอบความเป็นเจ้าของ Invitation**:
   - ตรวจสอบ email ตรงกับ user.email หรือ
   - ตรวจสอบ studentId ตรงกับ user.id
8. **ตรวจสอบ Event**:
   - ตรวจสอบว่า event มีอยู่จริง
9. **ตรวจสอบการลงทะเบียนซ้ำ**:
   - ตรวจสอบว่า user ลงทะเบียนไปแล้วหรือไม่
10. **ตรวจสอบจำนวนที่นั่ง** (ถ้า bypassCapacity = false):
   - ตรวจสอบ currentParticipants < maxParticipants
   - **หมายเหตุ**: ปัจจุบัน bypassCapacity = true ทำให้ข้ามการตรวจสอบ
11. **Transaction**:
   - สร้าง EventRegistration record
   - อัปเดต EventInvitation status เป็น "REGISTERED"
   - อัปเดต registeredAt และ studentId
   - (ถ้า bypassCapacity = false) เพิ่ม currentParticipants
12. **Return Data**: ส่งทั้ง registration และ invitation กลับ

### Special Features

#### Capacity Bypass

```typescript
const bypassCapacity = true;
```

- เมื่อ `bypassCapacity = true`:
  - ไม่ตรวจสอบว่ากิจกรรมเต็มหรือไม่
  - ไม่อัปเดต currentParticipants
  - อนุญาตให้ลงทะเบียนแม้ที่นั่งเต็ม
- ใช้สำหรับ:
  - VIP invitations
  - Special guests
  - Reserved slots

#### Invitation Validation

Invitation ต้องผ่านเงื่อนไขทั้งหมด:
1. มีอยู่ในฐานข้อมูล
2. event_id ตรงกับที่ระบุ
3. status = "PENDING"
4. email หรือ studentId ตรงกับผู้ใช้

#### Transaction Safety

ใช้ Prisma transaction array เพื่อ:
- รับประกันการสร้าง registration และอัปเดต invitation เป็น atomic operation
- Rollback ทั้งหมดถ้าเกิด error ระหว่างทาง

### Example Usage

#### cURL

```bash
curl -X POST https://api.example.com/api/events/123/register-with-invitation \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=xxx; LEAP_USER=yyy" \
  -d '{
    "invitationId": 456
  }'
```

#### JavaScript (Fetch)

```javascript
const eventId = 123;
const invitationId = 456;

const response = await fetch(`/api/events/${eventId}/register-with-invitation`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    invitationId: invitationId
  })
});

const data = await response.json();
if (data.success) {
  console.log('Registration:', data.data.registration);
  console.log('Invitation:', data.data.invitation);
}
```

---

## GET /api/events/[eventId]/register-with-invitation

ตรวจสอบ invitation ของผู้ใช้สำหรับกิจกรรมนี้

### Endpoint
```
GET /api/events/{eventId}/register-with-invitation
```

### Authentication
Required - LEAP_AUTH และ LEAP_USER cookies

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | number | Yes | ID ของกิจกรรม |

### Response

#### Success (200 OK) - Found Invitation

```json
{
  "success": true,
  "data": {
    "id": 456,
    "event_id": 123,
    "email": "user@cmu.ac.th",
    "studentId": 789,
    "status": "PENDING",
    "sentAt": "2026-02-20T10:00:00.000Z",
    "registeredAt": null,
    "createdAt": "2026-02-20T10:00:00.000Z",
    "updatedAt": "2026-02-20T10:00:00.000Z"
  }
}
```

#### Success (200 OK) - No Invitation

```json
{
  "success": true,
  "message": "No invitation found for you",
  "data": null
}
```

#### Error Responses

**404 Not Found** - ไม่พบผู้ใช้
```json
{
  "error": "User not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. ดึง eventId จาก URL parameter
2. ดึง userId จาก authentication token
3. ค้นหา user record
4. ค้นหา invitation ที่:
   - event_id ตรงกับที่ระบุ
   - email ตรงกับ user.email หรือ
   - studentId ตรงกับ user.id
5. ถ้าเจอ invitation:
   - ส่งข้อมูล invitation กลับ
   - สามารถตรวจสอบ status เพื่อดูว่าใช้ไปแล้วหรือยัง
6. ถ้าไม่เจอ:
   - ส่ง success = true แต่ data = null
   - ไม่ถือเป็น error

### Use Cases

**ตรวจสอบก่อนลงทะเบียน**:
```javascript
// Check if user has invitation
const checkResponse = await fetch(`/api/events/${eventId}/register-with-invitation`, {
  method: 'GET',
  credentials: 'include'
});

const checkData = await checkResponse.json();

if (checkData.data && checkData.data.status === 'PENDING') {
  // User has valid invitation, show special registration flow
  console.log('You have been invited to this event!');
} else {
  // No invitation, show normal registration
  console.log('No invitation found');
}
```

**แสดงสถานะ Invitation**:
```javascript
if (checkData.data) {
  switch (checkData.data.status) {
    case 'PENDING':
      console.log('Invitation is waiting for your response');
      break;
    case 'REGISTERED':
      console.log('You already used this invitation');
      break;
    case 'DECLINED':
      console.log('You declined this invitation');
      break;
  }
}
```

### Example Usage

#### cURL

```bash
curl -X GET "https://api.example.com/api/events/123/register-with-invitation" \
  -H "Cookie: LEAP_AUTH=xxx; LEAP_USER=yyy"
```

#### JavaScript (Fetch)

```javascript
const eventId = 123;

const response = await fetch(`/api/events/${eventId}/register-with-invitation`, {
  method: 'GET',
  credentials: 'include'
});

const data = await response.json();

if (data.data) {
  console.log('Invitation found:', data.data);
  console.log('Status:', data.data.status);
} else {
  console.log('No invitation for this event');
}
```

---

## Error Handling

### Error Codes Summary

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Missing fields, invalid action, registration closed |
| 403 | Forbidden | No permission, event full, year/faculty restrictions |
| 404 | Not Found | Event/user/invitation not found, not registered |
| 409 | Conflict | Already registered |
| 500 | Internal Server Error | Database error, transaction timeout |

### Transaction Errors

Transaction อาจล้มเหลวเนื่องจาก:

1. **Timeout**: Transaction ใช้เวลานานเกิน 10 วินาที
2. **Lock Wait**: รอ lock นานเกิน 5 วินาที
3. **Serialization Failure**: Conflict กับ transaction อื่น
4. **Deadlock**: Transaction รอ lock ซึ่งกันและกัน

**แนวทางแก้ไข**:
- Retry เมื่อเกิด serialization failure
- ลด transaction scope ให้เล็กที่สุด
- ใช้ optimistic locking สำหรับ operation ที่ไม่ critical

### Validation Errors

ข้อความ error ที่พบบ่อย:

- `EVENT_NOT_FOUND`: ไม่พบกิจกรรม
- `REGISTRATION_PERIOD_NOT_SET`: ยังไม่ได้กำหนดช่วงเวลาลงทะเบียน
- `REGISTRATION_CLOSED`: ปิดรับลงทะเบียนแล้ว
- `STUDENT_ONLY`: กิจกรรมสำหรับนักศึกษาเท่านั้น
- `YEAR_NOT_ALLOWED`: ชั้นปีไม่ตรงตามเงื่อนไข
- `MAX_CANCELLATION_REACHED`: ยกเลิกเกิน 2 ครั้ง
- `ALREADY_REGISTERED`: ลงทะเบียนไปแล้ว
- `ALREADY_STAFF`: เป็นสตาฟอยู่แล้ว
- `EVENT_FULL`: กิจกรรมเต็มแล้ว
- `STAFF_FULL`: ตำแหน่งสตาฟเต็มแล้ว
- `NOT_REGISTERED`: ไม่ได้ลงทะเบียนกิจกรรมนี้
- `NOT_REGISTERED_AS_STAFF`: ไม่ได้ลงทะเบียนเป็นสตาฟกิจกรรมนี้

---

## Best Practices

### Client Implementation

1. **ตรวจสอบสถานะก่อนลงทะเบียน**:
```javascript
// Check event details first
const eventResponse = await fetch(`/api/events/${eventId}`);
const event = await eventResponse.json();

// Verify registration is open
const now = new Date();
if (now < new Date(event.registrationStart) || now > new Date(event.registrationEnd)) {
  alert('Registration is not open');
  return;
}

// Check if full
if (event.currentParticipants >= event.maxParticipants) {
  alert('Event is full');
  return;
}

// Then register
const registerResponse = await fetch('/api/events/register/user', {
  method: 'POST',
  // ...
});
```

2. **จัดการ Error อย่างเหมาะสม**:
```javascript
try {
  const response = await fetch('/api/events/register/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ eventId, action: 'register' })
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle specific errors
    switch (response.status) {
      case 400:
        alert(`Invalid request: ${data.error}`);
        break;
      case 403:
        alert(`Access denied: ${data.error}`);
        break;
      case 409:
        alert(`Already registered: ${data.error}`);
        break;
      default:
        alert(`Error: ${data.error}`);
    }
    return;
  }

  // Success
  alert('Registered successfully!');
  
} catch (error) {
  console.error('Network error:', error);
  alert('Failed to connect to server');
}
```

3. **Retry Logic สำหรับ Transaction Errors**:
```javascript
async function registerWithRetry(eventId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/events/register/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId, action: 'register' })
      });

      const data = await response.json();

      if (response.ok) {
        return data;
      }

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(data.error);
      }

      // Retry on server errors (5xx)
      if (i === maxRetries - 1) {
        throw new Error(data.error);
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));

    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
    }
  }
}
```

### Backend Considerations

1. **Monitor Transaction Performance**:
   - ติดตาม transaction timeout
   - ตรวจสอบ lock wait time
   - วิเคราะห์ serialization failures

2. **Optimize Database Queries**:
   - ใช้ index สำหรับ foreign keys
   - ใช้ SELECT FOR UPDATE เฉพาะที่จำเป็น
   - Minimize transaction scope

3. **Handle Race Conditions**:
   - ใช้ Serializable isolation level
   - Implement proper error handling
   - Log conflicts สำหรับ debugging

4. **Capacity Management**:
   - ตรวจสอบ currentParticipants ใน transaction
   - ใช้ increment/decrement แทน manual calculation
   - Implement waitlist ถ้าจำเป็น

---

## Security Considerations

### Authentication
- ทุก endpoint ต้องผ่าน `withUserAuth` middleware
- ตรวจสอบ LEAP_AUTH และ LEAP_USER tokens
- Verify userId จาก token ตรงกับ request

### Authorization
- User สามารถลงทะเบียนตัวเองเท่านั้น
- SUPREME และ ACTIVITY_ADMIN มี privilege พิเศษใน GET staff endpoint
- Invitation ต้องตรงกับ email หรือ studentId

### Data Validation
- ตรวจสอบ eventId และ action ใน request body
- Validate invitation ownership
- ตรวจสอบ year level และ faculty restrictions

### Transaction Security
- ใช้ Serializable isolation level
- Row locking ป้องกัน race conditions
- Timeout protection (5s max wait, 10s total)

### Rate Limiting Recommendations
- จำกัด registration attempts per user per minute
- Implement CAPTCHA สำหรับ high-demand events
- Monitor และ block suspicious activity

---

## Changelog

### Version 1.1.4 (2025-12-22)
- เพิ่ม invitation-based registration
- เพิ่ม capacity bypass สำหรับ VIP invitations

### Version 1.1 (2025-12-22)
- เพิ่ม faculty restrictions (isForCMUEngineering)
- ปรับปรุง error handling

### Version 1.0 (2025-11-23)
- เพิ่ม staff registration system
- เพิ่ม year level restrictions
- Implement Serializable transactions

### Version 0.4 (2025-12-04)
- Initial registration API
- Basic capacity management
- User registration และ cancellation
