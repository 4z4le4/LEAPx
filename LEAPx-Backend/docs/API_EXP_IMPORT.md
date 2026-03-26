# EXP Bulk Upload System API

API สำหรับการอัพโหลดประวัติคะแนน (EXP) แบบ bulk ผ่าน Excel สำหรับระบบ LEAP X

## Table of Contents

- [Overview](#overview)
- [GET /api/exp/template](#get-apiexptemplate) - ดาวน์โหลด Excel Template
- [POST /api/exp/upload](#post-apiexpupload) - อัปโหลดและเพิ่มประวัติคะแนน

---

## Overview

ระบบนี้ช่วยให้ผู้ดูแลระบบสามารถเพิ่มประวัติคะแนน (EXP) ให้กับผู้ใช้แบบ bulk ผ่านไฟล์ Excel โดยมีขั้นตอนดังนี้:

1. ดาวน์โหลด Excel Template ที่มีตัวอย่างและคอลัมน์ทักษะทั้งหมด
2. กรอกรหัสนักศึกษา, Email และค่า EXP สำหรับแต่ละทักษะ พร้อมระดับ (Level I-IV)
3. อัปโหลดไฟล์กลับเข้าระบบเพื่อประมวลผลอัตโนมัติ

### Key Features

- สร้าง Excel template โดยอัตโนมัติพร้อมตัวอย่างข้อมูล
- รองรับการให้ EXP ที่ระดับเฉพาะ (Level I, II, III, IV) สำหรับทุกทักษะย่อย
- คำนวณ stars ตามอัตราส่วน EXP/Threshold อัตโนมัติ
- ปลดล็อกระดับทักษะอัตโนมัติเมื่อ star ครบ 5
- ข้ามการให้ EXP ถ้าระดับนั้นยัง lock อยู่ (ไม่ error)
- บันทึก history สำหรับ audit trail
- Validation ครบถ้วน: ตรวจสอบผู้ใช้, ทักษะ และระดับ
- รองรับการประมวลผลแบบ partial (มี error บางรายการยังประมวลผลต่อได้)

---

## GET /api/exp/template

ดาวน์โหลด Excel template สำหรับอัพโหลดประวัติคะแนนพร้อมรายชื่อผู้ใช้ทั้งหมดในระบบ

### Endpoint
```
GET /api/exp/template
```

### Authorization
- Role Required: STAFF, ACTIVITY_ADMIN, SUPREME
- Authentication: Cookie (LEAP_AUTH + LEAP_USER)

### Response Format

ไฟล์ Excel (.xlsx) ที่มี 3 sheets:

#### Sheet 1: Template
- **รหัสนักศึกษา:** รหัสนักศึกษา 9 หลัก (เช่น 650610001)
- **Email:** อีเมลผู้ใช้
- **คอลัมน์ทักษะ:** สำหรับแต่ละ SubSkill จะมี 2 คอลัมน์:
  - **ชื่อทักษะ (TH):** กรอกจำนวน EXP ที่ต้องการให้ (ตัวเลข)
  - **ชื่อทักษะ (TH) - Level:** กรอกระดับเป้าหมาย (I, II, III, หรือ IV)
- **แถวตัวอย่าง:** มี 1 แถวเป็นตัวอย่างการกรอกข้อมูล (650619999)

#### Sheet 2: คำแนะนำ (Instructions)
- วิธีการใช้งาน template
- คำอธิบายรูปแบบข้อมูล
- กฎการ unlock ระดับ (Level I เปิดเสมอ, Level II-IV ต้องครบ 5 ดาวก่อน)
- ตัวอย่างการกรอกข้อมูล

#### Sheet 3: รายการทักษะ (Skills Reference)
- รายการทักษะย่อยทั้งหมดในระบบ
- แสดง Skill ID, ชื่อภาษาไทย, ชื่อภาษาอังกฤษ และหมวดหมู่หลัก

### Response Codes

| Status Code | Description |
|-------------|-------------|
| 200 | ส่งไฟล์ template สำเร็จ |
| 401 | ไม่มีการ authenticate (ไม่ได้ login) |
| 403 | ไม่มีสิทธิ์เข้าถึง (ต้องเป็น Staff ขึ้นไป) |
| 500 | เกิดข้อผิดพลาดในระบบ |

### Response Headers

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="EXP_Upload_Template_{timestamp}.xlsx"
```

### Example Request

```bash
curl -X GET \
  'https://api.leapx.com/api/exp/template' \
  -H 'Cookie: LEAP_AUTH=...; LEAP_USER=...'
```

### Example Template Structure

```
| รหัสนักศึกษา | Email | การคิดเชิงวิเคราะห์ | การคิดเชิงวิเคราะห์ - Level | การสื่อสาร | การสื่อสาร - Level |
|-------------|-------|---------------------|---------------------------|-----------|-------------------|
| 650610001 | student@cmu.ac.th | 50 | II | 30 | I |
| 650610002 | student2@cmu.ac.th | 100 | III | 50 | II |
```

### Notes

- ตารางจะไม่รวมเซลล์ (no merged cells) เพื่อความง่ายในการประมวลผล
- **รหัสนักศึกษา:** ต้องเป็นรหัส 9 หลักและมีอยู่ในระบบ
- **Email:** ใช้สำหรับอ้างอิงและแสดง error
- **ทักษะ columns:** กรอกจำนวน EXP (ตัวเลข >= 0)
- **Level columns:** กรอก I, II, III, หรือ IV (ต้องเป็นระดับที่ unlock แล้ว)
- กรอก 0 หรือเว้นว่างในทักษะ = ไม่ให้คะแนนทักษะนั้น
- ถ้ากรอก Level ที่ยัง lock อยู่ ระบบจะข้าม (ไม่ error)
- ถ้ากรอก Level ที่ครบ 5 ดาวแล้ว ระบบจะข้ามไม่ให้เพิ่ม
- เพิ่มแถวได้ไม่จำกัด (แนะนำไม่เกิน 100 แถวต่อไฟล์เพื่อประสิทธิภาพ)

---

## POST /api/exp/upload

อัปโหลดและประมวลผล Excel file เพื่อเพิ่มประวัติคะแนนแบบ bulk

### Endpoint
```
POST /api/exp/upload
```

### Authorization
- Role Required: STAFF, ACTIVITY_ADMIN, SUPREME
- Authentication: Cookie (LEAP_AUTH + LEAP_USER)

### Request Headers

```
Content-Type: multipart/form-data
```

### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | ไฟล์ Excel (.xlsx) ที่กรอกข้อมูลแล้ว |

### Processing Logic

1. **File Validation**
   - ตรวจสอบว่ามีไฟล์อัปโหลด
   - ตรวจสอบรูปแบบไฟล์เป็น .xlsx

2. **Data Parsing**
   - อ่านข้อมูลจาก sheet แรก
   - Parse header เพื่อหาทักษะและ Level columns
   - อ่านข้อมูล รหัสนักศึกษา, Email, EXP และ Level

3. **User Validation**
   - แปลงรหัสนักศึกษาจาก string เป็น number
   - ตรวจสอบว่า User ID มีอยู่ในระบบ

4. **Skill & Level Validation**
   - ตรวจสอบว่าทักษะย่อยมีอยู่จริง
   - ตรวจสอบว่า Level เป็น I, II, III, หรือ IV

5. **EXP Processing** (สำหรับแต่ละทักษะและระดับ)
   - ดึงข้อมูล UserSubSkillLevel ปัจจุบัน
   - ตรวจสอบว่าระดับนั้นครบ 5 stars หรือยัง (ถ้าครบแล้ว จะข้าม)
   - เพิ่ม EXP ให้กับระดับที่ระบุ:
     - Level_{X}_exp += expAmount
     - คำนวณ stars ใหม่: floor((newExp / threshold) * 5)
     - **บันทึก EXP และ stars แม้ว่า Level จะ lock อยู่**
   - ตรวจสอบการ unlock level ถัดไป:
     - **จะ unlock ก็ต่อเมื่อ:** Level ที่ให้ EXP unlock แล้ว + ครบ 5 ดาว
     - ถ้า Level ยัง lock: บันทึก EXP ไว้ แต่ไม่ unlock level ถัดไป
   - อัปเดต totalExp += expAmount

6. **History Recording**
   - บันทึกลงตาราง ExperienceHistory
   - เก็บ previousExp, newExp, previousLevel, newLevel
   - reason: "นำเข้าจากไฟล์ Excel - Level {X}"
   - type: MANUAL_ADJUSTMENT

### Response (Success)

```json
{
  "success": true,
  "totalUsers": 45,
  "processedUsers": 45,
  "failedUsers": 0,
  "totalExpUpdates": 180,
  "errors": []
}
```

### Response (Partial Success)

```json
{
  "success": true,
  "totalUsers": 45,
  "processedUsers": 43,
  "failedUsers": 2,
  "totalExpUpdates": 170,
  "errors": [
    {
      "row": -1,
      "userId": 650610005,
      "email": "invalid@cmu.ac.th",
      "error": "ไม่พบ User ในระบบ"
    },
    {
      "row": -1,
      "userId": 650610012,
      "email": "notfound@cmu.ac.th",
      "error": "ไม่พบ Event ID 999 ในระบบ"
    }
  ]
}
```

### Response Codes

| Status Code | Description |
|-------------|-------------|
| 200 | นำเข้าข้อมูลสำเร็จ (อาจมี partial errors) |
| 400 | ข้อมูล request ไม่ถูกต้อง หรือไม่มีไฟล์อัปโหลด |
| 401 | ไม่มีการ authenticate |
| 403 | ไม่มีสิทธิ์เข้าถึง |
| 500 | เกิดข้อผิดพลาดในระบบ |

### Error Response

```json
{
  "error": "ไม่พบไฟล์ Excel หรือรูปแบบไม่ถูกต้อง",
  "details": "Please upload a valid .xlsx file"
}
```

### Example Request (cURL)

```bash
curl -X POST \
  'https://api.leapx.com/api/exp/upload' \
  -H 'Cookie: LEAP_AUTH=...; LEAP_USER=...' \
  -F 'file=@/path/to/filled_template.xlsx'
```

### Example Request (JavaScript/FormData)

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/exp/upload', {
  method: 'POST',
  credentials: 'include',
  body: formData
});

const result = await response.json();
console.log(result);
```

### Data Processing Flow Diagram

```
1. อัปโหลดไฟล์
   ↓
2. Parse Excel → ดึงข้อมูล User, Event ID (optional), Skill/Level/EXP
   ↓
3. Validate Users → ตรวจสอบว่า User มีอยู่ในระบบ
   ↓
4. Validate Events (ถ้ามี Event ID) → ตรวจสอบว่า Event มีอยู่จริง
   ↓
5. สำหรับแต่ละ (User, Skill, Level, EXP):
   a. ดึง threshold ของระดับ
   b. ตรวจสอบว่าระดับนี้ unlock แล้วหรือยัง
   c. กระจาย EXP และคำนวณ stars
   d. อัปเดต UserSubSkillLevel
   e. บันทึก ExperienceHistory พร้อม Event ID (ถ้ามี)
   ↓
6. Return summary พร้อมจำนวนที่ประมวลผลสำเร็จ
```

### Validation Rules

#### File Validation
- ไฟล์ต้องเป็นนามสกุล .xlsx เท่านั้น
- ต้องมี sheet อย่างน้อย 1 sheet
- Sheet แรกต้องมีข้อมูล

#### User Validation
- รหัสนักศึกษา ต้องเป็นตัวเลข 9 หลัก
- User ต้องมีอยู่ในระบบ (ตาราง User)

#### Skill Validation
- SubSkill ต้องมีอยู่ในระบบ (ตาราง SubSkillCategory)
- ชื่อทักษะจะถูกใช้เพื่อหา SubSkill ID (รองรับทั้งภาษาไทยและอังกฤษ)

#### Level Validation
- Level ต้องเป็น I, II, III, หรือ IV เท่านั้น (case-insensitive)
- **สามารถให้ EXP ได้แม้ Level จะ lock อยู่**:
  - ระบบจะบันทึก EXP และคำนวณ stars ไว้
  - แต่จะไม่ unlock level ถัดไปจนกว่า Level นั้นจะถูก unlock
  - Level unlock rules:
    - Level I: unlock อัตโนมัติ
    - Level II: unlock เมื่อครบ 5 ดาวใน Level I
    - Level III: unlock เมื่อครบ 5 ดาวใน Level II
    - Level IV: unlock เมื่อครบ 5 ดาวใน Level III

#### EXP Validation
- ค่า EXP ต้องเป็นตัวเลข >= 0
- ถ้าเป็น 0 หรือเว้นว่าง จะ skip ไม่ประมวลผล
- ถ้า Level นั้นครบ 5 ดาวแล้ว → ระบบจะข้าม (skip) ไม่ error

### EXP Distribution Algorithm

```typescript
// สำหรับแต่ละระดับที่ต้องการให้ EXP
const levelMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };
const targetLevelNum = levelMap[levelType];

// ตรวจสอบว่าครบ 5 stars แล้วหรือยัง
const currentStars = userSkillData[`Level_${levelType}_stars`];
if (currentStars >= 5) {
  // ครบ 5 stars แล้ว → ข้าม (ไม่ต้องเพิ่มอีก)
  console.warn(`Level ${levelType} already has 5 stars`);
  return;
}

// เพิ่ม EXP และคำนวณ stars ใหม่ (แม้ว่า Level จะ lock อยู่)
const threshold = getThreshold(levelType);
const currentLevelExp = userSkillData[`Level_${levelType}_exp`];
const newLevelExp = currentLevelExp + expAmount;
const newStars = Math.min(5, Math.floor((newLevelExp / threshold) * 5));

// อัปเดตค่า
Level_{X}_exp = newLevelExp;
Level_{X}_stars = newStars;
totalExp += expAmount;

// ตรวจสอบว่าต้อง unlock level ถัดไปหรือไม่
// เงื่อนไข: Level ที่ให้ EXP ต้อง unlock แล้ว + ครบ 5 ดาว + ไม่ใช่ Level IV
const isLevelUnlocked = currentLevel >= targetLevelNum;
if (isLevelUnlocked && newStars >= 5 && targetLevelNum < 4) {
  currentLevel = Math.max(currentLevel, targetLevelNum + 1);
}
```

### Thresholds

| Level | Threshold (EXP per star) |
|-------|-------------------------|
| I     | 8                       |
| II    | 16                      |
| III   | 32                      |
| IV    | 64                      |

**ตัวอย่าง:**
- Level I: 0-7 EXP = 0 ดาว, 8-15 = 1 ดาว, ..., 40+ = 5 ดาว
- Level II: 0-15 EXP = 0 ดาว, 16-31 = 1 ดาว, ..., 80+ = 5 ดาว

### Important Notes

1. **EXP Distribution**
   - EXP จะถูกเพิ่มเข้าไปใน Level ที่ระบุเท่านั้น
   - **บันทึก EXP และ stars แม้ว่า Level จะ lock อยู่** (เพื่อเก็บไว้รอ unlock)
   - ถ้าระดับครบ 5 ดาวแล้ว จะข้าม (skip) และไม่ error
   - totalExp จะเพิ่มขึ้นทุกครั้งที่ให้ EXP สำเร็จ

2. **Level Unlock**
   - Level I: ปลดล็อกอัตโนมัติเมื่อสร้าง UserSubSkillLevel
   - Level II-IV: ปลดล็อกเมื่อระดับก่อนหน้าได้ 5 stars
   - การ unlock จะอัปเดต `currentLevel` field

3. **Stars System**
   - แต่ละระดับมี threshold ของตัวเอง
   - คำนวณ stars จากสูตร: floor((currentExp / threshold) * 5)
   - สูงสุดที่ 5 stars ต่อระดับ
   - ครบ 5 stars → อัตโนมัติ unlock ระดับถัดไป

4. **History**
   - บันทึกทุกครั้งที่เพิ่ม EXP สำเร็จ
   - เก็บค่า before/after: level, exp
   - type = 'MANUAL_ADJUSTMENT'
   - activity_id = null (ไม่ผูกกิจกรรม)
   - reason = "นำเข้าจากไฟล์ Excel - Level {X}"

5. **Performance**
   - การอัปโหลดใช้เวลาขึ้นกับจำนวนผู้ใช้และทักษะ
   - ประมวลผลแบบ sequential (ไม่ใช่ parallel) เพื่อความปลอดภัยของข้อมูล
   - ถ้ามีผู้ใช้จำนวนมาก (>100) แนะนำให้แบ่งเป็นหลายไฟล์

6. **Error Handling**
   - ถ้ามี error บางรายการ ระบบจะประมวลผลรายการอื่นต่อ
   - จะ return รายละเอียด error ใน response
   - ไม่มี rollback - รายการที่ประมวลผลสำเร็จจะถูกบันทึกลง database

### Security Considerations

- ใช้ withActivityAdminAuth middleware เพื่อตรวจสอบสิทธิ์
- Validate ทุก input จากไฟล์ Excel ก่อนประมวลผล
- ไม่อนุญาตให้ใส่ค่า EXP เป็นลบ
- ตรวจสอบว่า User และ Event (ถ้ามี) มีอยู่จริงในระบบ
- ตรวจสอบว่าทักษะมีอยู่ในระบบก่อนประมวลผล

---

## Use Cases & Examples

### Use Case 1: ให้คะแนนระดับต่างๆ

**สถานการณ์:** ต้องการให้ EXP แก่นักศึกษาในระดับที่เหมาะสม

**Excel:**
```
รหัสนักศึกษา | Email | การคิดเชิงวิเคราะห์ | การคิดเชิงวิเคราะห์ - Level | การสื่อสาร | การสื่อสาร - Level
650610001 | student@cmu.ac.th | 50 | II | 30 | I
650610002 | student2@cmu.ac.th | 100 | III | 50 | II
```

**Result:**
- student@cmu.ac.th: +50 EXP ที่ Level II (การคิดเชิงวิเคราะห์), +30 EXP ที่ Level I (การสื่อสาร)
- student2@cmu.ac.th: +100 EXP ที่ Level III (การคิดเชิงวิเคราะห์), +50 EXP ที่ Level II (การสื่อสาร)
- History: "นำเข้าจากไฟล์ Excel - Level {X}"

---

### Use Case 2: บันทึก EXP แม้ Level ยัง lock

**สถานการณ์:** ต้องการให้ EXP ที่ Level ที่ยังไม่ unlock (มีการวางแผนล่วงหน้า)

**Excel:**
```
รหัสนักศึกษา | Email | การทำงานเป็นทีม | การทำงานเป็นทีม - Level
650610005 | newbie@cmu.ac.th | 80 | III
```

**Scenario Details:**
- นักศึกษา 650610005 มี currentLevel = 2 (Level III ยัง lock)

**Result:**
- Level_III_exp = 80 ✅ (บันทึกไว้)
- Level_III_stars = คำนวณตามปกติ (80/32 * 5 = 12.5 → 5 stars) ✅
- currentLevel = 2 ✅ (ยังคงเท่าเดิม ไม่ unlock Level IV เพราะ Level III ยัง lock)
- processedUsers: 1, totalExpUpdates: 1
- **ข้อดี:** พอ Level II ครบ 5 ดาว → Level III unlock → จะมี 80 EXP (5 ดาว) รออยู่แล้ว!

---

### Use Case 3: ข้าม Level ที่ครบ 5 ดาว

**สถานการณ์:** Level นั้นครบ 5 ดาวแล้ว

**Excel:**
```
รหัสนักศึกษา | Email | ความคิดสร้างสรรค์ | ความคิดสร้างสรรค์ - Level
650610003 | expert@cmu.ac.th | 50 | I
```

**Scenario Details:**
- นักศึกษา 650610003 มี Level_I_stars = 5 แล้ว

**Result:**
- ระบบจะ skip (ไม่เพิ่ม EXP เพราะครบแล้ว)
- Console warning: "Level I already has 5 stars"

---

### Use Case 4: Auto-unlock Level ถัดไป

**สถานการณ์:** ให้ EXP จนครบ 5 ดาว จะ unlock level ถัดไปอัตโนมัติ

**Excel:**
```
รหัสนักศึกษา | Email | การแก้ปัญหา | การแก้ปัญหา - Level
650610004 | rising@cmu.ac.th | 20 | II
```

**Scenario Details:**
- ก่อนหน้านี้: Level_II_exp = 60, Level_II_stars = 3
- Threshold Level II = 16
- After: Level_II_exp = 80, Level_II_stars = 5 (80/16 * 5 = 25 → max 5)

**Result:**
- Level_II_stars = 5
- currentLevel อัปเดตเป็น 3 (unlock Level III อัตโนมัติ)
- History บันทึก: previousLevel = 2, newLevel = 3

---

## Related APIs

- [Skills & EXP API](./API_SKILLS_EXP.md) - ระบบทักษะและประสบการณ์
- [Events API](./API_EVENTS.md) - การจัดการกิจกรรม
- [User API](./API_USER.md) - การจัดการผู้ใช้

---

## Changelog

### Version 2.0.0 (February 2026)
- **Breaking Changes:**
  - เปลี่ยนรูปแบบ template จาก User ID / First Name / Last Name เป็น รหัสนักศึกษา / Email เท่านั้น
  - เปลี่ยนจาก 4 columns ต่อทักษะ (Level I-IV แยกกัน) เป็น 2 columns (ทักษะ + Level)
  - ลบ Event ID และ Reason TH/EN columns ออก (ไม่รองรับการผูกกิจกรรม)
- **Features:**
  - ให้ระบุ Level เป้าหมาย (I, II, III, IV) สำหรับแต่ละทักษะ
  - ข้าม (skip) อัตโนมัติถ้า Level ยัง lock หรือครบ 5 ดาว
  - Template มีตัวอย่างข้อมูล 1 แถว แทนรายชื่อผู้ใช้ทั้งหมด
  - คำแนะนำชัดเจนขึ้นพร้อมตัวอย่างการกรอก
- **Performance:**
  - ลดขนาดไฟล์ template (มีแค่ตัวอย่าง 1 แถว)
  - เพิ่มความเร็วในการ parse (columns น้อยลง)

### Version 1.1.0 (February 2026)
- แยก API ออกจาก Event-specific endpoints
- เพิ่มความสามารถ optional Event ID binding
- รองรับ custom reason (TH/EN)
- ปรับปรุง template ให้มีผู้ใช้ทั้งหมดในระบบ
- เพิ่ม use cases และตัวอย่างการใช้งาน

### Version 1.0.0 (2024)
- เพิ่มระบบนำเข้า EXP ผ่าน Excel
- รองรับการให้ EXP แยกตามระดับ (Level I-IV)
- Auto-unlock levels เมื่อครบ stars
- บันทึก history สำหรับ audit trail
