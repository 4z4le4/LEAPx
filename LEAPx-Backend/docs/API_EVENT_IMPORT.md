# Event Import API

API สำหรับนำเข้ากิจกรรมพร้อมรายชื่อผู้เข้าร่วมและแจก EXP จากไฟล์ Excel  
ออกแบบมาสำหรับกิจกรรมที่จัดไปแล้ว (ย้อนหลัง) หรือนำเข้าจากระบบภายนอก

---

## Table of Contents

- [Overview — ขั้นตอนการใช้งาน](#overview)
- [GET /api/events/import/template](#get-apieventimporttemplate) — ดาวน์โหลด Excel Template
- [POST /api/events/import/upload](#post-apieventimportupload) — อัพโหลดและนำเข้าข้อมูล
- [Excel Template Structure](#excel-template-structure) — โครงสร้างไฟล์ Excel
- [Notes & Tips](#notes--tips)

---

## Overview

### ขั้นตอนการใช้งาน

```
1. ดาวน์โหลด Template
   GET /api/events/import/template
          ↓
2. กรอกข้อมูล Event + Skills + Participants ใน Excel
          ↓
3. Upload ไฟล์
   POST /api/events/import/upload
          ↓
4. ระบบจะ:
   ✓ สร้าง Event (status = COMPLETED)
   ✓ บันทึก EventSkillReward
   ✓ สร้าง EventRegistration ให้แต่ละคน (status = COMPLETED)
   ✓ แจก EXP + อัพเดต UserSubSkillLevel + UserMainSkillLevel
   ✓ บันทึก ExperienceHistory
```

### สิทธิ์การใช้งาน

| Endpoint | Role ที่จำเป็น |
|---|---|
| GET template | ACTIVITY_ADMIN+ |
| POST upload  | ACTIVITY_ADMIN+ |

---

## GET /api/events/import/template

ดาวน์โหลดไฟล์ Excel template พร้อม:
- ตัวอย่างข้อมูลที่กรอกได้เลย
- รายการทักษะทั้งหมดในระบบ (Sheet ทักษะอ้างอิง)
- คำอธิบายในแต่ละ cell

### Endpoint

```
GET /api/events/import/template
```

### Authorization

```
Cookie: LEAP_AUTH=...
Role: ACTIVITY_ADMIN, SKILL_ADMIN, หรือ SUPREME
```

### Response

ไฟล์ Excel `.xlsx` ที่มี **3 sheets**

| Sheet | ชื่อ | คำอธิบาย |
|---|---|---|
| 1 | ข้อมูลกิจกรรม | กรอกข้อมูลหลักของกิจกรรม + ตารางทักษะ |
| 2 | รายชื่อผู้เข้าร่วม | กรอกรายชื่อนักศึกษาที่เข้าร่วม |
| 3 | ทักษะอ้างอิง | รายการทักษะทั้งหมดพร้อม SubSkill ID (อ่านเท่านั้น) |

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="Event_Import_Template_{timestamp}.xlsx"
```

### Example Request

```bash
curl -X GET \
  'https://api.leapx.com/api/events/import/template' \
  -H 'Cookie: LEAP_AUTH=...' \
  --output Event_Import_Template.xlsx
```

---

## POST /api/events/import/upload

อัพโหลดไฟล์ Excel ที่กรอกแล้ว ระบบจะ:
1. สร้าง Event ในฐานข้อมูล
2. บันทึก Skill Rewards ของกิจกรรม
3. ค้นหา User แต่ละคน (ด้วยรหัสนักศึกษา หรืออีเมลเป็นตัวสำรอง)
4. สร้าง EventRegistration (COMPLETED) + แจก EXP ให้แต่ละ User

### Endpoint

```
POST /api/events/import/upload
Content-Type: multipart/form-data
```

### Authorization

```
Cookie: LEAP_AUTH=...
Role: ACTIVITY_ADMIN, SKILL_ADMIN, หรือ SUPREME
```

### Request Body (form-data)

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `File (.xlsx)` | ✓ | ไฟล์ Excel ที่ดาวน์โหลดจาก template และกรอกข้อมูลแล้ว |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "event": {
      "id": 42,
      "title_TH": "งานพัฒนาตัวเอง CMU 2026",
      "title_EN": "CMU Self-Development 2026",
      "slug": "cmu-self-development-2026-1740805200000",
      "status": "COMPLETED",
      "activityStart": "2026-03-01T01:00:00.000Z",
      "activityEnd": "2026-03-01T10:00:00.000Z"
    },
    "skillRewards": [
      {
        "subSkillId": 3,
        "subSkillName": "ทักษะการพัฒนาตนเอง > การพัฒนาตนเอง",
        "levelType": "I",
        "baseExp": 30,
        "bonusExp": 0,
        "totalExp": 30
      },
      {
        "subSkillId": 7,
        "subSkillName": "ทักษะการสื่อสาร > การสื่อสาร",
        "levelType": "II",
        "baseExp": 20,
        "bonusExp": 10,
        "totalExp": 30
      }
    ],
    "summary": {
      "totalInFile": 85,
      "processed": 82,
      "failed": 3,
      "totalExpPerUser": 60,
      "totalExpDistributed": 4920
    },
    "processed": [
      {
        "rowNum": 3,
        "userId": 650612077,
        "studentId": 650612077,
        "email": "chanathip@cmu.ac.th",
        "firstName": "ชนาธิป",
        "lastName": "มีสุข",
        "expAwarded": 60
      }
    ],
    "failed": [
      {
        "rowNum": 15,
        "studentId": 999999999,
        "email": "unknown@cmu.ac.th",
        "error": "ไม่พบผู้ใช้รหัส 999999999 / อีเมล unknown@cmu.ac.th ในระบบ"
      }
    ]
  }
}
```

### Error Responses

| Status | เหตุการณ์ | ตัวอย่าง error |
|---|---|---|
| 400 | ไม่พบไฟล์ | `"ไม่พบไฟล์ที่อัพโหลด (field name: file)"` |
| 400 | ไฟล์ไม่ใช่ .xlsx | `"รองรับเฉพาะไฟล์ .xlsx เท่านั้น"` |
| 400 | ข้อมูลกิจกรรมไม่ครบ | `{ "error": "ข้อมูลกิจกรรมไม่ครบถ้วน", "details": ["ชื่อกิจกรรม (TH) ว่างเปล่า", ...] }` |
| 400 | ข้อมูลทักษะไม่ถูกต้อง | `{ "error": "ข้อมูลทักษะไม่ถูกต้อง", "details": ["แถว 16: Level ไม่ถูกต้อง ..."] }` |
| 400 | SubSkill ID ไม่มีในระบบ | `{ "error": "SubSkill ID บางอันไม่มีในระบบ", "details": [...] }` |
| 400 | ไม่มีรายชื่อผู้เข้าร่วม | `"ไม่พบรายชื่อผู้เข้าร่วมในชีตที่ 2"` |
| 401 | ไม่ได้ login | - |
| 403 | สิทธิ์ไม่เพียงพอ | - |
| 500 | Server error | `{ "error": "เกิดข้อผิดพลาดในการนำเข้ากิจกรรม", "details": "..." }` |

### Example Request

```bash
curl -X POST \
  'https://api.leapx.com/api/events/import/upload' \
  -H 'Cookie: LEAP_AUTH=...' \
  -F 'file=@Event_Import_Template.xlsx'
```

---

## Excel Template Structure

### Sheet 1: ข้อมูลกิจกรรม

ใช้รูปแบบ **key-value** — คอลัมน์ A = ชื่อฟิลด์, คอลัมน์ B = ค่าที่ต้องกรอก

> ❗ **ห้ามเพิ่ม/ลบแถวในส่วน key-value (แถว 1-11)** เพราะระบบอ่านตาม row number คงที่

#### ส่วน Event Info (แถว 1-11)

| แถว | คอลัมน์ A (label) | คอลัมน์ B (กรอกค่า) | บังคับ |
|---|---|---|---|
| 1 | *(header)* | — | — |
| 2 | ชื่อกิจกรรม (TH) * | เช่น: งานพัฒนาตัวเอง CMU 2026 | ✓ |
| 3 | ชื่อกิจกรรม (EN) * | เช่น: CMU Self-Development 2026 | ✓ |
| 4 | คำอธิบายกิจกรรม (TH) | คำอธิบาย (ถ้าว่างใช้ชื่อกิจกรรมแทน) | |
| 5 | คำอธิบายกิจกรรม (EN) | — | |
| 6 | สถานที่จัดงาน (TH) * | เช่น: ห้อง ENB3306 คณะวิศวกรรมศาสตร์ | ✓ |
| 7 | สถานที่จัดงาน (EN) * | — | ✓ |
| 8 | วันที่เริ่มกิจกรรม * | รูปแบบ: YYYY-MM-DD HH:mm เช่น: 2026-03-01 08:00 | ✓ |
| 9 | วันที่สิ้นสุดกิจกรรม * | รูปแบบ: YYYY-MM-DD HH:mm เช่น: 2026-03-01 17:00 | ✓ |
| 10 | วันที่เริ่มลงทะเบียน | ถ้าว่างจะใช้ค่าเดียวกับวันเริ่มกิจกรรม | |
| 11 | วันที่สิ้นสุดลงทะเบียน | ถ้าว่างจะใช้ค่าเดียวกับวันเริ่มกิจกรรม | |

#### ส่วน Skills Table (แถว 13+)

แถว 14 = headers, แถว 15+ = ข้อมูลทักษะ (เพิ่มแถวได้ ห้ามมีแถวว่างระหว่างกลาง)

| คอลัมน์ | ชื่อ | คำอธิบาย | บังคับ |
|---|---|---|---|
| A | SubSkill ID * | ดูจากชีต "ทักษะอ้างอิง" | ✓ |
| B | ชื่อทักษะ | อ้างอิงเท่านั้น (ห้ามแก้ไข ไม่มีผลต่อการ import) | |
| C | Level * | ต้องเป็น `I`, `II`, `III`, หรือ `IV` เท่านั้น | ✓ |
| D | EXP พื้นฐาน * | ตัวเลขจำนวนเต็ม > 0 | ✓ |
| E | EXP โบนัส | ตัวเลข ≥ 0 (ถ้าว่างหรือ 0 = ไม่มีโบนัส) | |

**ตัวอย่างทักษะหลายอัน:**

| A (SubSkill ID) | B (ชื่ออ้างอิง) | C (Level) | D (EXP พื้นฐาน) | E (EXP โบนัส) |
|---|---|---|---|---|
| 3 | ทักษะการพัฒนาตนเอง > การพัฒนาตนเอง | I | 30 | 0 |
| 7 | ทักษะการสื่อสาร > การสื่อสาร | II | 20 | 10 |
| 12 | ทักษะความเป็นผู้นำ > การทำงานเป็นทีม | I | 15 | 5 |

---

### Sheet 2: รายชื่อผู้เข้าร่วม

แถว 1 = หมายเหตุ, แถว 2 = headers, แถว 3+ = ข้อมูล

| คอลัมน์ | ชื่อ | คำอธิบาย | บังคับ |
|---|---|---|---|
| A | รหัสนักศึกษา * | 9 หลัก เช่น 650612345 (ค้นหาจากฐานข้อมูลก่อน) | ✓* |
| B | อีเมล * | ใช้ค้นหาสำรองถ้ารหัสนักศึกษาไม่เจอ | ✓* |
| C | ชื่อ | อ้างอิงเท่านั้น ไม่บังคับ | |
| D | นามสกุล | อ้างอิงเท่านั้น ไม่บังคับ | |

> ✓* = อย่างน้อยต้องกรอกรหัสนักศึกษา **หรือ** อีเมลที่มีในระบบ

**ตัวอย่าง:**

| รหัสนักศึกษา | อีเมล | ชื่อ | นามสกุล |
|---|---|---|---|
| 650612077 | chanathip@cmu.ac.th | ชนาธิป | มีสุข |
| 650612099 | somsak@cmu.ac.th | สมศักดิ์ | ดีใจ |

---

### Sheet 3: ทักษะอ้างอิง

รายการ SubSkill ทั้งหมดในระบบ ใช้ดู **SubSkill ID** เพื่อกรอกใน Sheet 1

| SubSkill ID | ชื่อทักษะ (TH) | ชื่อทักษะ (EN) | ทักษะหลัก (TH) | ทักษะหลัก (EN) |
|---|---|---|---|---|
| 1 | การคิดเชิงวิพากษ์ | Critical Thinking | ทักษะการคิด | Thinking Skills |
| 2 | ... | ... | ... | ... |

---

## Processing Logic

### การสร้าง Event

- `status` จะถูกตั้งเป็น **COMPLETED** เสมอ (เป็น past event)
- `slug` สร้างอัตโนมัติจาก `title_EN` + timestamp
- `maxParticipants` = จำนวนแถวในชีต 2
- `currentParticipants` = จำนวนที่ process สำเร็จ

### การค้นหาผู้ใช้ (User Resolution)

```
1. ค้นหาจากรหัสนักศึกษา (Student ID = User.id)
   ↓ ถ้าไม่พบ
2. ค้นหาจากอีเมล (User.email)
   ↓ ถ้าไม่พบ
3. บันทึกว่า failed (ไม่หยุด process คนถัดไป)
```

### การแจก EXP

สำหรับแต่ละทักษะที่กรอกใน Sheet 1:
- `expAwarded = baseExp + bonusExp`
- อัพเดต `UserSubSkillLevel` (Level_X_exp, Level_X_stars)
- อัพเดต `UserMainSkillLevel` (maxLevel, averageLevel, totalExp)
- สร้าง `ExperienceHistory` (type = `ACTIVITY_COMPLETION`, activity_id = event.id)

### Partial Success

ระบบประมวลผลแบบ **partial** — ถ้าบางคนในไฟล์ไม่พบในระบบ  
ระบบยังคงประมวลผลคนอื่นต่อ และรายงาน `failed` list กลับมา

---

## Notes & Tips

### วันที่และเวลา

- รูปแบบที่แนะนำ: `YYYY-MM-DD HH:mm` เช่น `2026-03-01 08:00`
- ระบบจะแปลงเป็น UTC+7 (Bangkok) อัตโนมัติ
- ถ้า Excel ฟอร์แมต cell เป็น Date อัตโนมัติก็รองรับได้

### SubSkill ID

- ดูจากชีต **ทักษะอ้างอิง** ในไฟล์ template
- เป็นตัวเลขเท่านั้น ไม่ใช่ชื่อ
- ถ้า ID ไม่ถูกต้อง ระบบจะ reject ทั้งไฟล์ (400 error)

### Level Types

| Level | ความหมาย | EXP threshold |
|---|---|---|
| I | รู้จัก (Familiar) | 8 |
| II | เข้าใจ (Understanding) | 16 |
| III | ใช้เป็น (Proficient) | 32 |
| IV | ผู้นำ (Leading) | 64 |

### สิ่งที่ระบบ **ไม่** ทำ

- ไม่แอพแอตสร้าง CheckInTimeSlot (เพราะกิจกรรมผ่านไปแล้ว)
- ไม่ส่ง notification
- ไม่ตรวจสอบ capacity / year level restriction
- ไม่แจก Special Skill EXP (เฉพาะ SubSkill ปกติ)

---

## Example

### curl ดาวน์โหลด template

```bash
curl -X GET \
  'http://localhost:3000/api/events/import/template' \
  -H 'Cookie: LEAP_AUTH=eyJhbGciOiJIUzI1NiJ9...' \
  --output template.xlsx
```

### curl อัพโหลด

```bash
curl -X POST \
  'http://localhost:3000/api/events/import/upload' \
  -H 'Cookie: LEAP_AUTH=eyJhbGciOiJIUzI1NiJ9...' \
  -F 'file=@template.xlsx'
```

### ตัวอย่าง response สำเร็จ

```json
{
  "success": true,
  "data": {
    "event": {
      "id": 42,
      "title_TH": "งานพัฒนาตัวเอง CMU 2026",
      "title_EN": "CMU Self-Development 2026",
      "slug": "cmu-self-development-2026-1740805200000",
      "status": "COMPLETED",
      "activityStart": "2026-03-01T01:00:00.000Z",
      "activityEnd":   "2026-03-01T10:00:00.000Z"
    },
    "skillRewards": [
      { "subSkillId": 3, "levelType": "I",  "baseExp": 30, "bonusExp": 0,  "totalExp": 30 },
      { "subSkillId": 7, "levelType": "II", "baseExp": 20, "bonusExp": 10, "totalExp": 30 }
    ],
    "summary": {
      "totalInFile":          85,
      "processed":            83,
      "failed":               2,
      "totalExpPerUser":      60,
      "totalExpDistributed":  4980
    },
    "processed": [ ... ],
    "failed": [
      {
        "rowNum": 47,
        "studentId": 999999999,
        "email": "nobody@cmu.ac.th",
        "error": "ไม่พบผู้ใช้รหัส 999999999 / อีเมล nobody@cmu.ac.th ในระบบ"
      }
    ]
  }
}
```
