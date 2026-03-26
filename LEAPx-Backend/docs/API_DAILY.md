# Daily Operations API

API สำหรับการจัดการงานประจำวัน (Daily approval workflows)

## Table of Contents

### User Registration Approval
- [GET /api/daily/event/user](#get-apidailyeventuser) - ดึงข้อมูล pending registrations
- [POST /api/daily/event/user](#post-apidailyeventuser) - อนุมัติ/ปฏิเสธ registrations

### Staff Management
- [GET /api/daily/event/staff](#get-apidailyeventstaff) - ดึงรายการ events สำหรับ staff
- [POST /api/daily/event/staff](#post-apidailyeventstaff) - จัดการ staff registrations
- [GET /api/daily/event/staff/manage](#get-apidailyeventstaffmanage) - ดึงรายการ staff roles
- [POST /api/daily/event/staff/manage](#post-apidailyeventstaffmanage) - จัดการ staff
- [GET /api/daily/event/staff/manage/list](#get-apidailyeventstaffmanagelist) - ดึงรายชื่อ staff ในอีเวนต์

---

## GET /api/daily/event/user

ดึงข้อมูลสำหรับจัดการคำขอเข้าร่วมกิจกรรมของผู้ใช้ (Activity Admin)

### Endpoint
```
GET /api/daily/event/user?mode={mode}&eventId={eventId}&page={page}&limit={limit}
```

### Authentication
Required - Activity Admin role

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mode | string | No | `list` หรือ `detail` (default: `list`) |
| eventId | number | No* | Event ID (required เมื่อ `mode=detail`) |
| page | number | No | หน้าที่ต้องการ (default: 1) |
| limit | number | No | จำนวนรายการต่อหน้า (default: 20, max: 100) |
| search | string | No | ค้นหา event title/description (list) หรือค้นหาผู้สมัคร (detail) |
| status | string | No | กรองสถานะ event (เช่น DRAFT, PUBLISHED) |
| isOnline | boolean | No | true/false |
| majorCategoryId | number | No | กรองตาม major category |
| pendingOnly | boolean | No | list mode: นับเฉพาะ PENDING (default: true) |
| registrationStatus | string | No | detail mode: กรองสถานะ registration (default: PENDING เมื่อ pendingOnly=true) |

\* ต้องระบุเมื่อ `mode=detail`

### Response

#### Success (200 OK)

**mode=list**

```json
{
  "success": true,
  "mode": "list",
  "data": [
    {
      "id": 10,
      "title_TH": "เวิร์คช็อปวิทยาการคอมพิวเตอร์",
      "title_EN": "Computer Science Workshop",
      "status": "PUBLISHED",
      "isOnline": false,
      "activityStart": "2024-02-01T09:00:00Z",
      "activityEnd": "2024-02-01T17:00:00Z",
      "majorCategory": {
        "id": 1,
        "code": "CPE",
        "name_TH": "วิศวกรรมคอมพิวเตอร์",
        "name_EN": "Computer Engineering"
      },
      "_count": {
        "registrations": 5
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

**mode=detail**

```json
{
  "success": true,
  "mode": "detail",
  "data": {
    "event": {
      "id": 10,
      "title_TH": "เวิร์คช็อปวิทยาการคอมพิวเตอร์",
      "title_EN": "Computer Science Workshop",
      "status": "PUBLISHED",
      "majorCategory": {
        "id": 1,
        "code": "CPE",
        "name_TH": "วิศวกรรมคอมพิวเตอร์",
        "name_EN": "Computer Engineering"
      }
    },
    "registrations": [
      {
        "id": 100,
        "user_id": 15,
        "event_id": 10,
        "status": "PENDING",
        "createdAt": "2024-01-20T10:00:00Z",
        "user": {
          "id": 15,
          "firstName": "สมชาย",
          "lastName": "ใจดี",
          "email": "somchai@cmu.ac.th",
          "faculty": "Engineering",
          "major": "Computer Engineering"
        },
        "photo": null
      }
    ]
  },
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

#### Error Responses

**404 Not Found**
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

1. **Permission Check**:
   - SUPREME → ดูได้ทั้งหมด
   - Major Admin → ดูเฉพาะ events ของ majors ที่ดูแล

2. **Mode**:
  - `list` → ส่งรายชื่อ events ทั้งหมดที่มีสิทธิ์เห็น พร้อม pagination และตัวนับ registrations
  - `detail` → ส่งรายละเอียด event + รายชื่อ registrations ของ event นั้นแบบ pagination

3. **Filtering**:
  - list รองรับ status/isOnline/majorCategoryId/search
  - detail รองรับ registrationStatus/search

### Example Usage

```bash
# List events
curl "https://api.example.com/api/daily/event/user?mode=list&page=1&limit=20&status=PUBLISHED" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"

# Get event registrations (detail)
curl "https://api.example.com/api/daily/event/user?mode=detail&eventId=10&page=1&limit=20&registrationStatus=PENDING" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

---

## POST /api/daily/event/user

อนุมัติหรือปฏิเสธ registrations

### Endpoint
```
POST /api/daily/event/user
```

### Authentication
- Activity Admin role (สำหรับ actions ทั่วไป)
- Internal API Key (สำหรับ approve_all_pending_system)

### Request Body

```json
{
  "action": "approve",
  "eventId": 10,
  "registrationIds": [100, 101, 102],
  "reason": "เข้าเงื่อนไขทั้งหมด"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| action | string | Yes | `approve`, `reject`, `approve_all`, `reject_all`, `approve_all_pending_system` |
| eventId | number | Yes* | Event ID (ไม่ต้องการสำหรับ approve_all_pending_system) |
| registrationIds | number[] | No** | รายการ registration IDs (สำหรับ approve/reject) |
| reason | string | No | เหตุผล (แนะนำสำหรับ reject) |

\* ไม่ต้องการ eventId สำหรับ `approve_all_pending_system`  
\*\* ต้องการ registrationIds สำหรับ `approve` และ `reject`

### Actions

| Action | Description | Permission |
|--------|-------------|------------|
| approve | อนุมัติ specific registrations | Activity Admin |
| reject | ปฏิเสธ specific registrations | Activity Admin |
| approve_all | อนุมัติทั้งหมดใน event | Activity Admin |
| reject_all | ปฏิเสธทั้งหมดใน event | Activity Admin |
| approve_all_pending_system | อนุมัติทั้งหมดในระบบ (cron job) | Internal API Key |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Processed 3 registrations successfully",
  "data": {
    "processedRegistrations": 3,
    "failedRegistrations": [],
    "details": [
      {
        "registrationId": 100,
        "userId": 15,
        "userName": "สมชาย ใจดี",
        "status": "APPROVED",
        "checkedIn": false
      }
    ]
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required field: action"
}
```

```json
{
  "error": "Missing required field: eventId"
}
```

```json
{
  "error": "Missing required parameters for this action"
}
```

**401 Unauthorized** - สำหรับ approve_all_pending_system
```json
{
  "error": "Unauthorized: This action requires internal authentication"
}
```

**403 Forbidden**
```json
{
  "error": "You don't have permission to process this event's registrations"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Permission Validation**:
   - ตรวจสอบว่า user เป็น Activity Admin
   - ตรวจสอบว่า user มีสิทธิ์จัดการ event นี้ (SUPREME หรือ Major Admin)

2. **Event Capacity Check** (สำหรับ approve):
   - ตรวจสอบ maxParticipants
   - หาก event เต็ม → ปฏิเสธการอนุมัติ

3. **Status Update**:
   - `approve` → APPROVED, checkedIn: false
   - `reject` → REJECTED

4. **Notification**:
   - ส่ง notification ให้ผู้ใช้ตามสถานะ
   - รวม reason ถ้ามี (สำหรับ reject)

5. **Transaction Safety**:
   - ใช้ database transaction
   - Rollback ถ้ามี error

### Example Usage

#### Approve Specific Registrations

```bash
curl -X POST https://api.example.com/api/daily/event/user \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "eventId": 10,
    "registrationIds": [100, 101, 102]
  }'
```

#### Reject with Reason

```bash
curl -X POST https://api.example.com/api/daily/event/user \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reject",
    "eventId": 10,
    "registrationIds": [103],
    "reason": "ไม่ตรงตามเงื่อนไขการเข้าร่วม"
  }'
```

#### Approve All Pending in Event

```bash
curl -X POST https://api.example.com/api/daily/event/user \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_all",
    "eventId": 10,
    "reason": "Auto-approval for this event"
  }'
```

#### System-wide Approval (Cron Job)

```bash
curl -X POST https://api.example.com/api/daily/event/user \
  -H "X-Internal-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_all_pending_system",
    "reason": "Daily auto-approval"
  }'
```

---

## GET /api/daily/event/staff

ดึงข้อมูลสำหรับจัดการ staff registrations (Activity Admin)

### Endpoint
```
GET /api/daily/event/staff?mode={mode}&eventId={eventId}&page={page}&limit={limit}
```

### Authentication
Required - Activity Admin role

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mode | string | No | `list` หรือ `detail` (default: `list`) |
| eventId | number | No* | Event ID (required เมื่อ `mode=detail`) |
| status | string | No | กรองตามสถานะ: DRAFT, PUBLISHED, CANCELLED |
| isOnline | boolean | No | true (online), false (onsite) |
| search | string | No | ค้นหาจากชื่อหรือคำอธิบาย |
| staffStatus | string | No | detail mode: กรองสถานะ staff (default: PENDING) |
| staffSearch | string | No | detail mode: ค้นหา staff ตามชื่อ/อีเมล/รหัสผู้ใช้ |
| page | number | No | หน้าที่ต้องการ (default: 1) |
| limit | number | No | จำนวนต่อหน้า (default: 20) |
| sortBy | string | No | เรียงตาม (default: activityStart) |
| sortOrder | string | No | asc หรือ desc (default: asc) |
| includeSkillRewards | boolean | No | รวม skill rewards (default: false) |
| includeStats | boolean | No | รวม statistics (default: false) |
| old_events | boolean | No | รวม events ที่จบแล้ว (default: true) |

\* ต้องระบุเมื่อ `mode=detail`

### Response

#### Success (200 OK)

**mode=list**

```json
{
  "success": true,
  "mode": "list",
  "data": [
    {
      "id": 10,
      "title_EN": "Workshop",
      "title_TH": "เวิร์คช็อป",
      "description_EN": "Description",
      "description_TH": "คำอธิบาย",
      "location_EN": "Room 101",
      "location_TH": "ห้อง 101",
      "activityStart": "2024-02-01T09:00:00Z",
      "activityEnd": "2024-02-01T17:00:00Z",
      "registrationStart": "2024-01-15T00:00:00Z",
      "registrationEnd": "2024-01-30T23:59:59Z",
      "status": "PUBLISHED",
      "isOnline": false,
      "maxParticipants": 50,
      "currentParticipants": 35,
      "creator": {
        "id": 5,
        "firstName": "สมชาย",
        "lastName": "ใจดี",
        "email": "creator@cmu.ac.th"
      },
      "majorCategory": {
        "id": 1,
        "code": "CPE",
        "name_TH": "วิศวกรรมคอมพิวเตอร์",
        "name_EN": "Computer Engineering",
        "icon": "Cpu"
      },
      "photos": [
        {
          "id": 1,
          "isMain": true,
          "sortOrder": 0,
          "cloudinaryImage": {
            "url": "https://res.cloudinary.com/.../photo.jpg"
          }
        }
      ],
      "checkInTimeSlots": [
        {
          "id": 1,
          "slot_number": 1,
          "startTime": "2024-02-01T09:00:00Z",
          "endTime": "2024-02-01T10:00:00Z"
        }
      ],
      "_count": {
        "registrations": 35,
        "skillRewards": 3,
        "staffAssignments": 8
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

**mode=detail**

```json
{
  "success": true,
  "mode": "detail",
  "data": {
    "event": {
      "id": 10,
      "title_TH": "เวิร์คช็อปวิทยาการคอมพิวเตอร์",
      "title_EN": "Computer Science Workshop",
      "status": "PUBLISHED",
      "maxStaffCount": 20,
      "currentStaffCount": 12
    },
    "staff": [
      {
        "id": 51,
        "event_id": 10,
        "user_id": 650612077,
        "status": "PENDING",
        "user": {
          "id": 650612077,
          "firstName": "Chae",
          "lastName": "Young",
          "email": "chae@example.com"
        },
        "role": {
          "id": 2,
          "name": "Registration"
        }
      }
    ]
  },
  "pagination": {
    "total": 18,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

#### Error Responses

**404 Not Found**
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

1. **Permission**:
   - SUPREME → ดูได้ทั้งหมด
   - Major Admin → ดูเฉพาะ events ของ majors ที่ดูแล

2. **Default Filter**:
   - `old_events=false` → ไม่แสดง events ที่ activityEnd < ปัจจุบัน

3. **Search**:
   - ค้นหาใน title_TH, title_EN, description_TH, description_EN

4. **Detail Mode**:
  - ใช้ `mode=detail&eventId=...` เพื่อดึงรายชื่อ staff ราย event
  - รองรับ `staffStatus` และ `staffSearch`

### Example Usage

```bash
# List events
curl "https://api.example.com/api/daily/event/staff?mode=list&old_events=false&status=PUBLISHED&page=1&limit=20" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"

# Get pending staff for a specific event
curl "https://api.example.com/api/daily/event/staff?mode=detail&eventId=10&staffStatus=PENDING&page=1&limit=20" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

---

## POST /api/daily/event/staff

จัดการ staff registrations (อนุมัติ/ปฏิเสธ)

### Endpoint
```
POST /api/daily/event/staff
```

### Authentication
Required - Activity Admin role

### Request Body

Similar to POST /api/daily/event/user แต่สำหรับ staff

```json
{
  "action": "approve",
  "eventId": 10,
  "staffIds": [50, 51, 52],
  "reason": "Approved for staff duty"
}
```

### Actions

- `approve` - อนุมัติ staff
- `reject` - ปฏิเสธ staff
- `approve_all` - อนุมัติทั้งหมดใน event
- `reject_all` - ปฏิเสธทั้งหมดใน event

### Response

```json
{
  "success": true,
  "message": "Processed 3 staff successfully",
  "data": {
    "processedStaff": 3,
    "failedStaff": []
  }
}
```

---

## GET /api/daily/event/staff/manage

ดึงรายการ staff roles (Activity Admin)

### Endpoint
```
GET /api/daily/event/staff/manage
```

### Authentication
Required - Activity Admin role

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Coordinator",
      "description_TH": "ผู้ประสานงาน",
      "description_EN": "Event Coordinator",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Registration",
      "description_TH": "เจ้าหน้าที่ลงทะเบียน",
      "description_EN": "Registration Staff",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### Business Logic

- ดึงรายการ staff roles ทั้งหมด
- เรียงตามชื่อ (A-Z)

### Example Usage

```bash
curl https://api.example.com/api/daily/event/staff/manage \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

---

## POST /api/daily/event/staff/manage

จัดการ staff (cancel หรือ update role)

### Endpoint
```
POST /api/daily/event/staff/manage
```

### Authentication
Required - Activity Admin role

### Request Body

#### Cancel Staff

```json
{
  "action": "cancel_staff",
  "eventId": 10,
  "staffIds": [50, 51],
  "reason": "ไม่สามารถมาปฏิบัติหน้าที่ได้"
}
```

#### Update Staff Role

```json
{
  "action": "update_staff_role",
  "eventId": 10,
  "staffId": 50,
  "newRoleId": 3
}
```

### Response

#### Success - Cancel Staff (200 OK)

```json
{
  "success": true,
  "message": "Cancelled 2 staff members",
  "data": {
    "cancelledCount": 2,
    "failedStaff": [],
    "details": [
      {
        "staffId": 50,
        "userId": 15,
        "userName": "สมชาย ใจดี",
        "reason": "ไม่สามารถมาปฏิบัติหน้าที่ได้"
      }
    ]
  }
}
```

#### Success - Update Role (200 OK)

```json
{
  "success": true,
  "message": "Staff role updated successfully",
  "data": {
    "staffId": 50,
    "userId": 15,
    "previousRoleId": 2,
    "previousRoleName": "Registration",
    "newRoleId": 3,
    "newRoleName_TH": "ผู้ประสานงาน",
    "newRoleName_EN": "Coordinator",
    "eventId": 10,
    "eventTitle": "Workshop"
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required field: action"
}
```

```json
{
  "error": "Invalid action. Use 'cancel_staff' or 'update_staff_role'"
}
```

**403 Forbidden**
```json
{
  "error": "You don't have permission to manage staff for this event"
}
```

**404 Not Found**
```json
{
  "error": "Event not found"
}
```

```json
{
  "error": "Staff not found"
}
```

### Business Logic

1. **Permission Check**:
   - SUPREME → จัดการได้ทั้งหมด
   - Event Creator → จัดการ staff ใน event ของตนเอง
   - Major Admin → จัดการ staff ใน events ของ major ที่ดูแล

2. **Cancel Staff**:
   - ตั้งค่า status เป็น CANCELLED
   - บันทึก reason
   - ส่ง notification ให้ staff

3. **Update Role**:
   - เปลี่ยน role_id
   - บันทึก history
   - อัปเดต responsibilities ถ้ามี

### Example Usage

#### Cancel Staff

```bash
curl -X POST https://api.example.com/api/daily/event/staff/manage \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cancel_staff",
    "eventId": 10,
    "staffIds": [50, 51],
    "reason": "Unable to attend"
  }'
```

#### Update Staff Role

```bash
curl -X POST https://api.example.com/api/daily/event/staff/manage \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_staff_role",
    "eventId": 10,
    "staffId": 50,
    "newRoleId": 3
  }'
```

---

## GET /api/daily/event/staff/manage/list

ดึงรายชื่อ staff ที่ลงทะเบียนในอีเวนต์

### Endpoint
```
GET /api/daily/event/staff/manage/list?eventId={eventId}
```

### Authentication
Required - Activity Admin role

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | number | Yes | Event ID |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "eventId": 10,
    "eventTitle": "Computer Science Workshop",
    "totalStaff": 5,
    "staff": [
      {
        "id": 50,
        "userId": 15,
        "firstName": "สมชาย",
        "lastName": "ใจดี",
        "email": "somchai@cmu.ac.th",
        "faculty": "Engineering",
        "major": "Computer Engineering",
        "phone": "0812345678",
        "photo": "https://example.com/photo.jpg",
        "roleId": 2,
        "roleName": "Registration",
        "roleDescription_TH": "เจ้าหน้าที่ลงทะเบียน",
        "roleDescription_EN": "Registration Staff",
        "responsibilities_TH": "จัดการระบบลงทะเบียน",
        "responsibilities_EN": "Manage registration system",
        "status": "REGISTERED",
        "assignedAt": "2024-01-15T10:00:00Z",
        "assignedBy": "5",
        "checkedIn": false,
        "checkInTime": null,
        "checkedOut": false,
        "checkOutTime": null
      }
    ]
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required parameter: eventId"
}
```

**403 Forbidden**
```json
{
  "error": "You don't have permission to view this event's staff"
}
```

**404 Not Found**
```json
{
  "error": "Event not found"
}
```

### Business Logic

1. **Permission**:
   - SUPREME → ดูได้ทั้งหมด
   - Event Creator → ดูได้
   - Major Admin (ของ major ที่ event อยู่) → ดูได้

2. **Filter**:
   - ดึงเฉพาะ staff ที่ status = REGISTERED
   - เรียงตาม assignedAt (ลงทะเบียนก่อนขึ้นก่อน)

### Example Usage

```bash
curl "https://api.example.com/api/daily/event/staff/manage/list?eventId=10" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

#### JavaScript Example

```javascript
async function getEventStaff(eventId) {
  const response = await fetch(
    `/api/daily/event/staff/manage/list?eventId=${eventId}`,
    { credentials: 'include' }
  );
  
  const { data } = await response.json();
  
  console.log(`Event: ${data.eventTitle}`);
  console.log(`Total Staff: ${data.totalStaff}`);
  
  data.staff.forEach(staff => {
    console.log(`- ${staff.firstName} ${staff.lastName} (${staff.roleName})`);
    console.log(`  Status: ${staff.status}`);
    console.log(`  Checked In: ${staff.checkedIn ? 'Yes' : 'No'}`);
  });
}
```

---

## Workflow Examples

### Daily Registration Approval Workflow

```javascript
// 1. Get pending registrations summary
const summaryResponse = await fetch(
  '/api/daily/event/user?type=event_summary',
  { credentials: 'include' }
);
const { data: { eventWithPendingCount } } = await summaryResponse.json();

// 2. For each event with pending registrations
for (const event of eventWithPendingCount) {
  if (event._count.registrations === 0) continue;
  
  console.log(`Event: ${event.title_EN}`);
  console.log(`Pending: ${event._count.registrations}`);
  
  // 3. Get detailed pending registrations
  const detailResponse = await fetch(
    `/api/daily/event/user?eventId=${event.id}&type=registration`,
    { credentials: 'include' }
  );
  const { data: { pendingRegistrations } } = await detailResponse.json();
  
  // 4. Review and approve/reject
  const toApprove = [];
  const toReject = [];
  
  pendingRegistrations.forEach(reg => {
    if (shouldApprove(reg)) {
      toApprove.push(reg.id);
    } else {
      toReject.push(reg.id);
    }
  });
  
  // 5. Process approvals
  if (toApprove.length > 0) {
    await fetch('/api/daily/event/user', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve',
        eventId: event.id,
        registrationIds: toApprove
      })
    });
  }
  
  // 6. Process rejections
  if (toReject.length > 0) {
    await fetch('/api/daily/event/user', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reject',
        eventId: event.id,
        registrationIds: toReject,
        reason: 'Does not meet requirements'
      })
    });
  }
}
```

### Staff Management Workflow

```javascript
// 1. Get event details
const eventId = 10;

// 2. Get registered staff
const response = await fetch(
  `/api/daily/event/staff/manage/list?eventId=${eventId}`,
  { credentials: 'include' }
);
const { data } = await response.json();

console.log(`Managing staff for: ${data.eventTitle}`);
console.log(`Total staff: ${data.totalStaff}`);

// 3. Update staff role
const staffToUpdate = data.staff.find(s => s.userId === 15);
if (staffToUpdate) {
  await fetch('/api/daily/event/staff/manage', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_staff_role',
      eventId,
      staffId: staffToUpdate.id,
      newRoleId: 3 // Change to Coordinator
    })
  });
}

// 4. Cancel staff who can't attend
const staffToCancel = data.staff
  .filter(s => !s.checkedIn && shouldCancel(s))
  .map(s => s.id);

if (staffToCancel.length > 0) {
  await fetch('/api/daily/event/staff/manage', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'cancel_staff',
      eventId,
      staffIds: staffToCancel,
      reason: 'Unable to attend as scheduled'
    })
  });
}
```

---

## Best Practices

### Registration Approval

1. **Review Regularly**:
   - Check pending registrations daily
   - Prioritize events happening soon

2. **Clear Communication**:
   - Always provide reason when rejecting
   - Send timely notifications

3. **Capacity Management**:
   - Monitor maxParticipants
   - Approve on first-come-first-served basis

### Staff Management

1. **Role Assignment**:
   - Assign appropriate roles based on experience
   - Update roles as needed

2. **Pre-event Verification**:
   - Verify staff assignments before event
   - Cancel no-shows early

3. **Documentation**:
   - Record responsibilities clearly
   - Keep assignment history

### Automation

1. **Scheduled Approvals**:
   - Use cron jobs for auto-approval
   - Set rules for auto-approval criteria

2. **Notifications**:
   - Auto-notify on status changes
   - Send reminders before events

3. **Reporting**:
   - Generate daily reports
   - Track approval/rejection rates
