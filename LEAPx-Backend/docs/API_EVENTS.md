# Events Management API

API สำหรับการจัดการกิจกรรม (Events) รวมถึงการสร้าง แก้ไข ลบ และดูข้อมูลกิจกรรม

## Table of Contents

### Event Management
- [GET /api/events](#get-apievents) - ดึงรายการกิจกรรมทั้งหมด (Admin)
- [POST /api/events](#post-apievents) - สร้างกิจกรรมใหม่
- [PUT /api/events](#put-apievents) - อัปเดตข้อมูลกิจกรรม
- [DELETE /api/events](#delete-apievents) - ลบกิจกรรม

### Public Events
- [GET /api/events/public](#get-apieventspublic) - ดึงรายการกิจกรรมสาธารณะ
- [GET /api/events/slug/[slug]](#get-apieventsslugslug) - ดึงข้อมูลกิจกรรมด้วย slug

### Skill Rewards Management
- [GET /api/events/[eventId]/skill-rewards](#get-apieventseventidskill-rewards) - ดึงรายการ Skill Rewards
- [POST /api/events/[eventId]/skill-rewards](#post-apieventseventidskill-rewards) - เพิ่ม Skill Reward
- [PUT /api/events/[eventId]/skill-rewards](#put-apieventseventidskill-rewards) - แก้ไข Skill Reward
- [DELETE /api/events/[eventId]/skill-rewards](#delete-apieventseventidskill-rewards) - ลบ Skill Reward

### Check-In Time Slots Management
- [GET /api/events/[eventId]/time-slots](#get-apieventseventidtime-slots) - ดึงรายการ Time Slots
- [POST /api/events/[eventId]/time-slots](#post-apieventseventidtime-slots) - สร้าง Time Slot
- [PATCH /api/events/[eventId]/time-slots](#patch-apieventseventidtime-slots) - แก้ไข Time Slot
- [DELETE /api/events/[eventId]/time-slots](#delete-apieventseventidtime-slots) - ลบ Time Slot

### Time Slot Skill Rewards Management
- [GET /api/events/[eventId]/time-slots/[slotId]/skill-rewards](#get-apieventseventidtime-slotsslotidskill-rewards) - ดึงรายการ Skill Rewards ของ Time Slot
- [POST /api/events/[eventId]/time-slots/[slotId]/skill-rewards](#post-apieventseventidtime-slotsslotidskill-rewards) - เพิ่ม Skill Reward ให้ Time Slot
- [PATCH /api/events/[eventId]/time-slots/[slotId]/skill-rewards](#patch-apieventseventidtime-slotsslotidskill-rewards) - แก้ไข Skill Reward
- [DELETE /api/events/[eventId]/time-slots/[slotId]/skill-rewards](#delete-apieventseventidtime-slotsslotidskill-rewards) - ลบ Skill Reward

### Registration & Statistics
- [GET /api/events/[eventId]/registrations/summary](#get-apieventseventidregistrationssummary) - ดึงสถิติการลงทะเบียน
- [GET /api/events/[eventId]/xlsx](#get-apieventseventidxlsx) - Export รายชื่อผู้เข้าร่วม (Excel)

### Admin Tools
- [POST /api/events/log](#post-apieventslog) - สร้างการลงทะเบียนแบบ manual (Admin only)
- [GET /api/events/log](#get-apieventslog) - ดึงรายการลงทะเบียน (Admin only)

---

## GET /api/events

ดึงรายการกิจกรรมทั้งหมด (สำหรับ Admin/Major Admin)

### Endpoint
```
GET /api/events
```

### Authentication
Required - SUPREME admin หรือ Major Admin

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | - | กรองตามสถานะ (DRAFT, PUBLISHED, CANCELLED, COMPLETED) |
| isOnline | boolean | No | - | กรองกิจกรรม Online/Offline |
| search | string | No | - | ค้นหาใน title, description |
| page | number | No | 1 | หน้าที่ต้องการ |
| limit | number | No | 20 | จำนวนรายการต่อหน้า |
| sortBy | string | No | activityStart | เรียงลำดับตาม field |
| sortOrder | string | No | asc | asc หรือ desc |
| includeSkillRewards | boolean | No | false | รวม skill rewards |
| includeStats | boolean | No | false | รวมสถิติ |
| old_events | boolean | No | false | แสดงกิจกรรมที่ผ่านมาแล้ว |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "workshop-ai-2024",
      "title_TH": "Workshop AI สำหรับมือใหม่",
      "title_EN": "AI Workshop for Beginners",
      "description_TH": "เรียนรู้พื้นฐาน AI",
      "description_EN": "Learn AI fundamentals",
      "status": "PUBLISHED",
      "majorCategory": {
        "id": 1,
        "code": "CPE",
        "name_TH": "วิศวกรรมคอมพิวเตอร์",
        "name_EN": "Computer Engineering"
      },
      "maxParticipants": 50,
      "currentParticipants": 35,
      "maxStaffCount": 5,
      "currentStaffCount": 3,
      "waitlistEnabled": true,
      "registrationStart": "2024-03-01T00:00:00Z",
      "registrationEnd": "2024-03-10T23:59:59Z",
      "activityStart": "2024-03-15T09:00:00Z",
      "activityEnd": "2024-03-15T16:00:00Z",
      "location_TH": "ห้อง 101 อาคารวิศวกรรม",
      "location_EN": "Room 101 Engineering Building",
      "isOnline": false,
      "priority": 1,
      "photos": [
        {
          "id": 1,
          "cloudinaryImage": {
            "url": "https://res.cloudinary.com/..."
          }
        }
      ],
      "creator": {
        "id": 123,
        "firstName": "สมชาย",
        "lastName": "ใจดี",
        "email": "admin@cmu.ac.th"
      },
      "skillRewards": [
        {
          "id": 1,
          "baseExperience": 100,
          "bonusExperience": 20,
          "levelType": "I",
          "subSkillCategory": {
            "id": 5,
            "name_TH": "การเขียนโปรแกรม",
            "name_EN": "Programming",
            "mainSkillCategory": {
              "id": 1,
              "name_TH": "ทักษะทางเทคนิค",
              "name_EN": "Technical Skills"
            }
          }
        }
      ],
      "checkInTimeSlots": [],
      "_count": {
        "registrations": 35,
        "skillRewards": 2
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  },
  "userPermissions": {
    "isSupreme": true,
    "adminMajorIds": [1, 2, 3]
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "No token provided"
}
```

**403 Forbidden**
```json
{
  "error": "Access denied. Admin privileges required."
}
```

**404 Not Found**
```json
{
  "error": "User not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to fetch events"
}
```

### Business Logic

1. **Permission Check**:
   - SUPREME admin: เห็นทุกกิจกรรม
   - Major Admin: เห็นเฉพาะกิจกรรมในสาขาที่ดูแล

2. **Filtering**:
   - ถ้าไม่ได้ set `old_events=true` จะแสดงเฉพาะกิจกรรมที่ยังไม่จบ (activityEnd >= now)
   - ค้นหาใน title_TH, title_EN, description_TH, description_EN

3. **Include Options**:
   - `includeSkillRewards=true`: รวมข้อมูล skill rewards
   - `includeStats=true`: รวมจำนวน registrations และ skill rewards

### Example Usage

#### cURL

```bash
curl -X GET 'https://api.example.com/api/events?status=PUBLISHED&page=1&limit=10&includeSkillRewards=true' \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..."
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/events?status=PUBLISHED&includeSkillRewards=true', {
  method: 'GET',
  credentials: 'include'
});

const data = await response.json();
if (data.success) {
  console.log('Events:', data.data);
  console.log('Pagination:', data.pagination);
}
```

### Use Cases

- Dashboard admin แสดงรายการกิจกรรมทั้งหมด
- กรองกิจกรรมตามสถานะ เช่น PUBLISHED, DRAFT
- ค้นหากิจกรรมด้วย keyword
- ดูสถิติการลงทะเบียนของแต่ละกิจกรรม

---

## POST /api/events

สร้างกิจกรรมใหม่

### Endpoint
```
POST /api/events
```

### Authentication
Required - SUPREME admin หรือ Major Admin

### Request Body (FormData)

```javascript
const formData = new FormData();
formData.append('title_TH', 'Workshop AI สำหรับมือใหม่');
formData.append('title_EN', 'AI Workshop for Beginners');
formData.append('description_TH', 'เรียนรู้พื้นฐาน AI');
formData.append('description_EN', 'Learn AI fundamentals');
formData.append('location_TH', 'ห้อง 101 อาคารวิศวกรรม');
formData.append('location_EN', 'Room 101 Engineering Building');
formData.append('registrationStart', '2024-03-01T00:00:00Z');
formData.append('registrationEnd', '2024-03-10T23:59:59Z');
formData.append('activityStart', '2024-03-15T09:00:00Z');
formData.append('activityEnd', '2024-03-15T16:00:00Z');
formData.append('majorCategory_id', '1');
formData.append('maxParticipants', '50');
formData.append('maxStaffCount', '5');
formData.append('staffAllowedYears', JSON.stringify([1, 2, 3, 4]));
formData.append('allowedYearLevels', JSON.stringify([1, 2, 3, 4]));
formData.append('isOnline', 'false');
formData.append('waitlistEnabled', 'true');
formData.append('walkinEnabled', 'false');
formData.append('status', 'DRAFT');
formData.append('skillRewards', JSON.stringify([
  {
    subSkillCategory_id: 5,
    baseExperience: 100,
    bonusExperience: 20,
    levelType: "I"
  }
]));
formData.append('checkInTimeSlots', JSON.stringify([
  {
    slot_number: 1,
    startTime: "2024-03-15T09:00:00Z",
    endTime: "2024-03-15T12:00:00Z",
    subSkillCategory_id: 5,
    earlyCheckInMinutes: 15  // อนุญาตเช็คอินก่อนเวลาเริ่ม 15 นาที
  }
]));
// Images (up to 4)
formData.append('image_0', fileObject); // File object
formData.append('mainImageIndex', '0');
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title_TH | string | Yes | ชื่อกิจกรรมภาษาไทย |
| title_EN | string | Yes | ชื่อกิจกรรมภาษาอังกฤษ |
| description_TH | string | Yes | รายละเอียดภาษาไทย |
| description_EN | string | Yes | รายละเอียดภาษาอังกฤษ |
| location_TH | string | Yes | สถานที่ภาษาไทย |
| location_EN | string | No | สถานที่ภาษาอังกฤษ |
| registrationStart | datetime | Yes | เวลาเริ่มลงทะเบียน |
| registrationEnd | datetime | Yes | เวลาสิ้นสุดลงทะเบียน |
| activityStart | datetime | Yes | เวลาเริ่มกิจกรรม |
| activityEnd | datetime | Yes | เวลาสิ้นสุดกิจกรรม |
| majorCategory_id | number | Yes | รหัสสาขา/หมวดหมู่ |
| maxParticipants | number | No | จำนวนผู้เข้าร่วมสูงสุด (default: 0) |
| maxStaffCount | number | No | จำนวน staff สูงสุด (default: 0) |
| staffAllowedYears | number[] | Yes | ชั้นปีที่สามารถเป็น staff ได้ |
| allowedYearLevels | number[] | Yes | ชั้นปีที่สามารถเข้าร่วมได้ |
| slug | string | No | URL slug (auto-generate จาก title_EN) |
| isOnline | boolean | No | กิจกรรม Online หรือไม่ (default: false) |
| meetingLink | string | No | ลิงก์ประชุมออนไลน์ |
| waitlistEnabled | boolean | No | เปิด waitlist หรือไม่ (default: false) |
| walkinEnabled | boolean | No | รับ walk-in หรือไม่ (default: false) |
| walkinCapacity | number | No | จำนวน walk-in (ถ้า walkinEnabled=true) |
| lateCheckInPenalty | number | No | คะแนนหัก สำหรับมาสาย (default: 0) |
| staffCheckInTime | number | No | เวลาเช็คอิน staff (นาที) (default: 0) |
| staffCommunicationLink | string | No | ลิงก์สื่อสารสำหรับ staff |
| status | string | No | สถานะ (DRAFT/PUBLISHED) (default: DRAFT) |
| priority | number | No | ลำดับความสำคัญ (default: 1) |
| locationMapUrl | string | No | URL แผนที่ |
| isForCMUEngineering | boolean | No | เฉพาะคณะวิศวะหรือไม่ (default: false) |
| isForCMUEngineering_Staff | boolean | No | staff เฉพาะคณะวิศวะหรือไม่ (default: false) |
| skillRewards | JSON array | No | รายการ skill rewards |
| checkInTimeSlots | JSON array | No | รายการช่วงเวลาเช็คอิน ดู [checkInTimeSlots Schema](#checkintimeslots-schema) |
| image_0 to image_3 | File | No | รูปภาพ (สูงสุด 4 รูป) |
| mainImageIndex | number | No | index ของรูปหลัก (default: 0) |

### Response

#### Success (201 Created)

```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": 1,
    "slug": "ai-workshop-for-beginners",
    "title_TH": "Workshop AI สำหรับมือใหม่",
    "title_EN": "AI Workshop for Beginners",
    "status": "DRAFT",
    "creator": {
      "id": 123,
      "firstName": "สมชาย",
      "lastName": "ใจดี"
    },
    "photos": [
      {
        "id": 1,
        "cloudinaryImage": {
          "id": 1,
          "url": "https://res.cloudinary.com/...",
          "publicId": "events/ai-workshop-...",
          "width": 1920,
          "height": 1080
        }
      }
    ],
    "skillRewards": [
      {
        "id": 1,
        "baseExperience": 100,
        "bonusExperience": 20,
        "levelType": "I"
      }
    ],
    "checkInTimeSlots": [
      {
        "id": 1,
        "slot_number": 1,
        "startTime": "2024-03-15T09:00:00Z",
        "endTime": "2024-03-15T12:00:00Z"
      }
    ]
  },
  "imagesUploaded": 1
}
```

#### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบหรือไม่ถูกต้อง
```json
{
  "error": "Missing required fields"
}
```

```json
{
  "error": "Registration end must be after registration start"
}
```

```json
{
  "error": "Activity end must be after activity start"
}
```

```json
{
  "error": "Maximum 4 images allowed per event"
}
```

**403 Forbidden**
```json
{
  "error": "Unauthorized: You must be a SUPREME admin or Major Admin of this category to create events"
}
```

**404 Not Found**
```json
{
  "error": "User not found"
}
```

**409 Conflict** - Slug ซ้ำ
```json
{
  "error": "Slug already exists. Please provide a unique slug."
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
   - SUPREME admin: สร้างกิจกรรมได้ทุกสาขา
   - Major Admin: สร้างได้เฉพาะสาขาที่ตนดูแล

2. **Slug Generation**:
   - ถ้าไม่ระบุ slug จะ auto-generate จาก title_EN
   - แปลง title_EN เป็น lowercase และ replace spaces ด้วย hyphens

3. **Date Validation**:
   - registrationEnd >= registrationStart
   - activityEnd >= activityStart
   - activityStart >= registrationEnd (แนะนำ)

4. **Image Upload**:
   - รองรับสูงสุด 4 รูป
   - Upload ไป Cloudinary
   - สามารถกำหนดรูปหลักได้ด้วย mainImageIndex

5. **Transaction**:
   - สร้าง Event, Photos, SkillRewards, CheckInTimeSlots ใน transaction เดียวกัน
   - ถ้ามี error จะ rollback ทั้งหมด

### Example Usage

#### JavaScript (Fetch)

```javascript
const formData = new FormData();
formData.append('title_TH', 'Workshop AI สำหรับมือใหม่');
formData.append('title_EN', 'AI Workshop for Beginners');
formData.append('description_TH', 'เรียนรู้พื้นฐาน AI และการประยุกต์ใช้');
formData.append('description_EN', 'Learn AI fundamentals and applications');
formData.append('location_TH', 'ห้อง 101 อาคารวิศวกรรม');
formData.append('registrationStart', '2024-03-01T00:00:00Z');
formData.append('registrationEnd', '2024-03-10T23:59:59Z');
formData.append('activityStart', '2024-03-15T09:00:00Z');
formData.append('activityEnd', '2024-03-15T16:00:00Z');
formData.append('majorCategory_id', '1');
formData.append('maxParticipants', '50');
formData.append('staffAllowedYears', JSON.stringify([1, 2, 3, 4]));
formData.append('allowedYearLevels', JSON.stringify([1, 2, 3, 4]));
formData.append('isOnline', 'false');
formData.append('status', 'DRAFT');

// Add images
const fileInput = document.querySelector('input[type="file"]');
if (fileInput.files[0]) {
  formData.append('image_0', fileInput.files[0]);
}

const response = await fetch('/api/events', {
  method: 'POST',
  credentials: 'include',
  body: formData
});

const data = await response.json();
if (data.success) {
  console.log('Event created:', data.data);
}
```

---

## checkInTimeSlots Schema

`checkInTimeSlots` ใช้สำหรับกำหนดช่วงเวลาเช็คอินแต่ละ slot ของ event

### Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| slot_number | number | Yes | ลำดับ slot (เรียงจาก 1) |
| startTime | ISO8601 string | Yes | เวลาเริ่มต้นของ slot |
| endTime | ISO8601 string | Yes | เวลาสิ้นสุดของ slot |
| earlyCheckInMinutes | number \| null | No | จำนวนนาทีที่อนุญาตให้เช็คอินก่อนเวลาเริ่ม (ดูตารางด้านล่าง) |
| subSkillCategory_id | number | No | **(Legacy)** ID ของ subSkill ที่กำหนดให้ slot นี้ |

#### earlyCheckInMinutes — ค่าที่ใช้ได้

| ค่า | ความหมาย |
|-----|----------|
| `null` หรือไม่ระบุ | ใช้ค่า `checkInWindowBefore` ของ Event (default: 60 นาที) |
| `0` | ไม่อนุญาตให้เช็คอินก่อนเวลาเริ่ม slot |
| `N > 0` | อนุญาตให้เช็คอินได้ก่อนเวลาเริ่ม N นาที |

> **หมายเหตุ:** `isLate` ยังคงคำนวณจาก `startTime` จริงของ slot เสมอ  
> ถ้า `startTime = 10:00` และ `earlyCheckInMinutes = 15` → เปิดเช็คอินตั้งแต่ `09:45` โดยไม่ถือว่าสาย  
> ถือว่า "สาย" เมื่อเช็คอินหลัง `startTime + lateCheckInPenalty` เท่านั้น

---

### ตัวอย่าง: Event ที่มีช่วงเวลาเช็คอินรอบเดียว (Single Slot)

```javascript
formData.append('checkInTimeSlots', JSON.stringify([
  {
    slot_number: 1,
    startTime: "2026-03-15T09:00:00Z",
    endTime:   "2026-03-15T12:00:00Z",
    earlyCheckInMinutes: 10  // เปิดเช็คอินตั้งแต่ 08:50
  }
]));

// skill reward สำหรับ event นี้ (ได้เมื่อ checkout ครบทุก slot)
formData.append('skillRewards', JSON.stringify([
  {
    subSkillCategory_id: 10,
    baseExperience: 120,
    bonusExperience: 0,
    levelType: "I"
  }
]));
```

---

### ตัวอย่าง: Event ที่มีช่วงเวลาเช็คอินหลายรอบ (Multiple Slots)

```javascript
// Event หนึ่งวัน แบ่งเป็น 3 ช่วง — แต่ละช่วงมีหน้าต่างเช็คอินก่อนเวลาต่างกัน
// ทำครบทุก slot จะได้ skill rewards สามด้าน

formData.append('checkInTimeSlots', JSON.stringify([
  {
    slot_number: 1,
    startTime: "2026-03-15T09:00:00Z",
    endTime:   "2026-03-15T12:00:00Z",
    earlyCheckInMinutes: 15     // เปิดเช็คอินตั้งแต่ 08:45 (ช่วงเช้า)
  },
  {
    slot_number: 2,
    startTime: "2026-03-15T13:00:00Z",
    endTime:   "2026-03-15T15:30:00Z",
    earlyCheckInMinutes: 10     // เปิดเช็คอินตั้งแต่ 12:50 (ช่วงบ่าย)
  },
  {
    slot_number: 3,
    startTime: "2026-03-15T16:00:00Z",
    endTime:   "2026-03-15T18:00:00Z",
    earlyCheckInMinutes: 0      // เปิดเช็คอินตั้งแต่ 16:00 เป๊ะ (ช่วงเย็น)
  }
]));

// skillRewards — กำหนด Skill ที่ได้รับเมื่อผ่านครบทุก slot
// หลักการ: แต่ละ slot สอดคล้องกับ skill reward ที่ระบุ
formData.append('skillRewards', JSON.stringify([
  {
    subSkillCategory_id: 10,   // ด้าน Leadership
    baseExperience: 100,
    bonusExperience: 20,
    levelType: "II"
  },
  {
    subSkillCategory_id: 11,   // ด้าน Teamwork
    baseExperience: 80,
    bonusExperience: 10,
    levelType: "I"
  },
  {
    subSkillCategory_id: 12,   // ด้าน Communication
    baseExperience: 60,
    bonusExperience: 0,
    levelType: "I"
  }
]));
```

#### หลักการออกแบบ

| องค์ประกอบ | ความหมาย |
|------------|----------|
| `checkInTimeSlots` | กำหนด "มีกี่รอบ, รอบละเริ่ม-จบเมื่อไหร่, เปิดก่อนเวลากี่นาที" |
| `skillRewards` | กำหนด "เมื่อครบทุก slot ได้ skill/level/EXP อะไรบ้าง" |
| `earlyCheckInMinutes` บน slot | override ค่า `checkInWindowBefore` ของ event เฉพาะ slot นั้น |
| `null` บน `earlyCheckInMinutes` | fallback ไปใช้ `checkInWindowBefore` ของ event |

> ผู้ใช้ต้องเช็คอินครบ **ทุก slot** จึงจะได้รับ EXP  
> (checkout slot สุดท้าย → คำนวณและมอบ EXP ทั้งหมดให้อัตโนมัติ)

---

## PUT /api/events

อัปเดตข้อมูลกิจกรรม

### Endpoint
```
PUT /api/events
```

### Authentication
Required - SUPREME admin หรือ Major Admin ที่ดูแลสาขานั้น

### Request Body (FormData)

```javascript
const formData = new FormData();
formData.append('event_id', '1');
formData.append('title_TH', 'Workshop AI (Updated)');
formData.append('status', 'PUBLISHED');
// ... other fields to update
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| event_id | number | Yes | รหัสกิจกรรมที่ต้องการแก้ไข |
| title_TH | string | No | ชื่อกิจกรรมภาษาไทย |
| title_EN | string | No | ชื่อกิจกรรมภาษาอังกฤษ |
| description_TH | string | No | รายละเอียดภาษาไทย |
| description_EN | string | No | รายละเอียดภาษาอังกฤษ |
| slug | string | No | URL slug ใหม่ |
| status | string | No | สถานะกิจกรรม |
| maxParticipants | number | No | จำนวนผู้เข้าร่วมสูงสุด |
| checkInTimeSlots | JSON array | No | อัปเดตช่วงเวลาเช็คอิน (จะแทนที่ข้อมูลเก่าทั้งหมด) ดู [checkInTimeSlots Schema](#checkintimeslots-schema) |
| skillRewards | JSON array | No | อัปเดต skill rewards (จะแทนที่ข้อมูลเก่าทั้งหมด) |
| deletePhotoIds | JSON array | No | รายการ photo IDs ที่ต้องการลบ |
| image_0 to image_3 | File | No | รูปภาพใหม่ (เพิ่ม) |
| mainImageIndex | number | No | index ของรูปหลักใหม่ |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": {
    "id": 1,
    "title_TH": "Workshop AI (Updated)",
    "status": "PUBLISHED"
  },
  "photosDeleted": 1,
  "photosAdded": 2
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required field: event_id"
}
```

```json
{
  "error": "Cannot add 3 photos. Maximum 4 photos allowed (current: 2)"
}
```

**403 Forbidden**
```json
{
  "error": "You don't have permission to update this event. Only SUPREME or Major Admin can update events."
}
```

**404 Not Found**
```json
{
  "error": "Event not found"
}
```

**409 Conflict**
```json
{
  "error": "Slug already exists"
}
```

### Business Logic

1. **Permission Check**:
   - SUPREME admin: แก้ไขได้ทุกกิจกรรม
   - Major Admin: แก้ไขได้เฉพาะกิจกรรมในสาขาที่ดูแล
   - Creator: แก้ไขได้เฉพาะกิจกรรมที่ตนสร้าง (ถ้าไม่มี majorCategory)

2. **Atomic Update**:
   - ใช้ transaction lock event row
   - ตรวจสอบสิทธิ์และ validate ข้อมูล
   - อัปเดต event, photos, time slots, skill rewards
   - Rollback ถ้ามี error

3. **Photo Management**:
   - สามารถลบรูปเก่าได้ด้วย deletePhotoIds
   - เพิ่มรูปใหม่ได้ แต่รวมกันต้องไม่เกิน 4 รูป
   - ถ้ากำหนดรูปหลักใหม่ จะ clear รูปหลักเก่า

4. **Time Slots & Skill Rewards**:
   - การอัปเดตจะ **แทนที่** ข้อมูลเก่าทั้งหมด (delete all + create new)
   - ถ้าไม่ต้องการเปลี่ยน ก็ไม่ต้องส่ง field นั้น

### Example Usage

#### JavaScript (Fetch)

```javascript
const formData = new FormData();
formData.append('event_id', '1');
formData.append('status', 'PUBLISHED');
formData.append('deletePhotoIds', JSON.stringify([5, 6]));

const response = await fetch('/api/events', {
  method: 'PUT',
  credentials: 'include',
  body: formData
});

const data = await response.json();
if (data.success) {
  console.log('Event updated');
}
```

---

## DELETE /api/events

ลบกิจกรรม

### Endpoint
```
DELETE /api/events?id={eventId}
```

### Authentication
Required - SUPREME admin หรือ Major Admin

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | รหัสกิจกรรมที่ต้องการลบ |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Event deleted successfully",
  "data": {
    "id": 1,
    "title_EN": "AI Workshop for Beginners",
    "title_TH": "Workshop AI สำหรับมือใหม่",
    "photosDeleted": 3
  }
}
```

#### Error Responses

**400 Bad Request** - มีการลงทะเบียนแล้ว
```json
{
  "error": "Cannot delete event with registrations",
  "details": {
    "registrationCount": 25,
    "message": "Please cancel or complete all registrations first, or change event status to CANCELLED"
  }
}
```

**403 Forbidden**
```json
{
  "error": "You don't have permission to delete this event. Only SUPREME or Major Admin can delete events."
}
```

**404 Not Found**
```json
{
  "error": "Event not found"
}
```

### Business Logic

1. **Permission Check**: เช่นเดียวกับ PUT

2. **Registration Check**:
   - ถ้ามีการลงทะเบียนแล้ว จะลบไม่ได้
   - แนะนำให้ cancel registration ทั้งหมดก่อน หรือเปลี่ยนสถานะเป็น CANCELLED

3. **Cascade Delete**:
   - ลบ EventPhoto, CheckInTimeSlot, EventSkillReward อัตโนมัติ
   - ลบ CloudinaryImage records
   - (Optional) ลบรูปจาก Cloudinary service

### Example Usage

#### cURL

```bash
curl -X DELETE 'https://api.example.com/api/events?id=1' \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..."
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/events?id=1', {
  method: 'DELETE',
  credentials: 'include'
});

const data = await response.json();
if (data.success) {
  console.log('Event deleted');
}
```

---

## GET /api/events/public

ดึงรายการกิจกรรมสาธารณะ (สำหรับผู้ใช้ทั่วไป)

### Endpoint
```
GET /api/events/public
```

### Authentication
ไม่ต้องการ (Public endpoint)

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| search | string | No | - | ค้นหาใน title, description, category |
| isOnline | boolean | No | - | กรอง Online/Offline |
| page | number | No | 1 | หน้าที่ต้องการ |
| limit | number | No | 12 | จำนวนรายการต่อหน้า |
| sortBy | string | No | activityStart | เรียงลำดับตาม field |
| sortOrder | string | No | asc | asc หรือ desc |
| mainSkillId | number | No | - | กรองตาม main skill category |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "workshop-ai-2024",
      "title_TH": "Workshop AI สำหรับมือใหม่",
      "title_EN": "AI Workshop for Beginners",
      "description_TH": "เรียนรู้พื้นฐาน AI",
      "description_EN": "Learn AI fundamentals",
      "majorCategory": {
        "id": 1,
        "name_TH": "วิศวกรรมคอมพิวเตอร์",
        "name_EN": "Computer Engineering",
        "code": "CPE"
      },
      "maxParticipants": 50,
      "currentParticipants": 35,
      "availableSlots": 15,
      "isFull": false,
      "waitlistEnabled": true,
      "maxStaffCount": 5,
      "currentStaffCount": 3,
      "registrationStart": "2024-03-01T00:00:00Z",
      "registrationEnd": "2024-03-10T23:59:59Z",
      "activityStart": "2024-03-15T09:00:00Z",
      "activityEnd": "2024-03-15T16:00:00Z",
      "location_TH": "ห้อง 101 อาคารวิศวกรรม",
      "location_EN": "Room 101 Engineering Building",
      "isOnline": false,
      "isForCMUEngineering": false,
      "allowedYearLevels": [1, 2, 3, 4],
      "staffAllowedYears": [2, 3, 4],
      "walkinEnabled": false,
      "priority": 1,
      "photos": [
        "https://res.cloudinary.com/..."
      ],
      "skillRewards": [
        {
          "id": 1,
          "baseExperience": 100,
          "bonusExperience": 20,
          "subSkillCategory": {
            "id": 5,
            "name_TH": "การเขียนโปรแกรม",
            "name_EN": "Programming",
            "slug": "programming",
            "icon": "code",
            "color": "#3B82F6",
            "mainSkillCategory": {
              "id": 1,
              "name_TH": "ทักษะทางเทคนิค",
              "name_EN": "Technical Skills",
              "icon": "laptop",
              "color": "#3B82F6"
            }
          }
        }
      ],
      "totalExpReward": 120,
      "state": {
        "isRegistrationOpen": true,
        "isEventOngoing": false,
        "isEventPast": false
      },
      "_count": {
        "registrations": 35
      }
    }
  ],
  "availableCategories": [
    {
      "id": 1,
      "name_TH": "วิศวกรรมคอมพิวเตอร์",
      "name_EN": "Computer Engineering",
      "code": "CPE"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 12,
    "totalPages": 5,
    "hasMore": true
  }
}
```

#### Error Responses

**500 Internal Server Error**
```json
{
  "error": "Failed to fetch events",
  "details": "Error message"
}
```

### Business Logic

1. **Filtering**:
   - แสดงเฉพาะกิจกรรมที่ `status = PUBLISHED`
   - แสดงกิจกรรมที่ยังไม่จบ หรือจบภายใน 7 วันที่ผ่านมา
   - กรองตาม isOnline, search, mainSkillId

2. **Computed Fields**:
   - `availableSlots`: maxParticipants - currentParticipants
   - `isFull`: availableSlots === 0
   - `totalExpReward`: sum ของ baseExperience + bonusExperience
   - `state`: isRegistrationOpen, isEventOngoing, isEventPast

3. **Photos**:
   - แสดงเฉพาะรูปหลัก (isMain: true)

4. **Available Categories**:
   - รายการหมวดหมู่ที่มีกิจกรรมอยู่ (ใช้สำหรับ filter)

### Example Usage

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/events/public?search=AI&page=1&limit=12');
const data = await response.json();

if (data.success) {
  data.data.forEach(event => {
    console.log(`${event.title_EN} - ${event.availableSlots} slots available`);
    console.log(`Total EXP: ${event.totalExpReward}`);
    console.log(`Registration open: ${event.state.isRegistrationOpen}`);
  });
}
```

---

## GET /api/events/slug/[slug]

ดึงข้อมูลกิจกรรมแบบละเอียดด้วย slug

### Endpoint
```
GET /api/events/slug/{slug}
```

### Authentication
Optional - ถ้า login จะแสดงสถานะการลงทะเบียนของผู้ใช้

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| slug | string | Yes | URL slug ของกิจกรรม |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "workshop-ai-2024",
    "title_TH": "Workshop AI สำหรับมือใหม่",
    "title_EN": "AI Workshop for Beginners",
    "description_TH": "เรียนรู้พื้นฐาน AI อย่างครบถ้วน...",
    "description_EN": "Comprehensive AI fundamentals...",
    "creator": {
      "id": 123,
      "firstName": "สมชาย",
      "lastName": "ใจดี",
      "email": "admin@cmu.ac.th",
      "photo": "https://...",
      "faculty": "Engineering",
      "major": "Computer Engineering"
    },
    "majorCategory": {
      "id": 1,
      "name_TH": "วิศวกรรมคอมพิวเตอร์",
      "name_EN": "Computer Engineering",
      "code": "CPE"
    },
    "photos": [
      {
        "id": 1,
        "url": "https://res.cloudinary.com/..."
      }
    ],
    "staffAssignments": [
      {
        "id": 1,
        "user_id": 456,
        "status": "CONFIRMED",
        "assignedAt": "2024-02-15T10:00:00Z",
        "user": {
          "id": 456,
          "firstName": "นภา",
          "lastName": "สุขใจ",
          "email": "staff@cmu.ac.th",
          "photo": "https://..."
        }
      }
    ],
    "skillRewards": [
      {
        "id": 1,
        "baseExperience": 100,
        "bonusExperience": 20,
        "levelType": "I",
        "subSkillCategory": {
          "id": 5,
          "name_TH": "การเขียนโปรแกรม",
          "name_EN": "Programming",
          "slug": "programming",
          "icon": "code",
          "color": "#3B82F6",
          "mainSkillCategory": {
            "id": 1,
            "name_TH": "ทักษะทางเทคนิค",
            "name_EN": "Technical Skills",
            "icon": "laptop",
            "color": "#3B82F6"
          }
        }
      }
    ],
    "prerequisites": [],
    "checkInTimeSlots": [
      {
        "id": 1,
        "slot_number": 1,
        "startTime": "2024-03-15T09:00:00Z",
        "endTime": "2024-03-15T12:00:00Z",
        "earlyCheckInMinutes": 15,
        "name_TH": "ช่วงเช้า",
        "name_EN": "Morning Session",
        "skillRewards": [
          {
            "id": 1,
            "baseExperience": 50,
            "bonusExperience": 10,
            "levelType": "I",
            "requireCheckIn": true,
            "requireCheckOut": true,
            "requireOnTime": false,
            "subSkillCategory": {
              "id": 5,
              "name_TH": "การเขียนโปรแกรม",
              "name_EN": "Programming",
              "mainSkillCategory": {
                "id": 1,
                "name_EN": "Technical Skills",
                "name_TH": "ทักษะทางเทคนิค",
                "color": "#3B82F6",
                "icon": "laptop"
              }
            }
          }
        ]
      }
    ],
    "maxParticipants": 50,
    "currentParticipants": 35,
    "maxStaffCount": 5,
    "currentStaffCount": 3,
    "waitlistEnabled": true,
    "registrationStart": "2024-03-01T00:00:00Z",
    "registrationEnd": "2024-03-10T23:59:59Z",
    "activityStart": "2024-03-15T09:00:00Z",
    "activityEnd": "2024-03-15T16:00:00Z",
    "lateCheckInPenalty": 10,
    "staffCheckInTime": 30,
    "staffCommunicationLink": "https://line.me/...",
    "status": "PUBLISHED",
    "priority": 1,
    "location_TH": "ห้อง 101 อาคารวิศวกรรม",
    "location_EN": "Room 101 Engineering Building",
    "locationMapUrl": "https://maps.google.com/...",
    "isOnline": false,
    "meetingLink": null,
    "walkinEnabled": false,
    "isForCMUEngineering": false,
    "allowedYearLevels": [1, 2, 3, 4],
    "staffAllowedYears": [2, 3, 4],
    "registrationStats": {
      "total": 35,
      "registered": 30,
      "attended": 5,
      "completed": 0,
      "cancelled": 0,
      "waitlist": 0
    },
    "state": {
      "isRegistrationOpen": true,
      "isEventOngoing": false,
      "isEventPast": false,
      "isFull": false
    },
    "totalExpReward": 120,
    "currentUserStatus": {
      "isRegistered": true,
      "isStaff": false,
      "registrationStatus": "REGISTERED",
      "staffStatus": null,
      "staffRole": null
    }
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Slug is required"
}
```

**404 Not Found**
```json
{
  "error": "Event not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to fetch event",
  "details": "Error message"
}
```

### Business Logic

1. **User Participation Status**:
   - ถ้า user login อยู่ จะแสดง `currentUserStatus`
   - แสดงว่าลงทะเบียนแล้วหรือไม่, เป็น staff หรือไม่

2. **Registration Stats**:
   - สถิติการลงทะเบียนแยกตาม status
   - นับจำนวน registered, attended, completed, cancelled, waitlist

3. **State Calculation**:
   - `isRegistrationOpen`: ตรวจสอบว่าเปิดลงทะเบียนอยู่หรือไม่
   - `isEventOngoing`: กิจกรรมกำลังดำเนินการอยู่
   - `isEventPast`: กิจกรรมจบแล้ว
   - `isFull`: ที่นั่งเต็มแล้ว

### Example Usage

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/events/slug/workshop-ai-2024', {
  credentials: 'include' // ถ้าต้องการดูสถานะการลงทะเบียน
});

const data = await response.json();
if (data.success) {
  const event = data.data;
  console.log(`${event.title_EN} by ${event.creator.firstName}`);
  console.log(`Available: ${event.maxParticipants - event.currentParticipants} slots`);
  
  if (event.currentUserStatus) {
    if (event.currentUserStatus.isRegistered) {
      console.log('You are already registered!');
    }
    if (event.currentUserStatus.isStaff) {
      console.log('You are a staff member');
    }
  }
}
```

---

## GET /api/events/[eventId]/skill-rewards

ดึงรายการ Skill Rewards ของกิจกรรม

### Endpoint
```
GET /api/events/{eventId}/skill-rewards
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | number | Yes | รหัสกิจกรรม |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "event": {
      "id": 1,
      "title_EN": "AI Workshop",
      "title_TH": "Workshop AI"
    },
    "skillRewards": [
      {
        "id": 1,
        "baseExperience": 100,
        "bonusExperience": 20,
        "levelType": "I",
        "subSkillCategory": {
          "id": 5,
          "name_TH": "การเขียนโปรแกรม",
          "name_EN": "Programming",
          "isActive": true,
          "mainSkillCategory": {
            "id": 1,
            "name_EN": "Technical Skills",
            "name_TH": "ทักษะทางเทคนิค",
            "color": "#3B82F6",
            "icon": "laptop"
          }
        }
      }
    ],
    "totalRewards": 1,
    "activeRewards": 1
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid event ID"
}
```

**403 Forbidden**
```json
{
  "error": "You don't have permission to access this event. Only SUPREME or Major Admin of this category can manage events."
}
```

**404 Not Found**
```json
{
  "error": "Event not found"
}
```

### Example Usage

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/events/1/skill-rewards', {
  credentials: 'include'
});

const data = await response.json();
if (data.success) {
  data.data.skillRewards.forEach(reward => {
    console.log(`${reward.subSkillCategory.name_EN}: ${reward.baseExperience} EXP`);
  });
}
```

---

## POST /api/events/[eventId]/skill-rewards

เพิ่ม Skill Reward ให้กิจกรรม

### Endpoint
```
POST /api/events/{eventId}/skill-rewards
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | number | Yes | รหัสกิจกรรม |

### Request Body

```json
{
  "subSkillCategory_id": 5,
  "baseExperience": 100,
  "bonusExperience": 20,
  "levelType": "I"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| subSkillCategory_id | number | Yes | รหัส sub skill category |
| baseExperience | number | Yes | ประสบการณ์พื้นฐาน (>= 0) |
| bonusExperience | number | No | ประสบการณ์โบนัส (>= 0) |
| levelType | string | No | ระดับ (I, II, III, IV) default: "-" |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Event skill reward created successfully",
  "data": {
    "id": 1,
    "event_id": 1,
    "subSkillCategory_id": 5,
    "baseExperience": 100,
    "bonusExperience": 20,
    "levelType": "I",
    "subSkillCategory": {
      "id": 5,
      "name_TH": "การเขียนโปรแกรม",
      "name_EN": "Programming",
      "mainSkillCategory": {
        "id": 1,
        "name_EN": "Technical Skills",
        "name_TH": "ทักษะทางเทคนิค"
      }
    }
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required fields: subSkillCategory_id, baseExperience"
}
```

```json
{
  "error": "baseExperience must be non-negative"
}
```

```json
{
  "error": "Sub skill category is not active"
}
```

**404 Not Found**
```json
{
  "error": "Sub skill category not found"
}
```

**409 Conflict**
```json
{
  "error": "This skill reward already exists for this event"
}
```

### Example Usage

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/events/1/skill-rewards', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    subSkillCategory_id: 5,
    baseExperience: 100,
    bonusExperience: 20,
    levelType: "I"
  })
});

const data = await response.json();
```

---

## PUT /api/events/[eventId]/skill-rewards

แก้ไข Skill Reward

### Endpoint
```
PUT /api/events/{eventId}/skill-rewards
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Request Body

```json
{
  "id": 1,
  "baseExperience": 120,
  "bonusExperience": 30,
  "isActive": true
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | Yes | รหัส skill reward |
| baseExperience | number | No | ประสบการณ์พื้นฐานใหม่ |
| bonusExperience | number | No | ประสบการณ์โบนัสใหม่ |
| isActive | boolean | No | สถานะ active |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Event skill reward updated successfully",
  "data": {
    "id": 1,
    "baseExperience": 120,
    "bonusExperience": 30
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "This skill reward does not belong to this event"
}
```

**404 Not Found**
```json
{
  "error": "Event skill reward not found"
}
```

---

## DELETE /api/events/[eventId]/skill-rewards

ลบ Skill Reward

### Endpoint
```
DELETE /api/events/{eventId}/skill-rewards?id={rewardId}
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | รหัส skill reward ที่ต้องการลบ |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Event skill reward deleted successfully",
  "data": {
    "id": 1,
    "event_id": 1,
    "subSkillCategory": {
      "id": 5,
      "name_EN": "Programming",
      "name_TH": "การเขียนโปรแกรม"
    }
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Cannot delete skill reward - participants have already received experience",
  "details": {
    "participantsCount": 25,
    "message": "Consider setting isActive to false instead"
  }
}
```

**404 Not Found**
```json
{
  "error": "Event skill reward not found"
}
```

### Business Logic

- ถ้ามีผู้เข้าร่วมได้รับ experience แล้ว จะลบไม่ได้
- แนะนำให้ set `isActive = false` แทนการลบ

---

## GET /api/events/[eventId]/time-slots

ดึงรายการ Check-In Time Slots ของกิจกรรม

### Endpoint
```
GET /api/events/{eventId}/time-slots
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | number | Yes | รหัสกิจกรรม |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "event": {
      "id": 1,
      "title_EN": "AI Workshop",
      "title_TH": "Workshop AI"
    },
    "timeSlots": [
      {
        "id": 1,
        "event_id": 1,
        "slot_number": 1,
        "startTime": "2024-03-15T09:00:00Z",
        "endTime": "2024-03-15T12:00:00Z",
        "name_TH": "ช่วงเช้า",
        "name_EN": "Morning Session",
        "description_TH": null,
        "description_EN": null,
        "skillRewards": [
          {
            "id": 1,
            "baseExperience": 50,
            "bonusExperience": 10,
            "levelType": "I",
            "requireCheckIn": true,
            "requireCheckOut": true,
            "requireOnTime": false,
            "subSkillCategory": {
              "id": 5,
              "name_TH": "การเขียนโปรแกรม",
              "name_EN": "Programming",
              "mainSkillCategory": {
                "id": 1,
                "name_EN": "Technical Skills",
                "name_TH": "ทักษะทางเทคนิค",
                "color": "#3B82F6",
                "icon": "laptop"
              }
            }
          }
        ]
      }
    ],
    "totalSlots": 1
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid event ID"
}
```

**403 Forbidden**
```json
{
  "error": "You don't have permission to manage this event"
}
```

**404 Not Found**
```json
{
  "error": "Event not found"
}
```

---

## POST /api/events/[eventId]/time-slots

สร้าง Check-In Time Slot ใหม่

### Endpoint
```
POST /api/events/{eventId}/time-slots
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Request Body

```json
{
  "slot_number": 1,
  "startTime": "2024-03-15T09:00:00Z",
  "endTime": "2024-03-15T12:00:00Z",
  "name_TH": "ช่วงเช้า",
  "name_EN": "Morning Session",
  "description_TH": "เรียนภาคทฤษฎี",
  "description_EN": "Theory session",
  "earlyCheckInMinutes": 15,
  "skillRewards": [
    {
      "subSkillCategory_id": 5,
      "levelType": "I",
      "baseExperience": 50,
      "bonusExperience": 10,
      "requireCheckIn": true,
      "requireCheckOut": true,
      "requireOnTime": false
    }
  ]
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| slot_number | number | Yes | หมายเลขช่วง (ต้องไม่ซ้ำ) |
| startTime | datetime | Yes | เวลาเริ่มต้น (ต้องไม่ก่อน activityStart ของ event) |
| endTime | datetime | Yes | เวลาสิ้นสุด |
| name_TH | string | No | ชื่อช่วงภาษาไทย |
| name_EN | string | No | ชื่อช่วงภาษาอังกฤษ |
| description_TH | string | No | รายละเอียดภาษาไทย |
| description_EN | string | No | รายละเอียดภาษาอังกฤษ |
| earlyCheckInMinutes | number \| null | No | นาทีที่เปิดเช็คอินก่อนเวลาเริ่ม slot (`null` = ใช้ event default, `0` = เริ่มเช็คอินพอดีเวลา, `N` = เปิดก่อน N นาที) |
| skillRewards | array | No | รายการ skill rewards สำหรับช่วงนี้ |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Time slot created successfully",
  "data": {
    "id": 1,
    "event_id": 1,
    "slot_number": 1,
    "startTime": "2024-03-15T09:00:00Z",
    "endTime": "2024-03-15T12:00:00Z",
    "skillRewards": [...]
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required fields: startTime, endTime, slot_number"
}
```

**409 Conflict**
```json
{
  "error": "Slot number 1 already exists for this event"
}
```

### Business Logic

- เมื่อมี time slots แล้ว จะ set `allowMultipleCheckIns = true` อัตโนมัติ
- slot_number ต้องไม่ซ้ำภายใน event เดียวกัน
- สามารถเพิ่ม skill rewards พร้อมกับการสร้าง time slot

---

## PATCH /api/events/[eventId]/time-slots

แก้ไข Check-In Time Slot

### Endpoint
```
PATCH /api/events/{eventId}/time-slots
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Request Body

```json
{
  "id": 1,
  "startTime": "2024-03-15T09:30:00Z",
  "endTime": "2024-03-15T12:30:00Z",
  "name_TH": "ช่วงเช้า (แก้ไข)",
  "slot_number": 1,
  "earlyCheckInMinutes": 10
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | Yes | รหัส time slot |
| startTime | datetime | No | เวลาเริ่มต้นใหม่ (ต้องไม่ก่อน activityStart ของ event) |
| endTime | datetime | No | เวลาสิ้นสุดใหม่ |
| slot_number | number | No | หมายเลขช่วงใหม่ |
| name_TH | string | No | ชื่อช่วงภาษาไทยใหม่ |
| name_EN | string | No | ชื่อช่วงภาษาอังกฤษใหม่ |
| description_TH | string | No | รายละเอียดภาษาไทยใหม่ |
| description_EN | string | No | รายละเอียดภาษาอังกฤษใหม่ |
| earlyCheckInMinutes | number \| null | No | นาทีที่เปิดเช็คอินก่อนเวลาเริ่ม slot (`null` = ใช้ event default, `0` = เริ่มเช็คอินพอดีเวลา, `N` = เปิดก่อน N นาที) |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Time slot updated successfully",
  "data": {
    "id": 1,
    "slot_number": 1,
    "startTime": "2024-03-15T09:30:00Z",
    "endTime": "2024-03-15T12:30:00Z"
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required field: id"
}
```

**404 Not Found**
```json
{
  "error": "Time slot not found or doesn't belong to this event"
}
```

---

## DELETE /api/events/[eventId]/time-slots

ลบ Check-In Time Slot

### Endpoint
```
DELETE /api/events/{eventId}/time-slots?slotId={slotId}
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| slotId | number | Yes | รหัส time slot ที่ต้องการลบ |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Time slot deleted successfully"
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid event ID or slot ID"
}
```

**404 Not Found**
```json
{
  "error": "Time slot not found or doesn't belong to this event"
}
```

**409 Conflict**
```json
{
  "error": "Cannot delete time slot with existing check-in records"
}
```

### Business Logic

- ถ้ามีคนเช็คอินแล้ว จะลบไม่ได้
- cascade delete: skill rewards ของ time slot นั้นจะถูกลบด้วย
- ถ้าลบจนไม่มี time slots เหลือเลย จะ set `allowMultipleCheckIns = false` อัตโนมัติ

---

## GET /api/events/[eventId]/time-slots/[slotId]/skill-rewards

ดึง Skill Rewards ของ Time Slot

### Endpoint
```
GET /api/events/{eventId}/time-slots/{slotId}/skill-rewards
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | number | Yes | รหัสกิจกรรม |
| slotId | number | Yes | รหัส time slot |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "timeSlot": {
      "id": 1,
      "slot_number": 1,
      "startTime": "2024-03-15T09:00:00Z",
      "endTime": "2024-03-15T12:00:00Z",
      "name_TH": "ช่วงเช้า",
      "name_EN": "Morning Session"
    },
    "skillRewards": [
      {
        "id": 1,
        "baseExperience": 50,
        "bonusExperience": 10,
        "levelType": "I",
        "requireCheckIn": true,
        "requireCheckOut": true,
        "requireOnTime": false,
        "subSkillCategory": {
          "id": 5,
          "name_TH": "การเขียนโปรแกรม",
          "name_EN": "Programming",
          "mainSkillCategory": {
            "id": 1,
            "name_EN": "Technical Skills",
            "name_TH": "ทักษะทางเทคนิค",
            "color": "#3B82F6",
            "icon": "laptop"
          }
        }
      }
    ],
    "totalRewards": 1
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid event ID or slot ID"
}
```

**404 Not Found**
```json
{
  "error": "Time slot not found or doesn't belong to this event"
}
```

---

## POST /api/events/[eventId]/time-slots/[slotId]/skill-rewards

เพิ่ม Skill Reward ให้ Time Slot

### Endpoint
```
POST /api/events/{eventId}/time-slots/{slotId}/skill-rewards
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Request Body

```json
{
  "subSkillCategory_id": 5,
  "levelType": "I",
  "baseExperience": 50,
  "bonusExperience": 10,
  "requireCheckIn": true,
  "requireCheckOut": true,
  "requireOnTime": false
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| subSkillCategory_id | number | Yes | รหัส sub skill category |
| levelType | string | Yes | ระดับ (I, II, III, IV) |
| baseExperience | number | Yes | ประสบการณ์พื้นฐาน |
| bonusExperience | number | No | ประสบการณ์โบนัส (default: 0) |
| requireCheckIn | boolean | No | ต้องเช็คอินหรือไม่ (default: true) |
| requireCheckOut | boolean | No | ต้องเช็คเอาท์หรือไม่ (default: true) |
| requireOnTime | boolean | No | ต้องมาตรงเวลาหรือไม่ (default: false) |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Skill reward added successfully",
  "data": {
    "id": 1,
    "checkInTimeSlot_id": 1,
    "subSkillCategory_id": 5,
    "levelType": "I",
    "baseExperience": 50,
    "bonusExperience": 10,
    "requireCheckIn": true,
    "requireCheckOut": true,
    "requireOnTime": false
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required fields: subSkillCategory_id, levelType, baseExperience"
}
```

**404 Not Found**
```json
{
  "error": "Sub skill category not found"
}
```

```json
{
  "error": "Time slot not found or doesn't belong to this event"
}
```

**409 Conflict**
```json
{
  "error": "Skill reward already exists for this combination"
}
```

### Business Logic

- ไม่สามารถเพิ่ม skill reward ที่ซ้ำกัน (เดียวกันทั้ง subSkillCategory และ levelType)
- subSkillCategory ต้อง active

---

## PATCH /api/events/[eventId]/time-slots/[slotId]/skill-rewards

แก้ไข Skill Reward ของ Time Slot

### Endpoint
```
PATCH /api/events/{eventId}/time-slots/{slotId}/skill-rewards
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Request Body

```json
{
  "id": 1,
  "baseExperience": 60,
  "bonusExperience": 15,
  "requireOnTime": true
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | Yes | รหัส skill reward |
| baseExperience | number | No | ประสบการณ์พื้นฐานใหม่ |
| bonusExperience | number | No | ประสบการณ์โบนัสใหม่ |
| requireCheckIn | boolean | No | ต้องเช็คอินหรือไม่ |
| requireCheckOut | boolean | No | ต้องเช็คเอาท์หรือไม่ |
| requireOnTime | boolean | No | ต้องมาตรงเวลาหรือไม่ |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Skill reward updated successfully",
  "data": {
    "id": 1,
    "baseExperience": 60,
    "bonusExperience": 15,
    "requireOnTime": true
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required field: id"
}
```

**404 Not Found**
```json
{
  "error": "Skill reward not found or doesn't belong to this time slot"
}
```

---

## DELETE /api/events/[eventId]/time-slots/[slotId]/skill-rewards

ลบ Skill Reward ของ Time Slot

### Endpoint
```
DELETE /api/events/{eventId}/time-slots/{slotId}/skill-rewards?rewardId={rewardId}
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| rewardId | number | Yes | รหัส skill reward ที่ต้องการลบ |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Skill reward deleted successfully"
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid event ID, slot ID, or reward ID"
}
```

**404 Not Found**
```json
{
  "error": "Skill reward not found or doesn't belong to this time slot"
}
```

---

## GET /api/events/[eventId]/registrations/summary

ดึงสถิติการลงทะเบียน (Registration Summary & Statistics)

### Endpoint
```
GET /api/events/{eventId}/registrations/summary
```

### Authentication
Required - Admin ที่มีสิทธิ์จัดการกิจกรรมนั้น

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | number | Yes | รหัสกิจกรรม |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | หน้าที่ต้องการ |
| limit | number | No | 20 | จำนวนรายการต่อหน้า |
| status | string | No | - | กรองตาม registration status |
| search | string | No | - | ค้นหาจากชื่อ, email, รหัสนักศึกษา |
| sortBy | string | No | createdAt | เรียงลำดับตาม field |
| sortOrder | string | No | desc | asc หรือ desc |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "event": {
      "id": 1,
      "title_EN": "AI Workshop",
      "title_TH": "Workshop AI",
      "slug": "workshop-ai-2024",
      "status": "PUBLISHED",
      "capacity": {
        "maxParticipants": 50,
        "currentParticipants": 35,
        "availableSlots": 15,
        "utilizationRate": "70.00%"
      },
      "staff": {
        "maxStaffCount": 5,
        "currentStaffCount": 3,
        "availableSlots": 2
      },
      "timeline": {
        "registrationStart": "2024-03-01T00:00:00Z",
        "registrationEnd": "2024-03-10T23:59:59Z",
        "activityStart": "2024-03-15T09:00:00Z",
        "activityEnd": "2024-03-15T16:00:00Z"
      }
    },
    "statistics": {
      "total": 35,
      "byStatus": {
        "REGISTERED": 25,
        "ATTENDED": 8,
        "COMPLETED": 2,
        "CANCELLED": 0,
        "PENDING": 0
      },
      "byRegistrationType": {
        "NORMAL": 30,
        "WALKIN": 5,
        "INVITATION": 0
      },
      "checkIn": {
        "checkedIn": 35,
        "checkedOut": 30,
        "notCheckedIn": 0,
        "checkInRate": "100.00%",
        "checkOutRate": "85.71%"
      },
      "experience": {
        "totalEarned": 3500,
        "averageEarned": 100,
        "maxEarned": 120,
        "minEarned": 80
      },
      "evaluation": {
        "completed": 28,
        "notCompleted": 7,
        "completionRate": "80.00%"
      }
    },
    "registrations": [
      {
        "id": 1,
        "user_id": 456,
        "status": "COMPLETED",
        "registrationType": "NORMAL",
        "checkedIn": true,
        "checkInTime": "2024-03-15T08:55:00Z",
        "checkedOut": true,
        "checkOutTime": "2024-03-15T16:10:00Z",
        "experienceEarned": 120,
        "hasEvaluated": true,
        "createdAt": "2024-03-01T10:30:00Z",
        "user": {
          "id": 456,
          "firstName": "สมชาย",
          "lastName": "ใจดี",
          "email": "user@cmu.ac.th",
          "faculty": "Engineering",
          "major": "Computer Engineering",
          "photo": "https://..."
        }
      }
    ],
    "pagination": {
      "total": 35,
      "page": 1,
      "limit": 20,
      "totalPages": 2,
      "hasMore": true
    }
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid event ID"
}
```

**404 Not Found**
```json
{
  "error": "Event not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to fetch event registrations summary",
  "details": "Error message"
}
```

### Business Logic

1. **Statistics Calculation**:
   - `total`: จำนวนผู้ลงทะเบียนทั้งหมด
   - `byStatus`: จำนวนแยกตามสถานะ
   - `byRegistrationType`: จำนวนแยกตามประเภทการลงทะเบียน
   - `checkIn`: สถิติการเช็คอิน/เอาท์
   - `experience`: สถิติประสบการณ์ที่ได้รับ
   - `evaluation`: สถิติการประเมิน

2. **Capacity**:
   - `utilizationRate`: อัตราการใช้งานที่นั่ง (%)

3. **Pagination**:
   - รองรับการแบ่งหน้า
   - สามารถกรอง, ค้นหา, เรียงลำดับ

### Example Usage

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/events/1/registrations/summary?status=COMPLETED&page=1&limit=20', {
  credentials: 'include'
});

const data = await response.json();
if (data.success) {
  console.log(`Total registrations: ${data.data.statistics.total}`);
  console.log(`Check-in rate: ${data.data.statistics.checkIn.checkInRate}`);
  console.log(`Evaluation completion: ${data.data.statistics.evaluation.completionRate}`);
}
```

---

## GET /api/events/[eventId]/xlsx

Export รายชื่อผู้เข้าร่วมเป็นไฟล์ Excel

### Endpoint
```
GET /api/events/{eventId}/xlsx
```

### Authentication
Required - Admin หรือ Staff ของกิจกรรมนั้น

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | number | Yes | รหัสกิจกรรม |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | string | No | "json" หรือ "xlsx" (default: json) |
| status | string | No | กรองตาม status (คั่นด้วย comma) |
| registrationType | string | No | กรองตาม registration type (คั่นด้วย comma) |
| checkedIn | boolean | No | กรองตามการเช็คอิน |
| checkedOut | boolean | No | กรองตามการเช็คเอาท์ |
| isLate | boolean | No | กรองตามการมาสาย |

### Response

#### Success (200 OK) - JSON Format

```json
{
  "success": true,
  "event": {
    "id": 1,
    "title_TH": "Workshop AI",
    "title_EN": "AI Workshop",
    "allowMultipleCheckIns": true,
    "totalSlots": 2
  },
  "statistics": {
    "totalRegistrations": 35,
    "totalFiltered": 35,
    "byStatus": {
      "COMPLETED": 30,
      "LATE": 5
    },
    "byRegistrationType": {
      "NORMAL": 30,
      "WALKIN": 5
    },
    "checkedIn": 35,
    "checkedOut": 33,
    "completed": 30,
    "late": 5,
    "absent": 0
  },
  "participants": [
    {
      "userId": 456,
      "studentId": "456",
      "firstName": "สมชาย",
      "lastName": "ใจดี",
      "fullName": "สมชาย ใจดี",
      "email": "user@cmu.ac.th",
      "faculty": "Engineering",
      "major": "Computer Engineering",
      "phone": "0812345678",
      "registrationType": "NORMAL",
      "status": "COMPLETED",
      "checkInStatus": "เช็คอินครบทุกช่วง",
      "isLate": false,
      "checkedIn": true,
      "checkInTime": "2024-03-15T08:55:00Z",
      "checkedOut": true,
      "checkOutTime": "2024-03-15T16:10:00Z",
      "experienceEarned": 120,
      "hasEvaluated": true,
      "registeredAt": "2024-03-01T10:30:00Z",
      "checkInRecords": [
        {
          "slotNumber": 1,
          "slotStart": "2024-03-15T09:00:00Z",
          "slotEnd": "2024-03-15T12:00:00Z",
          "checkedIn": true,
          "checkInTime": "2024-03-15T08:55:00Z",
          "checkedOut": true,
          "checkOutTime": "2024-03-15T12:05:00Z",
          "isLate": false,
          "expEarned": 60
        },
        {
          "slotNumber": 2,
          "slotStart": "2024-03-15T13:00:00Z",
          "slotEnd": "2024-03-15T16:00:00Z",
          "checkedIn": true,
          "checkInTime": "2024-03-15T12:58:00Z",
          "checkedOut": true,
          "checkOutTime": "2024-03-15T16:10:00Z",
          "isLate": false,
          "expEarned": 60
        }
      ]
    }
  ]
}
```

#### Success (200 OK) - Excel Format

Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

Excel file containing:
- **Sheet 1: ผู้เข้าร่วมกิจกรรม**
  - ชื่อกิจกรรม (header)
  - สถิติ (registration count, check-in rate, etc.)
  - รายชื่อผู้เข้าร่วมพร้อมข้อมูลครบถ้วน
  - Color coding:
    - COMPLETED: เขียวอ่อน
    - LATE: เหลืองอ่อน
    - ABSENT/CANCELLED: แดงอ่อน

- **Sheet 2: รายละเอียดการเช็คอินแต่ละช่วง** (ถ้ามี multiple check-ins)
  - แสดงการเช็คอิน/เอาท์แยกตามแต่ละช่วงเวลา

### Business Logic

1. **Filtering**:
   - สามารถกรองตาม status, registrationType, checkedIn, checkedOut, isLate

2. **Sorting**:
   - COMPLETED → LATE → ATTENDED → REGISTERED → PENDING → CANCELLED → ABSENT

3. **Multi-Sheet Excel**:
   - ถ้ากิจกรรมมี multiple check-in slots จะสร้าง sheet ที่ 2 แสดงรายละเอียดแต่ละช่วง

4. **Color Coding**:
   - ช่วยให้มองเห็นสถานะได้ชัดเจน

### Example Usage

#### cURL - Download Excel

```bash
curl -X GET 'https://api.example.com/api/events/1/xlsx?format=xlsx' \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  --output participants.xlsx
```

#### JavaScript - Download Excel

```javascript
const response = await fetch('/api/events/1/xlsx?format=xlsx&status=COMPLETED,LATE', {
  credentials: 'include'
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'participants.xlsx';
  a.click();
}
```

#### JavaScript - Get JSON Data

```javascript
const response = await fetch('/api/events/1/xlsx?format=json', {
  credentials: 'include'
});

const data = await response.json();
if (data.success) {
  console.log('Statistics:', data.statistics);
  console.log('Participants:', data.participants);
}
```

---

## POST /api/events/log

สร้างการลงทะเบียนแบบ Manual (Admin Only)

### Endpoint
```
POST /api/events/log
```

### Authentication
Required - SKILL ADMIN only

### Request Body

```json
{
  "user_id": 456,
  "event_id": 1,
  "status": "COMPLETED",
  "checkInTime": "2024-03-15T09:00:00Z",
  "checkOutTime": "2024-03-15T16:00:00Z",
  "reason": "Manual registration by admin"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | number | Yes | รหัสผู้ใช้ |
| event_id | number | Yes | รหัสกิจกรรม |
| status | string | Yes | สถานะการลงทะเบียน |
| checkInTime | datetime | No | เวลาเช็คอิน |
| checkOutTime | datetime | No | เวลาเช็คเอาท์ |
| reason | string | No | เหตุผล/หมายเหตุ |

**Valid Status Values**:
- PENDING
- REGISTERED
- ATTENDED
- COMPLETED
- INCOMPLETE
- CANCELLED
- LATE
- LATE_PENALTY
- ABSENT
- UNDER_REVIEW
- NEED_MORE_INFO
- APPROVED
- REJECTED

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Registration created successfully",
  "data": {
    "registration": {
      "id": 1,
      "status": "COMPLETED",
      "createdAt": "2024-03-01T10:30:00Z"
    },
    "user": {
      "id": 456,
      "firstName": "สมชาย",
      "lastName": "ใจดี",
      "email": "user@cmu.ac.th"
    },
    "event": {
      "id": 1,
      "title_TH": "Workshop AI",
      "title_EN": "AI Workshop"
    }
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "error": "Missing required fields: user_id, event_id, status"
}
```

```json
{
  "success": false,
  "error": "Invalid status. Must be one of: PENDING, REGISTERED, ATTENDED, ..."
}
```

**404 Not Found**
```json
{
  "success": false,
  "error": "User with ID 456 not found"
}
```

```json
{
  "success": false,
  "error": "Event with ID 1 not found"
}
```

**409 Conflict**
```json
{
  "success": false,
  "error": "Registration already exists for this user and event",
  "existing": {
    "id": 1,
    "status": "REGISTERED",
    "createdAt": "2024-02-28T14:00:00Z"
  }
}
```

### Business Logic

1. **Permission**: เฉพาะ SKILL_ADMIN เท่านั้น
2. **Validation**: ตรวจสอบว่า user และ event มีอยู่จริง
3. **Duplicate Check**: ไม่สามารถสร้างการลงทะเบียนซ้ำได้
4. **Auto-Set**: 
   - `registrationType = NORMAL`
   - `checkedIn = !!checkInTime`
   - `checkedOut = !!checkOutTime`
   - `experienceEarned = 0` (ต้องคำนวณภายหลัง)
   - `hasEvaluated = false`

### Use Cases

- บันทึกการเข้าร่วมย้อนหลัง
- แก้ไขข้อมูลที่ผิดพลาด
- จัดการกรณีพิเศษ
- Import ข้อมูลจากระบบเก่า

### Example Usage

#### cURL

```bash
curl -X POST https://api.example.com/api/events/log \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -d '{
    "user_id": 456,
    "event_id": 1,
    "status": "COMPLETED",
    "checkInTime": "2024-03-15T09:00:00Z",
    "checkOutTime": "2024-03-15T16:00:00Z",
    "reason": "Manual registration - late submission"
  }'
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/events/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 456,
    event_id: 1,
    status: 'COMPLETED',
    checkInTime: '2024-03-15T09:00:00Z',
    checkOutTime: '2024-03-15T16:00:00Z',
    reason: 'Manual registration'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Registration created:', data.data.registration);
}
```

---

## GET /api/events/log

ดึงรายการลงทะเบียน (Admin Only)

### Endpoint
```
GET /api/events/log?user_id={userId}&event_id={eventId}
```

### Authentication
Required - SKILL ADMIN only

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| user_id | number | No* | รหัสผู้ใช้ที่ต้องการค้นหา |
| event_id | number | No* | รหัสกิจกรรมที่ต้องการค้นหา |

*ต้องระบุอย่างน้อย 1 parameter

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "user_id": 456,
      "event_id": 1,
      "status": "COMPLETED",
      "registrationType": "NORMAL",
      "checkedIn": true,
      "checkInTime": "2024-03-15T09:00:00Z",
      "checkedOut": true,
      "checkOutTime": "2024-03-15T16:00:00Z",
      "experienceEarned": 120,
      "hasEvaluated": true,
      "createdAt": "2024-03-01T10:30:00Z",
      "user": {
        "id": 456,
        "firstName": "สมชาย",
        "lastName": "ใจดี",
        "email": "user@cmu.ac.th"
      },
      "event": {
        "id": 1,
        "title_TH": "Workshop AI",
        "title_EN": "AI Workshop",
        "activityStart": "2024-03-15T09:00:00Z",
        "activityEnd": "2024-03-15T16:00:00Z"
      }
    }
  ]
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "error": "Please provide user_id or event_id"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "error": "Failed to fetch registrations"
}
```

### Business Logic

- เรียงลำดับตาม `createdAt` จากใหม่ไปเก่า
- สามารถค้นหาด้วย user_id หรือ event_id หรือทั้งสอง

### Example Usage

#### cURL

```bash
# ค้นหาการลงทะเบียนของผู้ใช้
curl -X GET 'https://api.example.com/api/events/log?user_id=456' \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..."

# ค้นหาการลงทะเบียนของกิจกรรม
curl -X GET 'https://api.example.com/api/events/log?event_id=1' \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..."
```

#### JavaScript (Fetch)

```javascript
// ดูการลงทะเบียนทั้งหมดของผู้ใช้คนหนึ่ง
const response = await fetch('/api/events/log?user_id=456', {
  credentials: 'include'
});

const data = await response.json();
if (data.success) {
  console.log(`Found ${data.count} registrations`);
  data.data.forEach(reg => {
    console.log(`${reg.event.title_EN} - ${reg.status}`);
  });
}
```

---

## Common Error Scenarios

### Scenario 1: Permission Denied
```
User action: สร้าง/แก้ไข event ในสาขาที่ไม่ได้ดูแล
Error: 403 "Unauthorized: You must be a SUPREME admin or Major Admin..."
Solution: ติดต่อ admin เพื่อขอสิทธิ์
```

### Scenario 2: Slug Conflict
```
User action: สร้าง event ที่มี slug ซ้ำ
Error: 409 "Slug already exists"
Solution: เปลี่ยน slug หรือให้ระบบ auto-generate
```

### Scenario 3: Cannot Delete Event
```
User action: ลบ event ที่มีการลงทะเบียนแล้ว
Error: 400 "Cannot delete event with registrations"
Solution: Cancel registrations ทั้งหมดก่อน หรือเปลี่ยนสถานะเป็น CANCELLED
```

### Scenario 4: Image Upload Limit
```
User action: อัปโหลดรูปเกิน 4 รูป
Error: 400 "Maximum 4 images allowed per event"
Solution: ลดจำนวนรูป หรือลบรูปเก่าก่อน
```

### Scenario 5: Invalid Date Range
```
User action: กำหนดวันที่ไม่ถูกต้อง
Error: 400 "Registration end must be after registration start"
Solution: ตรวจสอบวันที่ให้ถูกต้อง
```

---

## Security Considerations

1. **Authentication & Authorization**:
   - ใช้ JWT tokens (LEAP_AUTH, LEAP_USER)
   - ตรวจสอบสิทธิ์ตาม role และ majorCategory
   - SUPREME admin: เข้าถึงได้ทุกอย่าง
   - Major Admin: เข้าถึงได้เฉพาะสาขาที่ดูแล

2. **File Upload Security**:
   - ตรวจสอบ file type (ต้องเป็นรูปภาพ)
   - จำกัดจำนวนรูป (สูงสุด 4 รูป)
   - Upload ไป Cloudinary (secure storage)
   - Generate unique publicId

3. **Transaction Safety**:
   - ใช้ Database Transaction สำหรับการสร้าง/แก้ไขที่ซับซ้อน
   - Atomic operations (lock row)
   - Rollback on error

4. **Input Validation**:
   - Validate required fields
   - Validate date ranges
   - Validate status values
   - Validate numeric ranges

5. **CORS**:
   - กำหนด allowed origins
   - Credentials: true สำหรับ cookies

---

## Best Practices

1. **Frontend Development**:
   - Use `credentials: 'include'` สำหรับ cookies
   - Handle permission errors gracefully
   - Show loading states ขณะ upload images
   - Validate form data ก่อนส่ง

2. **Image Management**:
   - Compress images ก่อน upload
   - กำหนดรูปหลักที่เหมาะสม
   - ลบรูปเก่าที่ไม่ใช้แล้ว

3. **Error Handling**:
   - แสดง error messages ที่เป็นมิตร
   - Log errors สำหรับ debugging
   - Retry failed uploads

4. **Performance**:
   - ใช้ pagination สำหรับรายการยาว
   - กรองข้อมูลที่ไม่จำเป็น
   - Cache ข้อมูลที่ไม่เปลี่ยนบ่อย

5. **User Experience**:
   - แสดงสถิติแบบ real-time
   - Export Excel สำหรับรายงาน
   - Color coding สำหรับสถานะต่างๆ

---

## Testing Examples

### Test 1: Create Event

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -F "title_TH=Workshop AI" \
  -F "title_EN=AI Workshop" \
  -F "description_TH=เรียนรู้ AI" \
  -F "description_EN=Learn AI" \
  -F "location_TH=ห้อง 101" \
  -F "registrationStart=2024-03-01T00:00:00Z" \
  -F "registrationEnd=2024-03-10T23:59:59Z" \
  -F "activityStart=2024-03-15T09:00:00Z" \
  -F "activityEnd=2024-03-15T16:00:00Z" \
  -F "majorCategory_id=1" \
  -F "maxParticipants=50" \
  -F "staffAllowedYears=[1,2,3,4]" \
  -F "allowedYearLevels=[1,2,3,4]" \
  -F "isOnline=false" \
  -F "status=DRAFT"
```

### Test 2: Get Public Events

```bash
curl -X GET 'http://localhost:3000/api/events/public?search=AI&page=1&limit=12'
```

### Test 3: Get Event by Slug

```bash
curl -X GET http://localhost:3000/api/events/slug/workshop-ai-2024 \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..."
```

### Test 4: Add Skill Reward

```bash
curl -X POST http://localhost:3000/api/events/1/skill-rewards \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -d '{
    "subSkillCategory_id": 5,
    "baseExperience": 100,
    "bonusExperience": 20,
    "levelType": "I"
  }'
```

### Test 5: Export Excel

```bash
curl -X GET 'http://localhost:3000/api/events/1/xlsx?format=xlsx' \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  --output participants.xlsx
```

---
