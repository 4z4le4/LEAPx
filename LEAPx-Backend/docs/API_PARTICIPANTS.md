# Event Participants API

API สำหรับดึงรายชื่อและข้อมูลของผู้เข้าร่วมกิจกรรม  
รองรับการค้นหา (Search), แบ่งหน้า (Pagination) และส่งออกข้อมูล (Export: JSON / CSV / XLSX)

---

## Table of Contents

- [GET /api/events/\[eventId\]/participants](#get-apieventseventidparticipants) — Staff / Admin: รายชื่อผู้เข้าร่วมทั้งหมด
- [GET /api/events/\[eventId\]/participants/me](#get-apieventseventidparticipantsme) — User: ข้อมูลการเข้าร่วมของตนเอง

---

## Overview

| เส้นทาง | สิทธิ์ | คำอธิบาย |
|---|---|---|
| `GET /api/events/[eventId]/participants` | Staff / Activity Admin ขึ้นไป | รายชื่อผู้เข้าร่วมทั้งหมด พร้อมทักษะ & EXP |
| `GET /api/events/[eventId]/participants/me` | User (ผู้ใช้ทั่วไป) | ข้อมูลการเข้าร่วมของตัวเองในกิจกรรมนั้น |

### ฟีเจอร์หลัก

| ฟีเจอร์ | รองรับ |
|---|---|
| ค้นหาด้วยรหัสนักศึกษา / ชื่อ / อีเมล | ✓ |
| กรองตาม `status` | ✓ |
| เรียงลำดับ (`sortBy`, `sortOrder`) | ✓ |
| แบ่งหน้า (`page`, `limit`) | ✓ |
| Export JSON | ✓ |
| Export CSV (พร้อม BOM UTF-8) | ✓ |
| Export XLSX (ไฟล์ Excel) | ✓ |
| ทักษะที่ได้รับต่อคน (หลายอัน) | ✓ |
| ระดับทักษะ & EXP ต่อทักษะ | ✓ |
| สถานะการเข้าร่วม & วันที่อัพเดต | ✓ |
| ข้อมูล Check-in Slot แต่ละช่วง | ✓ |

---

## GET /api/events/[eventId]/participants

**ดึงรายชื่อผู้เข้าร่วมกิจกรรมทั้งหมด** พร้อมทักษะที่ได้รับและสถานะการเข้าร่วม  
สำหรับ Staff และ Activity Admin ขึ้นไปเท่านั้น

### Authentication

- Cookie: `LEAP_AUTH`
- ต้องเป็น Staff ของกิจกรรมนั้น หรือ ACTIVITY_ADMIN / SKILL_ADMIN / SUPREME

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `eventId` | `number` | ✓ | ID ของกิจกรรม |

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `search` | `string` | — | ค้นหาด้วยชื่อ / นามสกุล / อีเมล / รหัสนักศึกษา |
| `status` | `RegistrationStatus` | — | กรองตามสถานะการลงทะเบียน |
| `page` | `number` | `1` | หน้าปัจจุบัน |
| `limit` | `number` | `20` | จำนวนรายการต่อหน้า (สูงสุด 200) |
| `sortBy` | `string` | `createdAt` | ฟิลด์สำหรับเรียง (`createdAt`, `updatedAt`, `status`, `experienceEarned`) |
| `sortOrder` | `asc` \| `desc` | `desc` | ทิศทางการเรียง |
| `format` | `json` \| `csv` \| `xlsx` | `json` | รูปแบบการส่งออกข้อมูล |

#### RegistrationStatus ที่รองรับ

```
PENDING | REGISTERED | ATTENDED | COMPLETED | INCOMPLETE
CANCELLED | LATE | LATE_PENALTY | ABSENT
UNDER_REVIEW | NEED_MORE_INFO | APPROVED | REJECTED
```

### Response (format=json)

**200 OK**

```json
{
  "success": true,
  "data": {
    "event": {
      "id": 1,
      "title_TH": "งานพัฒนาตัวเอง",
      "title_EN": "Self-Development Workshop",
      "slug": "self-dev-2026",
      "status": "COMPLETED",
      "activityStart": "2026-03-01T08:00:00.000Z",
      "activityEnd": "2026-03-01T17:00:00.000Z",
      "maxParticipants": 100,
      "currentParticipants": 85,
      "allowMultipleCheckIns": true
    },
    "statistics": {
      "total": 85,
      "checkedIn": 80,
      "checkedOut": 75,
      "completed": 70,
      "late": 5,
      "absent": 5,
      "totalExpDistributed": 4200
    },
    "participants": [
      {
        "registrationId": 101,
        "studentId": 650612077,
        "firstName": "ชนาธิป",
        "lastName": "มีสุข",
        "fullName": "ชนาธิป มีสุข",
        "email": "chanathip@cmu.ac.th",
        "faculty": "วิศวกรรมศาสตร์",
        "major": "วิศวกรรมคอมพิวเตอร์",
        "photo": "https://...",
        "registrationType": "NORMAL",
        "status": "COMPLETED",
        "statusDate": "2026-03-01T17:30:00.000Z",
        "checkedIn": true,
        "checkInTime": "2026-03-01T08:05:00.000Z",
        "checkedOut": true,
        "checkOutTime": "2026-03-01T17:00:00.000Z",
        "totalExpEarned": 60,
        "hasEvaluated": true,
        "registeredAt": "2026-02-20T10:00:00.000Z",
        "skills": [
          {
            "skillId": 3,
            "skillName_TH": "การพัฒนาตนเอง",
            "skillName_EN": "Self Development",
            "skillSlug": "self-development",
            "skillIcon": "🌱",
            "skillColor": "#4CAF50",
            "mainSkillId": 1,
            "mainSkillName_TH": "ทักษะการพัฒนาตนเอง",
            "mainSkillName_EN": "Personal Development",
            "mainSkillSlug": "personal-development",
            "mainSkillIcon": "icon",
            "mainSkillColor": "#2196F3",
            "levelType": 2,
            "previousLevel": 1,
            "expEarned": 30,
            "expType": "ACTIVITY_COMPLETION",
            "earnedAt": "2026-03-01T17:30:00.000Z"
          },
          {
            "skillId": 7,
            "skillName_TH": "การสื่อสาร",
            "skillName_EN": "Communication",
            "skillSlug": "communication",
            "skillIcon": "icon",
            "skillColor": "#FF9800",
            "mainSkillId": 2,
            "mainSkillName_TH": "ทักษะการสื่อสาร",
            "mainSkillName_EN": "Communication Skills",
            "mainSkillSlug": "communication-skills",
            "mainSkillIcon": "icon",
            "mainSkillColor": "#FF5722",
            "levelType": 1,
            "previousLevel": 0,
            "expEarned": 30,
            "expType": "ACTIVITY_COMPLETION",
            "earnedAt": "2026-03-01T17:30:00.000Z"
          }
        ]
      }
    ],
    "pagination": {
      "total": 85,
      "page": 1,
      "limit": 20,
      "totalPages": 5,
      "hasMore": true
    }
  }
}
```

### Response (format=csv)

ดาวน์โหลดไฟล์ `.csv` (UTF-8 BOM) พร้อม headers:

```
ลำดับ, รหัสนักศึกษา, ชื่อ, นามสกุล, อีเมล, คณะ, สาขา,
ประเภทการลงทะเบียน, สถานะ, วันที่อัพเดตสถานะ,
เช็คอิน, เวลาเช็คอิน, เช็คเอาท์, เวลาเช็คเอาท์,
EXP รวม, ทักษะที่ได้รับ (TH), ทักษะที่ได้รับ (EN), ระดับทักษะ, EXP ต่อทักษะ
```

- ทักษะหลายอันในเซลล์เดียวคั่นด้วย ` | `

### Response (format=xlsx)

ดาวน์โหลดไฟล์ Excel `.xlsx`

- **Row 1**: ชื่อกิจกรรม (TH)
- **Row 2**: สถิติสรุป (จำนวนลงทะเบียน / เช็คอิน / เสร็จ / สาย / ขาด / EXP รวม)
- **Row 3**: Header คอลัมน์ (สีน้ำเงิน ตัวหนา)
- **Row 4+**: ข้อมูลผู้เข้าร่วม (ไฮไลต์สีตามสถานะ)

| สีพื้นหลัง | สถานะ |
|---|---|
| เขียวอ่อน | COMPLETED |
| เหลืองอ่อน | LATE |
| แดงอ่อน | ABSENT |
| ส้มอ่อน | LATE_PENALTY |
| ฟ้าอ่อน | REGISTERED / ATTENDED |
| เทาอ่อน | CANCELLED |

### Error Responses

| Status | Error | Reason |
|---|---|---|
| 400 | `Invalid event ID` | eventId ไม่ใช่ตัวเลข |
| 400 | `Unsupported format` | format ไม่ใช่ json/csv/xlsx |
| 403 | `Unauthorized` | ไม่ใช่ Staff หรือ Admin ของกิจกรรม |
| 404 | `Event not found` | ไม่พบกิจกรรม |
| 500 | `Failed to fetch participants` | ข้อผิดพลาดฝั่ง Server |

---

## GET /api/events/[eventId]/participants/me

**ดูข้อมูลการเข้าร่วมของตนเอง** ในกิจกรรมนั้น  
สำหรับผู้ใช้ทั่วไปที่ลงทะเบียนแล้ว

### Authentication

- Cookie: `LEAP_AUTH`
- ต้องเป็น USER role ขึ้นไป
- ต้องลงทะเบียนกิจกรรมนั้นไว้แล้ว

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `eventId` | `number` | ✓ | ID ของกิจกรรม |

### Response

**200 OK**

```json
{
  "success": true,
  "data": {
    "event": {
      "id": 1,
      "title_TH": "งานพัฒนาตัวเอง",
      "title_EN": "Self-Development Workshop",
      "slug": "self-dev-2026",
      "status": "COMPLETED",
      "activityStart": "2026-03-01T08:00:00.000Z",
      "activityEnd": "2026-03-01T17:00:00.000Z",
      "allowMultipleCheckIns": true
    },
    "participation": {
      "registrationId": 101,
      "status": "COMPLETED",
      "statusDate": "2026-03-01T17:30:00.000Z",
      "registrationType": "NORMAL",
      "checkedIn": true,
      "checkInTime": "2026-03-01T08:05:00.000Z",
      "checkedOut": true,
      "checkOutTime": "2026-03-01T17:00:00.000Z",
      "totalExpEarned": 60,
      "hasEvaluated": true,
      "registeredAt": "2026-02-20T10:00:00.000Z",
      "checkInRecords": [
        {
          "slotId": 5,
          "slotNumber": 1,
          "slotStart": "2026-03-01T08:00:00.000Z",
          "slotEnd": "2026-03-01T12:00:00.000Z",
          "slotName_TH": "ช่วงเช้า",
          "slotName_EN": "Morning Session",
          "checkedIn": true,
          "checkInTime": "2026-03-01T08:05:00.000Z",
          "checkedOut": true,
          "checkOutTime": "2026-03-01T12:00:00.000Z",
          "isLate": false,
          "expEarned": 30
        },
        {
          "slotId": 6,
          "slotNumber": 2,
          "slotStart": "2026-03-01T13:00:00.000Z",
          "slotEnd": "2026-03-01T17:00:00.000Z",
          "slotName_TH": "ช่วงบ่าย",
          "slotName_EN": "Afternoon Session",
          "checkedIn": true,
          "checkInTime": "2026-03-01T13:00:00.000Z",
          "checkedOut": true,
          "checkOutTime": "2026-03-01T17:00:00.000Z",
          "isLate": false,
          "expEarned": 30
        }
      ],
      "skills": [
        {
          "skillId": 3,
          "skillName_TH": "การพัฒนาตนเอง",
          "skillName_EN": "Self Development",
          "skillSlug": "self-development",
          "skillIcon": "icon",
          "skillColor": "#4CAF50",
          "mainSkillId": 1,
          "mainSkillName_TH": "ทักษะการพัฒนาตนเอง",
          "mainSkillName_EN": "Personal Development",
          "mainSkillSlug": "personal-development",
          "mainSkillIcon": "icon",
          "mainSkillColor": "#2196F3",
          "levelType": 2,
          "previousLevel": 1,
          "expEarned": 30,
          "expType": "ACTIVITY_COMPLETION",
          "earnedAt": "2026-03-01T17:30:00.000Z"
        }
      ]
    }
  }
}
```

### Error Responses

| Status | Error | Reason |
|---|---|---|
| 400 | `Invalid event ID` | eventId ไม่ใช่ตัวเลข |
| 401 | `No token provided` | ยังไม่ได้ล็อกอิน |
| 403 | `Insufficient permissions` | สิทธิ์ไม่เพียงพอ |
| 404 | `Event not found` | ไม่พบกิจกรรม |
| 404 | `You are not registered for this event` | ยังไม่ได้ลงทะเบียนกิจกรรมนี้ |
| 500 | `Failed to fetch your participation info` | ข้อผิดพลาดฝั่ง Server |

---

## Data Fields Reference

### Participant Object (Staff endpoint)

| Field | Type | Description |
|---|---|---|
| `registrationId` | `number` | ID ของการลงทะเบียน |
| `studentId` | `number` | รหัสนักศึกษา (CMU ID) |
| `firstName` | `string` | ชื่อ |
| `lastName` | `string` | นามสกุล |
| `fullName` | `string` | ชื่อ-นามสกุล |
| `email` | `string` | อีเมล |
| `faculty` | `string` | คณะ |
| `major` | `string` | สาขาวิชา |
| `photo` | `string \| null` | URL รูปโปรไฟล์ |
| `registrationType` | `RegistrationType` | ประเภทการลงทะเบียน |
| `status` | `RegistrationStatus` | สถานะการเข้าร่วม |
| `statusDate` | `datetime` | วันที่อัพเดตสถานะล่าสุด |
| `checkedIn` | `boolean` | เช็คอินแล้วหรือไม่ |
| `checkInTime` | `datetime \| null` | เวลาเช็คอิน |
| `checkedOut` | `boolean` | เช็คเอาท์แล้วหรือไม่ |
| `checkOutTime` | `datetime \| null` | เวลาเช็คเอาท์ |
| `totalExpEarned` | `number` | EXP รวมที่ได้รับจากกิจกรรมนี้ |
| `hasEvaluated` | `boolean` | ทำแบบประเมินแล้วหรือยัง |
| `registeredAt` | `datetime` | วันที่ลงทะเบียน |
| `skills` | `SkillReward[]` | ทักษะที่ได้รับ (หลายอัน) |

### SkillReward Object

| Field | Type | Description |
|---|---|---|
| `skillId` | `number` | ID ของทักษะรอง (SubSkill) |
| `skillName_TH` | `string` | ชื่อทักษะรอง (ภาษาไทย) |
| `skillName_EN` | `string` | ชื่อทักษะรอง (ภาษาอังกฤษ) |
| `skillSlug` | `string` | Slug ของทักษะรอง |
| `skillIcon` | `string \| null` | ไอคอนทักษะรอง |
| `skillColor` | `string \| null` | สีของทักษะรอง |
| `mainSkillId` | `number` | ID ของทักษะหลัก (MainSkill) |
| `mainSkillName_TH` | `string` | ชื่อทักษะหลัก (ภาษาไทย) |
| `mainSkillName_EN` | `string` | ชื่อทักษะหลัก (ภาษาอังกฤษ) |
| `mainSkillSlug` | `string` | Slug ของทักษะหลัก |
| `mainSkillIcon` | `string \| null` | ไอคอนทักษะหลัก |
| `mainSkillColor` | `string \| null` | สีของทักษะหลัก |
| `levelType` | `number \| null` | ระดับทักษะที่ได้รับ (1=I, 2=II, 3=III, 4=IV) |
| `previousLevel` | `number \| null` | ระดับก่อนหน้า |
| `expEarned` | `number` | EXP ที่ได้รับสำหรับทักษะนี้ |
| `expType` | `ExpType` | ประเภทของ EXP |
| `earnedAt` | `datetime` | วันที่ได้รับ EXP |

### RegistrationType Values

| Value | คำอธิบาย |
|---|---|
| `NORMAL` | ลงทะเบียนปกติ |
| `WALK_IN` | Walk-in (เดินเข้ามาหน้างาน) |
| `WAITLIST` | อยู่ในรายการรอ |

### RegistrationStatus Values

| Value | คำอธิบาย |
|---|---|
| `PENDING` | รอดำเนินการ |
| `REGISTERED` | ลงทะเบียนแล้ว รอวันกิจกรรม |
| `ATTENDED` | กำลังเข้าร่วม |
| `COMPLETED` | เสร็จสิ้น (ได้รับ EXP แล้ว) |
| `INCOMPLETE` | ไม่เสร็จสิ้น (ไม่ได้เช็คเอาท์) |
| `CANCELLED` | ยกเลิก |
| `LATE` | มาสาย |
| `LATE_PENALTY` | ถูกหัก EXP เพราะมาสาย |
| `ABSENT` | ขาดกิจกรรม |
| `UNDER_REVIEW` | อยู่ระหว่างการตรวจสอบ |
| `NEED_MORE_INFO` | ต้องการข้อมูลเพิ่มเติม |
| `APPROVED` | ยืนยันคำขอ |
| `REJECTED` | ปฏิเสธคำขอ |

### ExpType Values

| Value | คำอธิบาย |
|---|---|
| `ACTIVITY_COMPLETION` | จากการทำกิจกรรมเสร็จ |
| `BONUS_REWARD` | โบนัสพิเศษ |
| `LATE_PENALTY` | หักเพราะมาสาย |
| `MANUAL_ADJUSTMENT` | ปรับโดย Admin |
| `EVALUATION_BONUS` | โบนัสจากการประเมิน |

---

## Usage Examples

### ดึงรายชื่อหน้าแรก (JSON)

```
GET /api/events/1/participants
```

### ค้นหาชื่อ "ชนาธิป"

```
GET /api/events/1/participants?search=ชนาธิป
```

### ค้นหาด้วยรหัสนักศึกษา

```
GET /api/events/1/participants?search=650612077
```

### กรองเฉพาะผู้เสร็จสมบูรณ์

```
GET /api/events/1/participants?status=COMPLETED
```

### ดาวน์โหลด CSV (ไม่มี pagination — Export ทั้งหมด)

```
GET /api/events/1/participants?format=csv
```

### ดาวน์โหลด Excel

```
GET /api/events/1/participants?format=xlsx
```

### ดาวน์โหลด Excel เฉพาะ COMPLETED

```
GET /api/events/1/participants?format=xlsx&status=COMPLETED
```

### User ดูข้อมูลตัวเอง

```
GET /api/events/1/participants/me
```

---

## Notes

- Export (CSV/XLSX) จะ **ไม่มี pagination** — ดึงข้อมูลทั้งหมดที่ตรงกับ filter มาในไฟล์เดียว
- `skills` คืน array ที่อาจมี **หลายทักษะ** ต่อคน (ขึ้นอยู่กับ `experienceHistory` ของกิจกรรมนั้น)
- ถ้ายังไม่ได้แจก EXP (กิจกรรมยังไม่ COMPLETED) `skills` อาจเป็น array ว่าง `[]`
- `statusDate` คือ `updatedAt` ของ `EventRegistration` — วันที่ล่าสุดที่สถานะเปลี่ยน
- `levelType` ใน SkillReward เป็น `number` (1-4) ตรงกับ `newLevel` ใน `ExperienceHistory`
