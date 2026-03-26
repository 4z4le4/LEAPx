# Experience & Skills Management API

API สำหรับการจัดการระบบประสบการณ์และทักษะของผู้ใช้ในระบบ LEAP

## Table of Contents

### System Overview
- [4-Level System Architecture](#4-level-system-architecture)
- [Progressive Unlock Mechanism](#progressive-unlock-mechanism)
- [Stored EXP Concept](#stored-exp-concept)
- [Star Calculation](#star-calculation)
- [Main Skill Aggregation](#main-skill-aggregation)
- [Special Skills Tier System](#special-skills-tier-system)
- [Level Thresholds](#level-thresholds)

### Main Skill & Sub Skill APIs
- [POST /api/exp](#post-apiexp) - เพิ่ม EXP ให้ Sub Skill
- [GET /api/exp](#get-apiexp) - ดึงข้อมูล Skill Levels ของผู้ใช้
- [GET /api/exp/lv](#get-apiexplv) - ดึงข้อมูล Skill Levels แบบละเอียด
- [POST /api/exp/reset](#post-apiexpreset) - รีเซ็ต Skill Levels (Admin)
- [GET /api/skills](#get-apiskills) - ดึงข้อมูล Skills ทั้งหมด
- [GET /api/skills/LevelThreshold](#get-apiskillslevelthreshold) - ดึงข้อมูล Level Thresholds

### Special Skills APIs
- [POST /api/exp/special](#post-apiexpspecial) - เพิ่ม EXP ให้ Special Skill
- [GET /api/exp/special](#get-apiexpspecial) - ดึงข้อมูล Special Skill Levels
- [POST /api/exp/special/reset](#post-apiexpspecialreset) - รีเซ็ต Special Skill Level (Admin)
- [GET /api/skills/special_skills](#get-apiskillsspecial_skills) - ดึงข้อมูล Special Skills ทั้งหมด

---

## System Overview

### 4-Level System Architecture

ระบบ LEAP ใช้โครงสร้าง 4 ระดับสำหรับการพัฒนาทักษะ (Sub Skills) แต่ละระดับมีความยากและ EXP ที่ต้องการแตกต่างกัน

#### Level Structure

| Level | Name | Default Threshold | Stars Calculation | Unlock Requirement |
|-------|------|-------------------|-------------------|-------------------|
| I | Beginner | 8 EXP | 1 star every 8 EXP | ปลดล็อคทันที |
| II | Intermediate | 16 EXP | 1 star every 16 EXP | ต้องมี Level I อย่างน้อย 1 ดาว |
| III | Advanced | 32 EXP | 1 star every 32 EXP | ต้องมี Level II อย่างน้อย 1 ดาว |
| IV | Expert | 64 EXP | 1 star every 64 EXP | ต้องมี Level III อย่างน้อย 1 ดาว |

#### Key Concepts

**Current Level**: ระดับสูงสุดที่ผู้ใช้มีดาวอยู่ (0-4)
- Current Level 0: ยังไม่มีดาวเลย
- Current Level 1: มีดาว Level I อย่างน้อย 1 ดาว
- Current Level 2: มีดาว Level II อย่างน้อย 1 ดาว
- Current Level 3: มีดาว Level III อย่างน้อย 1 ดาว
- Current Level 4: มีดาว Level IV อย่างน้อย 1 ดาว

**Max Level**: ระดับที่สูงที่สุดที่ผู้ใช้เคยได้ดาว (เหมือนกับ Current Level ในระบบปัจจุบัน)

**Total EXP**: EXP รวมทั้งหมดที่ได้รับใน Sub Skill นั้น

**Total Stars**: จำนวนดาวรวมทั้งหมดจากทุกระดับ

---

### Progressive Unlock Mechanism

ระบบ Progressive Unlock ช่วยให้ผู้ใช้ต้องเรียนรู้และพัฒนาทักษะอย่างเป็นขั้นตอน

#### Unlock Flow

```
Level I (Unlocked by default)
    |
    | Get 1+ stars in Level I
    v
Level II (Unlocked)
    |
    | Get 1+ stars in Level II
    v
Level III (Unlocked)
    |
    | Get 1+ stars in Level III
    v
Level IV (Unlocked)
```

#### Unlock Logic

1. **Level I**: ปลดล็อคโดยอัตโนมัติ - เริ่มเก็บ EXP และได้ดาวทันที
2. **Level II**: ต้องมี Level I อย่างน้อย 1 ดาวก่อน
3. **Level III**: ต้องมี Level II อย่างน้อย 1 ดาวก่อน
4. **Level IV**: ต้องมี Level III อย่างน้อย 1 ดาวก่อน

#### Example Progression

```
User starts: Level I = 0 exp, 0 stars (Unlocked)

Add 20 EXP to Level I:
  Level I = 20 exp, 2 stars (20/8 = 2 stars)
  Level II = Unlocked! (because Level I has 1+ stars)

Add 50 EXP to Level II (before unlocking):
  Level II = 50 exp, 0 stars (Locked - stored)
  
After Level I gets 1 star:
  Level II = 50 exp, 3 stars (50/16 = 3 stars) - Unlocked!
  Level III = Unlocked!
```

---

### Stored EXP Concept

EXP ที่ได้รับจะถูก **เก็บสะสมไว้เสมอ** แม้ว่า Level นั้นจะยังไม่ได้ปลดล็อค

#### Key Principles

1. **EXP เพิ่มเสมอ**: เมื่อได้รับ EXP จะถูกเพิ่มเข้า Level นั้นทันที ไม่ว่าจะปลดล็อคหรือยัง
2. **ดาวขึ้นเมื่อปลดล็อค**: ดาวจะถูกคำนวณและแสดงผลเฉพาะเมื่อ Level นั้นถูกปลดล็อคแล้ว
3. **Instant Stars**: เมื่อปลดล็อค Level ใหม่ ดาวจะถูกคำนวณจาก EXP ที่สะสมไว้ทันที

#### Example Scenario

```
Initial State:
  Level II: 0 exp, 0 stars (Locked - Level I has no stars)

Receive 100 EXP for Level II:
  Level II: 100 exp, 0 stars (Locked - EXP stored)
  Message: "ต้องมี Level I อย่างน้อย 1 ดาวก่อน"
  Message: "เมื่อปลดล็อค จะได้ 6 ดาวทันที" (100/16 = 6 stars)

After Level I gets 1 star:
  Level II: 100 exp, 6 stars (Unlocked!)
  Message: "Level II ปลดล็อคแล้ว! ได้ดาวทันที 6 ดาว"
```

#### Benefits

- ไม่เสีย EXP ที่ได้รับก่อนปลดล็อค
- สร้างแรงจูงใจให้ปลดล็อค Level ก่อนหน้า
- ระบบโปร่งใส - ผู้ใช้เห็นว่ามี EXP เท่าไรรออยู่

---

### Star Calculation

ดาวคือหน่วยวัดความก้าวหน้าในแต่ละ Level โดยคำนวณจาก EXP ที่สะสม

#### Formula

```
Stars = floor(EXP / Threshold)
```

**เฉพาะเมื่อ Level ถูกปลดล็อคแล้ว**

#### Examples

**Level I (Threshold: 8):**
```
0 EXP   = 0 stars
7 EXP   = 0 stars
8 EXP   = 1 star
15 EXP  = 1 star
16 EXP  = 2 stars
24 EXP  = 3 stars
```

**Level II (Threshold: 16):**
```
0 EXP   = 0 stars
15 EXP  = 0 stars
16 EXP  = 1 star
32 EXP  = 2 stars
48 EXP  = 3 stars
```

**Level III (Threshold: 32):**
```
0 EXP   = 0 stars
31 EXP  = 0 stars
32 EXP  = 1 star
64 EXP  = 2 stars
96 EXP  = 3 stars
```

**Level IV (Threshold: 64):**
```
0 EXP    = 0 stars
63 EXP   = 0 stars
64 EXP   = 1 star
128 EXP  = 2 stars
```

#### Progress Calculation

```
Progress in current star = EXP % Threshold
EXP to next star = Threshold - (EXP % Threshold)
```

**Example:**
```
Level II: 50 EXP (Threshold: 16)
Stars: floor(50/16) = 3 stars
Progress: 50 % 16 = 2 EXP (towards 4th star)
Remaining: 16 - 2 = 14 EXP needed for next star
```

---

### Main Skill Aggregation

Main Skills เป็นการรวมกลุ่มของ Sub Skills โดยระบบจะคำนวณสถิติโดยอัตโนมัติจาก Sub Skills ภายใต้ Main Skill นั้น

#### Aggregated Statistics

**Max Level**: ระดับสูงสุดของ Sub Skill ใดๆ ใน Main Skill
```
maxLevel = MAX(subSkill1.maxLevel, subSkill2.maxLevel, ...)
```

**Average Level**: ค่าเฉลี่ยของระดับทุก Sub Skill
```
averageLevel = SUM(all subSkill maxLevels) / COUNT(subSkills)
```

**Total EXP**: EXP รวมทั้งหมดจากทุก Sub Skill
```
totalExp = SUM(all subSkill.totalExp)
```

**Total Stars**: ดาวรวมทั้งหมดจากทุก Level ของทุก Sub Skill
```
totalStars = SUM(all subSkill.totalStars)
```

**Level Breakdown**: นับจำนวน Sub Skills ที่มีดาวในแต่ละ Level
```
Level_I_count: จำนวน Sub Skills ที่มีดาว Level I
Level_II_count: จำนวน Sub Skills ที่มีดาว Level II
Level_III_count: จำนวน Sub Skills ที่มีดาว Level III
Level_IV_count: จำนวน Sub Skills ที่มีดาว Level IV
```

**Completion Statistics**:
```
totalSubSkills: จำนวน Sub Skills ทั้งหมด
completedSubSkills: จำนวน Sub Skills ที่มี EXP > 0
completionPercentage: (completedSubSkills / totalSubSkills) * 100
```

#### Example

```
Main Skill: "Programming"
  Sub Skill 1: "Python" - Level 3, 200 EXP, 10 stars
  Sub Skill 2: "JavaScript" - Level 2, 100 EXP, 5 stars
  Sub Skill 3: "Java" - Level 0, 0 EXP, 0 stars

Aggregated:
  maxLevel: 3
  averageLevel: (3+2+0)/3 = 1.67
  totalExp: 300
  totalStars: 15
  totalSubSkills: 3
  completedSubSkills: 2
  completionPercentage: 66.7%
  levelBreakdown: {
    Level_I: 2,
    Level_II: 2,
    Level_III: 1,
    Level_IV: 0
  }
```

---

### Special Skills Tier System

Special Skills ใช้ระบบ **Tier** แทนระบบ 4-Level โดย Tier สามารถเป็นบวกหรือลบได้

#### Tier System Architecture

**Tier Calculation**:
```
Tier = floor(currentExp / expPerTier)
```

**Default Configuration**:
- `expPerTier`: 10 EXP per tier
- `allowNegative`: true (อนุญาตให้ EXP เป็นลบได้)

#### Positive Tiers (EXP >= 0)

```
Tier 0: 0-9 EXP
Tier 1: 10-19 EXP
Tier 2: 20-29 EXP
Tier 3: 30-39 EXP
...
Tier N: (N*10) to (N*10+9) EXP
```

#### Negative Tiers (EXP < 0)

```
Tier -1: -1 to -10 EXP
Tier -2: -11 to -20 EXP
Tier -3: -21 to -30 EXP
...
Tier -N: (-(N*10)+1) to -(N*10) EXP
```

#### Special Skill Categories

```
DISCIPLINE: ทักษะด้านวินัย (เช่น การมาตรงเวลา)
LEADERSHIP: ทักษะด้านความเป็นผู้นำ
RESPONSIBILITY: ทักษะด้านความรับผิดชอบ
PROACTIVE: ทักษะด้านความกระตือรือร้น
```

#### Tier Progress

```
tierProgress: EXP % expPerTier
tierProgressPercentage: (tierProgress / expPerTier) * 100
expToNextTier: expPerTier - tierProgress
```

**Example**:
```
Current EXP: 45
expPerTier: 10

Tier: floor(45/10) = 4
Progress: 45 % 10 = 5 (towards Tier 5)
Percentage: (5/10)*100 = 50%
To Next: 10 - 5 = 5 EXP needed
```

#### Action Types

Special Skills รองรับการปรับเปลี่ยน EXP แบบหลากหลาย:

```
EVENT_REWARD: รางวัลจากกิจกรรม (+)
BONUS: โบนัสพิเศษ (+)
DISCIPLINE_PENALTY: โทษจากการละเมิดวินัย (-)
LATE_PENALTY: โทษจากการมาสาย (-)
ABSENCE_PENALTY: โทษจากการขาดกิจกรรม (-)
MANUAL_ADJUSTMENT: ปรับแก้โดย Admin (+/-)
OTHER: อื่นๆ (+/-)
```

#### Statistics Tracking

- `positiveActions`: จำนวนครั้งที่ได้รับ EXP บวก
- `negativeActions`: จำนวนครั้งที่ถูกหัก EXP
- `maxLevelReached`: Tier สูงสุดที่เคยถึง (บันทึกไว้แม้ถูกหักลง)
- `reachedMaxAt`: วันที่ถึง Tier สูงสุด

---

### Level Thresholds

Level Thresholds กำหนดจำนวน EXP ที่ต้องการเพื่อได้ 1 ดาวในแต่ละ Level

#### Default Thresholds

| Level | Type | EXP Required | Name (TH) | Name (EN) |
|-------|------|--------------|-----------|-----------|
| I | Beginner | 8 | ระดับเริ่มต้น | Beginner |
| II | Intermediate | 16 | ระดับกลาง | Intermediate |
| III | Advanced | 32 | ระดับสูง | Advanced |
| IV | Expert | 64 | ระดับผู้เชี่ยวชาญ | Expert |

#### Customization

Thresholds สามารถปรับเปลี่ยนได้ผ่าน database (table: `LevelThreshold`) โดย:
- ผู้ดูแลระบบสามารถปรับค่า thresholds ให้เหมาะสมกับองค์กร
- การเปลี่ยนแปลงจะมีผลทันทีกับการคำนวณดาวใหม่
- ดาวที่ได้ไว้แล้วจะไม่เปลี่ยนแปลง

#### Impact on Skills

เมื่อ threshold เปลี่ยน:
1. EXP ที่มีอยู่ไม่เปลี่ยนแปลง
2. ดาวคำนวณใหม่ตาม threshold ใหม่
3. การได้ดาวใหม่ใช้ threshold ใหม่

**Example**:
```
Original: Level II threshold = 16
User has: 48 EXP, 3 stars

Changed to: Level II threshold = 12
User now has: 48 EXP, 4 stars (48/12 = 4)
```

---

## POST /api/exp

เพิ่ม EXP ให้กับ Sub Skill ของผู้ใช้ในระดับที่ระบุ

### Endpoint
```
POST /api/exp
```

### Authentication
Required - SKILL_ADMIN or SUPREME role

### Request Body

```json
{
  "user_id": 123,
  "subSkillCategory_id": 5,
  "levelType": "II",
  "exp": 20,
  "reason_TH": "เข้าร่วม Workshop JavaScript",
  "reason_EN": "Attended JavaScript Workshop",
  "type": "ACTIVITY_COMPLETION"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | number | Yes | ID ของผู้ใช้ |
| subSkillCategory_id | number | Yes | ID ของ Sub Skill |
| levelType | string | Yes | ระดับที่ต้องการเพิ่ม EXP (I, II, III, IV) |
| exp | number | Yes | จำนวน EXP ที่ต้องการเพิ่ม (ต้องไม่เป็น 0) |
| reason_TH | string | No | เหตุผลภาษาไทย |
| reason_EN | string | No | เหตุผลภาษาอังกฤษ |
| type | string | Yes | ประเภทการเพิ่ม EXP |

**Type Values**:
- `ACTIVITY_COMPLETION`: เสร็จสิ้นกิจกรรม
- `BONUS_REWARD`: รางวัลโบนัส
- `MANUAL_ADJUSTMENT`: ปรับแก้โดย Admin

### Response

#### Success (200 OK)

**กรณีปกติ - ได้ดาวใหม่**:
```json
{
  "success": true,
  "message": "Level II: +1 ⭐",
  "data": {
    "name_TH": "JavaScript",
    "name_EN": "JavaScript",
    "updatedLevel": {
      "id": 45,
      "user_id": 123,
      "subSkillCategory_id": 5,
      "currentLevel": 2,
      "totalExp": 120,
      "Level_I_exp": 24,
      "Level_I_stars": 3,
      "Level_II_exp": 36,
      "Level_II_stars": 2,
      "Level_III_exp": 0,
      "Level_III_stars": 0,
      "Level_IV_exp": 0,
      "Level_IV_stars": 0
    },
    "levelUps": {
      "Level_I": false,
      "Level_II": true,
      "Level_III": false,
      "Level_IV": false
    },
    "starsGained": {
      "Level_I": 0,
      "Level_II": 1,
      "Level_III": 0,
      "Level_IV": 0
    },
    "distributionLog": [
      "Level II: ได้รับ 20 EXP (ปลดล็อคแล้ว)",
      "EXP: 16 → 36 (4/16)",
      "⭐ ได้ดาว 1 ดาว! (รวม 2 ดาว)"
    ],
    "distributionLog_EN": [
      "Level II: Received 20 EXP (Unlocked)",
      "EXP: 16 → 36 (4/16)",
      "⭐ Gained 1 star(s)! (Total: 2)"
    ],
    "hasUnlocks": false,
    "expToNextStar": {
      "Level_I": 0,
      "Level_II": 12,
      "Level_III": 32,
      "Level_IV": 64
    }
  }
}
```

**กรณีปลดล็อค Level ใหม่**:
```json
{
  "success": true,
  "message": "ปลดล็อค Level ใหม่! Level II: +3 ⭐",
  "data": {
    "name_TH": "Python",
    "name_EN": "Python",
    "updatedLevel": {
      "id": 46,
      "user_id": 123,
      "subSkillCategory_id": 3,
      "currentLevel": 2,
      "totalExp": 72,
      "Level_I_exp": 24,
      "Level_I_stars": 3,
      "Level_II_exp": 48,
      "Level_II_stars": 3,
      "Level_III_exp": 0,
      "Level_III_stars": 0,
      "Level_IV_exp": 0,
      "Level_IV_stars": 0
    },
    "levelUps": {
      "Level_I": false,
      "Level_II": true,
      "Level_III": false,
      "Level_IV": false
    },
    "starsGained": {
      "Level_I": 0,
      "Level_II": 3,
      "Level_III": 0,
      "Level_IV": 0
    },
    "distributionLog": [
      "Level I: ได้รับ 16 EXP (ปลดล็อคแล้ว)",
      "EXP: 8 → 24 (0/8)",
      "⭐ ได้ดาว 2 ดาว! (รวม 3 ดาว)"
    ],
    "distributionLog_EN": [
      "Level I: Received 16 EXP (Unlocked)",
      "EXP: 8 → 24 (0/8)",
      "⭐ Gained 2 star(s)! (Total: 3)"
    ],
    "hasUnlocks": true,
    "expToNextStar": {
      "Level_I": 8,
      "Level_II": 0,
      "Level_III": 32,
      "Level_IV": 64
    }
  }
}
```

**กรณี EXP ถูกเก็บไว้ (Level ยังไม่ปลดล็อค)**:
```json
{
  "success": true,
  "message": "EXP ถูกบันทึกแล้ว",
  "data": {
    "name_TH": "React",
    "name_EN": "React",
    "updatedLevel": {
      "id": 47,
      "user_id": 123,
      "subSkillCategory_id": 8,
      "currentLevel": 0,
      "totalExp": 50,
      "Level_I_exp": 0,
      "Level_I_stars": 0,
      "Level_II_exp": 50,
      "Level_II_stars": 0,
      "Level_III_exp": 0,
      "Level_III_stars": 0,
      "Level_IV_exp": 0,
      "Level_IV_stars": 0
    },
    "levelUps": {
      "Level_I": false,
      "Level_II": false,
      "Level_III": false,
      "Level_IV": false
    },
    "starsGained": {
      "Level_I": 0,
      "Level_II": 0,
      "Level_III": 0,
      "Level_IV": 0
    },
    "distributionLog": [
      "Level II: ได้รับ 50 EXP (ยังไม่ปลดล็อค)",
      "EXP: 0 → 50 (เก็บสะสมไว้)",
      "ต้องมี Level I อย่างน้อย 1 ดาวก่อน",
      "เมื่อปลดล็อค จะได้ 3 ดาวทันที"
    ],
    "distributionLog_EN": [
      "Level II: Received 50 EXP (Locked)",
      "EXP: 0 → 50 (Stored)",
      "Requires Level I to have at least 1 star",
      "Will get 3 star(s) when unlocked"
    ],
    "hasUnlocks": false,
    "expToNextStar": {
      "Level_I": 8,
      "Level_II": 14,
      "Level_III": 32,
      "Level_IV": 64
    }
  }
}
```

#### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบถ้วน
```json
{
  "error": "Missing required fields: user_id, subSkillCategory_id, levelType, exp"
}
```

**400 Bad Request** - levelType ไม่ถูกต้อง
```json
{
  "error": "Invalid levelType. Must be I, II, III, or IV"
}
```

**400 Bad Request** - EXP เป็น 0
```json
{
  "error": "EXP cannot be zero"
}
```

**401 Unauthorized** - ไม่มีสิทธิ์
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found** - ไม่พบผู้ใช้
```json
{
  "error": "User not found"
}
```

**404 Not Found** - ไม่พบ Sub Skill
```json
{
  "error": "Sub skill category not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Validation**: ตรวจสอบข้อมูลที่จำเป็นและความถูกต้อง
2. **Get Thresholds**: ดึงค่า threshold ของแต่ละ Level จาก database
3. **Get Current Data**: ดึงข้อมูล Level ปัจจุบันของผู้ใช้
4. **Add EXP**: เพิ่ม EXP เข้า Level ที่ระบุ (เก็บไว้เสมอ แม้ยังไม่ปลดล็อค)
5. **Check Unlock**: ตรวจสอบว่า Level นั้นปลดล็อคหรือยัง
6. **Calculate Stars**: คำนวณดาวจาก EXP (เฉพาะ Level ที่ปลดล็อคแล้ว)
7. **Check Cascade Unlock**: ตรวจสอบว่าการได้ดาวใหม่ทำให้ Level ถัดไปปลดล็อคหรือไม่
8. **Update Database**: บันทึกข้อมูลใหม่
9. **Log History**: บันทึกประวัติการได้รับ EXP
10. **Update Main Skill**: อัปเดตสถิติของ Main Skill ที่เกี่ยวข้อง

### Example Usage

#### cURL

```bash
curl -X POST https://api.example.com/api/exp \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -d '{
    "user_id": 123,
    "subSkillCategory_id": 5,
    "levelType": "II",
    "exp": 20,
    "reason_TH": "เข้าร่วม Workshop JavaScript",
    "reason_EN": "Attended JavaScript Workshop",
    "type": "ACTIVITY_COMPLETION"
  }'
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/exp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 123,
    subSkillCategory_id: 5,
    levelType: 'II',
    exp: 20,
    reason_TH: 'เข้าร่วม Workshop JavaScript',
    reason_EN: 'Attended JavaScript Workshop',
    type: 'ACTIVITY_COMPLETION'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Level up:', data.data.levelUps);
  console.log('Stars gained:', data.data.starsGained);
  console.log('Logs:', data.data.distributionLog);
}
```

---

## GET /api/exp

ดึงข้อมูล Skill Levels และความคืบหน้าของผู้ใช้

### Endpoint
```
GET /api/exp?format=summary
GET /api/exp?format=detailed
GET /api/exp?mainSkillId=1
GET /api/exp?subSkillId=5
```

### Authentication
Required - LEAP_AUTH cookie

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | string | No | รูปแบบข้อมูล: 'summary' หรือ 'detailed' (default: detailed) |
| mainSkillId | number | No | Filter ด้วย Main Skill ID |
| subSkillId | number | No | Filter ด้วย Sub Skill ID เฉพาะ |

### Response

#### Success (200 OK) - Summary Format

```json
{
  "success": true,
  "data": {
    "summary": [
      {
        "id": 1,
        "name_TH": "การเขียนโปรแกรม",
        "name_EN": "Programming",
        "slug": "programming",
        "icon": "code",
        "color": "#3B82F6",
        "maxLevel": 3,
        "averageLevel": 2.33,
        "totalExp": 450,
        "totalStars": 25,
        "totalSubSkills": 3,
        "completedSubSkills": 3,
        "levelBreakdown": {
          "Level_I": 3,
          "Level_II": 3,
          "Level_III": 2,
          "Level_IV": 0
        },
        "radarValue": 3
      }
    ],
    "radarData": [
      {
        "skill": "Programming",
        "skill_TH": "การเขียนโปรแกรม",
        "value": 3,
        "maxLevel": 3,
        "color": "#3B82F6"
      }
    ],
    "overall": {
      "totalExp": 1200,
      "totalStars": 75,
      "averageLevel": 2.5,
      "maxLevel": 4
    }
  }
}
```

#### Success (200 OK) - Detailed Format

```json
{
  "success": true,
  "data": {
    "summary": [
      {
        "id": 1,
        "name_TH": "การเขียนโปรแกรม",
        "name_EN": "Programming",
        "slug": "programming",
        "icon": "code",
        "color": "#3B82F6",
        "maxLevel": 3,
        "averageLevel": 2.33,
        "totalExp": 450,
        "totalStars": 25,
        "totalSubSkills": 3,
        "completedSubSkills": 3,
        "levelBreakdown": {
          "Level_I": 3,
          "Level_II": 3,
          "Level_III": 2,
          "Level_IV": 0
        },
        "radarValue": 3
      }
    ],
    "detailed": [
      {
        "id": 1,
        "name_TH": "การเขียนโปรแกรม",
        "name_EN": "Programming",
        "slug": "programming",
        "icon": "code",
        "color": "#3B82F6",
        "maxLevel": 3,
        "averageLevel": 2.33,
        "totalExp": 450,
        "totalStars": 25,
        "totalSubSkills": 3,
        "completedSubSkills": 3,
        "levelBreakdown": {
          "Level_I": 3,
          "Level_II": 3,
          "Level_III": 2,
          "Level_IV": 0
        },
        "radarValue": 3,
        "subSkills": [
          {
            "id": 12,
            "subSkillCategory_id": 5,
            "name_TH": "JavaScript",
            "name_EN": "JavaScript",
            "slug": "javascript",
            "icon": "js",
            "currentLevel": 2,
            "totalExp": 150,
            "levels": {
              "I": {
                "exp": 24,
                "stars": 3,
                "isUnlocked": true,
                "progress": 0,
                "threshold": 8
              },
              "II": {
                "exp": 48,
                "stars": 3,
                "isUnlocked": true,
                "progress": 0,
                "threshold": 16
              },
              "III": {
                "exp": 78,
                "stars": 2,
                "isUnlocked": true,
                "progress": 14,
                "threshold": 32
              },
              "IV": {
                "exp": 0,
                "stars": 0,
                "isUnlocked": false,
                "progress": 0,
                "threshold": 64
              }
            },
            "totalStars": 8
          }
        ]
      }
    ],
    "radarData": [
      {
        "skill": "Programming",
        "skill_TH": "การเขียนโปรแกรม",
        "value": 3,
        "maxLevel": 3,
        "color": "#3B82F6"
      }
    ],
    "overall": {
      "totalExp": 1200,
      "totalStars": 75,
      "averageLevel": 2.5,
      "maxLevel": 4
    }
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required parameter: userId"
}
```

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to fetch skill levels"
}
```

### Business Logic

1. **Get User ID**: ดึง userId จาก authentication cookie
2. **Fetch Main Skills**: ดึงข้อมูล Main Skills ทั้งหมดที่ active
3. **Fetch User Sub Skill Levels**: ดึงข้อมูล Sub Skill Levels ของผู้ใช้
4. **Group by Main Skill**: จัดกลุ่ม Sub Skills ตาม Main Skill
5. **Calculate Statistics**: คำนวณสถิติแต่ละ Main Skill
6. **Format Response**: จัดรูปแบบข้อมูลตาม format ที่ระบุ

### Example Usage

```javascript
// Get summary data
const summaryResponse = await fetch('/api/exp?format=summary', {
  credentials: 'include'
});
const summaryData = await summaryResponse.json();

// Get detailed data for specific main skill
const detailedResponse = await fetch('/api/exp?mainSkillId=1', {
  credentials: 'include'
});
const detailedData = await detailedResponse.json();

// Use in radar chart
const radarChartData = summaryData.data.radarData;
```

---

## GET /api/exp/lv

ดึงข้อมูล Skill Levels แบบละเอียดพร้อม Main Skills และ Sub Skills

### Endpoint
```
GET /api/exp/lv?mainSkillId=1
GET /api/exp/lv?includeInactive=true
```

### Authentication
Required - LEAP_AUTH cookie

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mainSkillId | number | No | Filter ด้วย Main Skill ID เฉพาะ |
| includeInactive | boolean | No | รวม Sub Skills ที่ไม่ active (default: false) |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "name": "สมชาย ใจดี",
      "faculty": "Engineering",
      "major": "Computer Engineering"
    },
    "overallStats": {
      "totalExp": 1200,
      "totalStars": 75,
      "totalMainSkills": 5,
      "totalSubSkills": 25,
      "completedSubSkills": 18,
      "averageLevel": 2.5,
      "maxLevel": 4,
      "completionPercentage": 72.0
    },
    "mainSkills": [
      {
        "id": 1,
        "name_TH": "การเขียนโปรแกรม",
        "name_EN": "Programming",
        "slug": "programming",
        "icon": "code",
        "color": "#3B82F6",
        "description_TH": "ทักษะการเขียนโปรแกรม",
        "description_EN": "Programming skills",
        "sortOrder": 1,
        "statistics": {
          "maxLevel": 3,
          "averageLevel": 2.33,
          "totalExp": 450,
          "totalStars": 25,
          "totalSubSkills": 3,
          "completedSubSkills": 3,
          "completionPercentage": 100.0,
          "levelBreakdown": {
            "Level_I": 3,
            "Level_II": 3,
            "Level_III": 2,
            "Level_IV": 0
          }
        },
        "subSkills": [
          {
            "id": 5,
            "name_TH": "JavaScript",
            "name_EN": "JavaScript",
            "slug": "javascript",
            "icon": "js",
            "color": "#F7DF1E",
            "description_TH": "ภาษา JavaScript",
            "description_EN": "JavaScript language",
            "sortOrder": 1,
            "currentLevel": 2,
            "maxLevel": 2,
            "totalExp": 150,
            "levels": {
              "I": {
                "exp": 24,
                "stars": 3,
                "isUnlocked": true,
                "threshold": 8,
                "progress": 0,
                "expToNextStar": 8
              },
              "II": {
                "exp": 48,
                "stars": 3,
                "isUnlocked": true,
                "threshold": 16,
                "progress": 0,
                "expToNextStar": 16
              },
              "III": {
                "exp": 78,
                "stars": 2,
                "isUnlocked": true,
                "threshold": 32,
                "progress": 14,
                "expToNextStar": 18
              },
              "IV": {
                "exp": 0,
                "stars": 0,
                "isUnlocked": false,
                "threshold": 64,
                "progress": 0,
                "expToNextStar": 64
              }
            },
            "totalStars": 8
          }
        ]
      }
    ]
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "error": "Missing required parameter: userId"
}
```

**404 Not Found**
```json
{
  "success": false,
  "error": "User not found"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "error": "Failed to fetch user skills",
  "details": "Error message"
}
```

### Business Logic

1. **Get User**: ดึงข้อมูลผู้ใช้จาก userId
2. **Fetch Main Skills**: ดึง Main Skills ตาม filter
3. **Fetch User Levels**: ดึงข้อมูล Level ของผู้ใช้
4. **Calculate Max Level**: คำนวณ max level จากดาวที่มี
5. **Check Unlock Status**: ตรวจสอบสถานะการปลดล็อคของแต่ละ Level
6. **Calculate Progress**: คำนวณ progress และ EXP ที่ต้องการถึงดาวถัดไป
7. **Aggregate Statistics**: คำนวณสถิติระดับ Main Skill และ Overall

### Example Usage

```javascript
// Get all skills with progress
const response = await fetch('/api/exp/lv', {
  credentials: 'include'
});
const data = await response.json();

// Display user progress
console.log(`Completion: ${data.data.overallStats.completionPercentage}%`);
console.log(`Max Level: ${data.data.overallStats.maxLevel}`);

// Iterate through skills
data.data.mainSkills.forEach(mainSkill => {
  console.log(`\n${mainSkill.name_EN}:`);
  mainSkill.subSkills.forEach(subSkill => {
    console.log(`  ${subSkill.name_EN}: Level ${subSkill.currentLevel}`);
    console.log(`    Total Stars: ${subSkill.totalStars}`);
  });
});
```

---

## POST /api/exp/reset

รีเซ็ต Skill Levels ของผู้ใช้ (Admin Only)

### Endpoint
```
POST /api/exp/reset
```

### Authentication
Required - SKILL_ADMIN or SUPREME role

### Request Body

**รีเซ็ตทั้งหมด (Complete Reset)**:
```json
{
  "user_id": 123,
  "resetType": "COMPLETE",
  "reason_TH": "รีเซ็ตข้อมูลเพื่อเริ่มใหม่",
  "reason_EN": "Reset data to start fresh",
  "adminNote": "User requested reset"
}
```

**รีเซ็ต Sub Skill เฉพาะ (Complete)**:
```json
{
  "user_id": 123,
  "subSkillCategory_id": 5,
  "resetType": "COMPLETE",
  "reason_TH": "รีเซ็ต JavaScript เพื่อประเมินใหม่",
  "reason_EN": "Reset JavaScript for re-evaluation"
}
```

**รีเซ็ตบางส่วน (Partial Reset)**:
```json
{
  "user_id": 123,
  "subSkillCategory_id": 5,
  "resetType": "PARTIAL",
  "resetOptions": {
    "Level_I": false,
    "Level_II": false,
    "Level_III": true,
    "Level_IV": true,
    "resetExp": true,
    "resetStars": true
  },
  "reason_TH": "รีเซ็ต Level III และ IV",
  "reason_EN": "Reset Level III and IV"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | number | Yes | ID ของผู้ใช้ |
| subSkillCategory_id | number | No | ID ของ Sub Skill (ถ้าไม่ระบุจะรีเซ็ตทั้งหมด) |
| resetType | string | Yes | ประเภทการรีเซ็ต: 'COMPLETE' หรือ 'PARTIAL' |
| resetOptions | object | No | ตัวเลือกสำหรับ PARTIAL reset |
| reason_TH | string | Yes | เหตุผลภาษาไทย |
| reason_EN | string | Yes | เหตุผลภาษาอังกฤษ |
| adminNote | string | No | บันทึกเพิ่มเติมจาก Admin |

**resetOptions Fields** (สำหรับ PARTIAL reset):
```typescript
{
  Level_I?: boolean;      // รีเซ็ต Level I
  Level_II?: boolean;     // รีเซ็ต Level II
  Level_III?: boolean;    // รีเซ็ต Level III
  Level_IV?: boolean;     // รีเซ็ต Level IV
  resetExp?: boolean;     // รีเซ็ต EXP เป็น 0
  resetStars?: boolean;   // รีเซ็ต Stars เป็น 0
}
```

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Reset completed successfully",
  "data": {
    "user": {
      "id": 123,
      "name": "สมชาย ใจดี"
    },
    "resetType": "COMPLETE",
    "affectedSkills": 3,
    "results": [
      {
        "subSkillId": 5,
        "name_TH": "JavaScript",
        "name_EN": "JavaScript",
        "resetType": "COMPLETE",
        "previousData": {
          "Level_I_exp": 24,
          "Level_I_stars": 3,
          "Level_II_exp": 48,
          "Level_II_stars": 3,
          "Level_III_exp": 78,
          "Level_III_stars": 2,
          "Level_IV_exp": 0,
          "Level_IV_stars": 0,
          "currentLevel": 3,
          "totalExp": 150
        },
        "newData": {
          "Level_I_exp": 0,
          "Level_I_stars": 0,
          "Level_II_exp": 0,
          "Level_II_stars": 0,
          "Level_III_exp": 0,
          "Level_III_stars": 0,
          "Level_IV_exp": 0,
          "Level_IV_stars": 0,
          "currentLevel": 0,
          "totalExp": 0
        },
        "changesApplied": [
          "Level I: 24 EXP, 3 stars → 0 EXP, 0 stars",
          "Level II: 48 EXP, 3 stars → 0 EXP, 0 stars",
          "Level III: 78 EXP, 2 stars → 0 EXP, 0 stars",
          "Total EXP: 150 → 0",
          "Current Level: 3 → 0"
        ]
      }
    ],
    "mainSkillsUpdated": [1, 2],
    "historyRecorded": true,
    "reason_TH": "รีเซ็ตข้อมูลเพื่อเริ่มใหม่",
    "reason_EN": "Reset data to start fresh"
  }
}
```

#### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบถ้วน
```json
{
  "error": "Missing required fields: user_id, resetType, reason_TH, reason_EN"
}
```

**400 Bad Request** - resetType ไม่ถูกต้อง
```json
{
  "error": "Invalid resetType. Must be COMPLETE or PARTIAL"
}
```

**401 Unauthorized**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found** - ไม่พบผู้ใช้
```json
{
  "error": "User not found"
}
```

**404 Not Found** - ไม่พบ Skill Level ที่จะรีเซ็ต
```json
{
  "error": "No skill levels found to reset"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Validate**: ตรวจสอบข้อมูลและสิทธิ์การเข้าถึง
2. **Find Affected Skills**: หา Sub Skills ที่จะถูกรีเซ็ต
3. **Backup Current Data**: บันทึกข้อมูลปัจจุบันก่อนรีเซ็ต
4. **Apply Reset**:
   - COMPLETE: ตั้งค่าทุก Level เป็น 0
   - PARTIAL: รีเซ็ตเฉพาะ Level ที่ระบุตาม resetOptions
5. **Update Database**: อัปเดตข้อมูลใหม่
6. **Record History**: บันทึกประวัติการรีเซ็ต
7. **Update Main Skills**: อัปเดตสถิติ Main Skills ที่เกี่ยวข้อง

### Use Cases

**Complete Reset - เริ่มต้นใหม่ทั้งหมด**:
- ผู้ใช้ขอเริ่มต้นใหม่
- ข้อมูลเก่าไม่ถูกต้อง
- เปลี่ยนแปลงระบบการคำนวณ

**Partial Reset - ปรับแก้บางส่วน**:
- รีเซ็ตเฉพาะ Level สูงเพื่อประเมินใหม่
- แก้ไขข้อผิดพลาดที่เฉพาะเจาะจง
- ทดสอบระบบใหม่

### Example Usage

```javascript
// Complete reset for specific skill
const response = await fetch('/api/exp/reset', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 123,
    subSkillCategory_id: 5,
    resetType: 'COMPLETE',
    reason_TH: 'รีเซ็ตเพื่อประเมินใหม่',
    reason_EN: 'Reset for re-evaluation'
  })
});

const data = await response.json();
if (data.success) {
  console.log(`Reset completed: ${data.data.affectedSkills} skills affected`);
}
```

---

## POST /api/exp/special

เพิ่มหรือหัก EXP ของ Special Skill

### Endpoint
```
POST /api/exp/special
```

### Authentication
Required - SKILL_ADMIN or SUPREME role

### Request Body

**เพิ่ม EXP (Positive)**:
```json
{
  "user_id": 123,
  "specialSkill_id": 2,
  "expChange": 15,
  "reason_TH": "เข้าร่วมกิจกรรมตรงเวลา 3 ครั้งติดต่อกัน",
  "reason_EN": "Attended events on time 3 times in a row",
  "actionType": "EVENT_REWARD",
  "event_id": 45,
  "note": "Bonus for consistency"
}
```

**หัก EXP (Negative)**:
```json
{
  "user_id": 123,
  "specialSkill_id": 2,
  "expChange": -10,
  "reason_TH": "มาสาย 30 นาที",
  "reason_EN": "Late 30 minutes",
  "actionType": "LATE_PENALTY",
  "event_id": 46
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | number | Yes | ID ของผู้ใช้ |
| specialSkill_id | number | Yes | ID ของ Special Skill |
| expChange | number | Yes | จำนวน EXP ที่เปลี่ยนแปลง (บวก/ลบ, ไม่เป็น 0) |
| reason_TH | string | No | เหตุผลภาษาไทย |
| reason_EN | string | No | เหตุผลภาษาอังกฤษ |
| actionType | string | Yes | ประเภทการกระทำ |
| event_id | number | No | ID ของกิจกรรมที่เกี่ยวข้อง |
| note | string | No | บันทึกเพิ่มเติม |

**actionType Values**:
- `EVENT_REWARD`: รางวัลจากกิจกรรม (+)
- `BONUS`: โบนัสพิเศษ (+)
- `DISCIPLINE_PENALTY`: โทษจากละเมิดวินัย (-)
- `LATE_PENALTY`: โทษจากมาสาย (-)
- `ABSENCE_PENALTY`: โทษจากขาดกิจกรรม (-)
- `MANUAL_ADJUSTMENT`: ปรับแก้โดย Admin (+/-)
- `OTHER`: อื่นๆ (+/-)

### Response

#### Success (200 OK) - Tier Up

```json
{
  "success": true,
  "message": "ขึ้นเป็นขั้น 3!",
  "data": {
    "specialSkill": {
      "id": 2,
      "name_TH": "ความมีวินัย",
      "name_EN": "Discipline",
      "slug": "discipline",
      "icon": "shield",
      "category": "DISCIPLINE"
    },
    "updatedLevel": {
      "currentExp": 35,
      "currentLevel": 3,
      "positiveActions": 8,
      "negativeActions": 2,
      "maxLevelReached": 3,
      "reachedMaxAt": "2026-02-27T10:30:00.000Z"
    },
    "changes": {
      "expChange": 15,
      "tierChange": 1,
      "previousExp": 20,
      "newExp": 35,
      "previousTier": 2,
      "newTier": 3,
      "isTierUp": true,
      "isTierDown": false
    },
    "progress": {
      "tierProgress": 5,
      "expPerTier": 10,
      "progressPercentage": 50.0,
      "expToNextTier": 5,
      "isNegative": false
    },
    "logs": [
      "ได้รับ 15 EXP สำหรับ ความมีวินัย",
      "   EXP: 20 → 35",
      "ขึ้นขั้น 1 ขั้น! (ขั้น 2 → ขั้น 3)",
      "ความคืบหน้า: 5/10 (50%)",
      "ต้องการอีก 5 EXP เพื่อขึ้นขั้นถัดไป"
    ],
    "logs_EN": [
      "Received 15 EXP for Discipline",
      "   EXP: 20 → 35",
      "Tier Up 1 tier(s)! (Tier 2 → Tier 3)",
      "Progress: 5/10 (50%)",
      "Need 5 EXP to next tier"
    ]
  }
}
```

#### Success (200 OK) - Tier Down

```json
{
  "success": true,
  "message": "ลดเหลือขั้น 1",
  "data": {
    "specialSkill": {
      "id": 2,
      "name_TH": "ความมีวินัย",
      "name_EN": "Discipline",
      "slug": "discipline",
      "icon": "shield",
      "category": "DISCIPLINE"
    },
    "updatedLevel": {
      "currentExp": 15,
      "currentLevel": 1,
      "positiveActions": 5,
      "negativeActions": 3,
      "maxLevelReached": 3,
      "reachedMaxAt": "2026-02-27T10:30:00.000Z"
    },
    "changes": {
      "expChange": -10,
      "tierChange": -1,
      "previousExp": 25,
      "newExp": 15,
      "previousTier": 2,
      "newTier": 1,
      "isTierUp": false,
      "isTierDown": true
    },
    "progress": {
      "tierProgress": 5,
      "expPerTier": 10,
      "progressPercentage": 50.0,
      "expToNextTier": 5,
      "isNegative": false
    },
    "logs": [
      "ถูกหัก 10 EXP จาก ความมีวินัย",
      "   EXP: 25 → 15",
      "ลดขั้น 1 ขั้น (ขั้น 2 → ขั้น 1)",
      "ความคืบหน้า: 5/10 (50%)",
      "ต้องการอีก 5 EXP เพื่อขึ้นขั้นถัดไป"
    ],
    "logs_EN": [
      "Deducted 10 EXP from Discipline",
      "   EXP: 25 → 15",
      "Tier Down 1 tier(s) (Tier 2 → Tier 1)",
      "Progress: 5/10 (50%)",
      "Need 5 EXP to next tier"
    ]
  }
}
```

#### Success (200 OK) - Negative Tier

```json
{
  "success": true,
  "message": "ลดเหลือขั้น -2",
  "data": {
    "specialSkill": {
      "id": 2,
      "name_TH": "ความมีวินัย",
      "name_EN": "Discipline",
      "slug": "discipline",
      "icon": "shield",
      "category": "DISCIPLINE"
    },
    "updatedLevel": {
      "currentExp": -15,
      "currentLevel": -2,
      "positiveActions": 2,
      "negativeActions": 8,
      "maxLevelReached": 1,
      "reachedMaxAt": "2026-02-20T10:30:00.000Z"
    },
    "changes": {
      "expChange": -10,
      "tierChange": -1,
      "previousExp": -5,
      "newExp": -15,
      "previousTier": -1,
      "newTier": -2,
      "isTierUp": false,
      "isTierDown": true
    },
    "progress": {
      "tierProgress": 5,
      "expPerTier": 10,
      "progressPercentage": 50.0,
      "expToNextTier": 5,
      "isNegative": true
    },
    "logs": [
      "ถูกหัก 10 EXP จาก ความมีวินัย",
      "   EXP: -5 → -15",
      "ลดขั้น 1 ขั้น (ขั้น -1 → ขั้น -2)",
      "ความคืบหน้า: 5/10 (50%)",
      "ต้องการอีก 5 EXP เพื่อกลับขั้น -1"
    ],
    "logs_EN": [
      "Deducted 10 EXP from Discipline",
      "   EXP: -5 → -15",
      "Tier Down 1 tier(s) (Tier -1 → Tier -2)",
      "Progress: 5/10 (50%)",
      "Need 5 EXP to reach Tier -1"
    ]
  }
}
```

#### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบถ้วน
```json
{
  "error": "Missing required fields: user_id, specialSkill_id, expChange, actionType"
}
```

**400 Bad Request** - actionType ไม่ถูกต้อง
```json
{
  "error": "Invalid actionType value"
}
```

**400 Bad Request** - expChange เป็น 0
```json
{
  "error": "expChange cannot be zero"
}
```

**401 Unauthorized**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found** - ไม่พบผู้ใช้
```json
{
  "error": "User not found"
}
```

**404 Not Found** - ไม่พบ Special Skill
```json
{
  "error": "Special skill not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Validate**: ตรวจสอบข้อมูลที่จำเป็นและ actionType
2. **Check Existence**: ตรวจสอบว่า user และ specialSkill มีอยู่
3. **Get Config**: ดึงค่า config (expPerTier, allowNegative)
4. **Get Current Level**: ดึงข้อมูล Level ปัจจุบัน (หรือสร้างใหม่ถ้ายังไม่มี)
5. **Calculate New EXP**: คำนวณ EXP ใหม่
6. **Calculate Tier**: คำนวณ Tier จาก EXP
7. **Update Statistics**: อัปเดตจำนวน positive/negative actions
8. **Track Max Tier**: บันทึก max tier ที่เคยถึง
9. **Update Database**: บันทึกข้อมูลใหม่
10. **Record History**: บันทึกประวัติการเปลี่ยนแปลง

### Example Usage

```javascript
// Add positive EXP
const response = await fetch('/api/exp/special', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 123,
    specialSkill_id: 2,
    expChange: 15,
    reason_TH: 'เข้าร่วมกิจกรรมตรงเวลา',
    reason_EN: 'Attended event on time',
    actionType: 'EVENT_REWARD',
    event_id: 45
  })
});

const data = await response.json();
if (data.success) {
  if (data.data.changes.isTierUp) {
    console.log(`Tier Up! Now at Tier ${data.data.updatedLevel.currentLevel}`);
  }
  console.log('Progress:', data.data.progress);
}
```

---

## GET /api/exp/special

ดึงข้อมูล Special Skill Levels ของผู้ใช้

### Endpoint
```
GET /api/exp/special?format=summary
GET /api/exp/special?format=detailed&includeHistory=true
GET /api/exp/special?specialSkillId=2
```

### Authentication
Required - LEAP_AUTH cookie

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | string | No | รูปแบบข้อมูล: 'summary' หรือ 'detailed' (default: detailed) |
| specialSkillId | number | No | Filter ด้วย Special Skill ID เฉพาะ |
| includeHistory | boolean | No | รวมประวัติการเปลี่ยนแปลง (default: false) |

### Response

#### Success (200 OK) - Summary Format

```json
{
  "success": true,
  "data": {
    "summary": [
      {
        "id": 2,
        "name_TH": "ความมีวินัย",
        "name_EN": "Discipline",
        "slug": "discipline",
        "icon": "shield",
        "category": "DISCIPLINE",
        "currentExp": 35,
        "currentTier": 3,
        "maxTierReached": 4,
        "positiveActions": 10,
        "negativeActions": 3,
        "reachedMaxAt": "2026-02-20T10:30:00.000Z",
        "isNegative": false,
        "progress": {
          "tierProgress": 5,
          "expPerTier": 10,
          "progressPercentage": 50.0,
          "expToNextTier": 5
        }
      },
      {
        "id": 3,
        "name_TH": "ความรับผิดชอบ",
        "name_EN": "Responsibility",
        "slug": "responsibility",
        "icon": "hand-heart",
        "category": "RESPONSIBILITY",
        "currentExp": 0,
        "currentTier": 0,
        "maxTierReached": 0,
        "positiveActions": 0,
        "negativeActions": 0,
        "isNegative": false,
        "progress": {
          "tierProgress": 0,
          "expPerTier": 10,
          "progressPercentage": 0,
          "expToNextTier": 10
        }
      }
    ],
    "overall": {
      "totalSpecialSkills": 4,
      "skillsStarted": 2,
      "averageTier": 1.5,
      "maxTierReached": 4,
      "totalPositiveActions": 15,
      "totalNegativeActions": 5,
      "totalExp": 45,
      "skillsWithNegativeExp": 0
    },
    "config": {
      "expPerTier": 10,
      "allowNegative": true
    }
  }
}
```

#### Success (200 OK) - Detailed Format with History

```json
{
  "success": true,
  "data": {
    "overall": {
      "totalSpecialSkills": 4,
      "skillsStarted": 2,
      "averageTier": 1.5,
      "maxTierReached": 4,
      "totalPositiveActions": 15,
      "totalNegativeActions": 5,
      "totalExp": 45,
      "skillsWithNegativeExp": 0
    },
    "summary": [
      {
        "id": 2,
        "name_TH": "ความมีวินัย",
        "name_EN": "Discipline",
        "slug": "discipline",
        "icon": "shield",
        "category": "DISCIPLINE",
        "currentExp": 35,
        "currentTier": 3,
        "maxTierReached": 4,
        "positiveActions": 10,
        "negativeActions": 3,
        "reachedMaxAt": "2026-02-20T10:30:00.000Z",
        "isNegative": false,
        "progress": {
          "tierProgress": 5,
          "expPerTier": 10,
          "progressPercentage": 50.0,
          "expToNextTier": 5
        }
      }
    ],
    "detailed": [
      {
        "id": 2,
        "name_TH": "ความมีวินัย",
        "name_EN": "Discipline",
        "slug": "discipline",
        "icon": "shield",
        "category": "DISCIPLINE",
        "currentExp": 35,
        "currentTier": 3,
        "maxTierReached": 4,
        "positiveActions": 10,
        "negativeActions": 3,
        "reachedMaxAt": "2026-02-20T10:30:00.000Z",
        "isNegative": false,
        "progress": {
          "tierProgress": 5,
          "expPerTier": 10,
          "progressPercentage": 50.0,
          "expToNextTier": 5
        },
        "history": [
          {
            "id": 245,
            "expChange": 15,
            "previousExp": 20,
            "newExp": 35,
            "previousTier": 2,
            "newTier": 3,
            "reason_TH": "เข้าร่วมกิจกรรมตรงเวลา",
            "reason_EN": "Attended event on time",
            "actionType": "EVENT_REWARD",
            "event_id": 45,
            "note": "Bonus for consistency",
            "createdAt": "2026-02-27T10:30:00.000Z"
          },
          {
            "id": 244,
            "expChange": -5,
            "previousExp": 25,
            "newExp": 20,
            "previousTier": 2,
            "newTier": 2,
            "reason_TH": "มาสาย 10 นาที",
            "reason_EN": "Late 10 minutes",
            "actionType": "LATE_PENALTY",
            "event_id": 44,
            "note": null,
            "createdAt": "2026-02-26T14:15:00.000Z"
          }
        ]
      }
    ],
    "config": {
      "expPerTier": 10,
      "allowNegative": true
    }
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required parameter: userId"
}
```

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to fetch special skill levels"
}
```

### Business Logic

1. **Get User ID**: ดึง userId จาก authentication cookie
2. **Get Config**: ดึงค่า config (expPerTier, allowNegative)
3. **Fetch All Special Skills**: ดึงข้อมูล Special Skills ทั้งหมดที่ active
4. **Fetch User Levels**: ดึงข้อมูล Level ของผู้ใช้
5. **Calculate Tier Info**: คำนวณ tier และ progress
6. **Format Response**: จัดรูปแบบข้อมูลตาม format
7. **Include History** (ถ้าระบุ): ดึงประวัติ 20 รายการล่าสุด

### Example Usage

```javascript
// Get summary
const summaryResponse = await fetch('/api/exp/special?format=summary', {
  credentials: 'include'
});
const summaryData = await summaryResponse.json();

// Display overall stats
console.log(`Average Tier: ${summaryData.data.overall.averageTier}`);
console.log(`Max Tier Reached: ${summaryData.data.overall.maxTierReached}`);

// Get detailed with history
const detailedResponse = await fetch('/api/exp/special?format=detailed&includeHistory=true', {
  credentials: 'include'
});
const detailedData = await detailedResponse.json();

// Display skill progress
detailedData.data.detailed.forEach(skill => {
  console.log(`\n${skill.name_EN}: Tier ${skill.currentTier}`);
  console.log(`Progress: ${skill.progress.progressPercentage}%`);
  console.log(`Positive: ${skill.positiveActions}, Negative: ${skill.negativeActions}`);
  
  if (skill.history) {
    console.log('Recent History:');
    skill.history.slice(0, 5).forEach(entry => {
      console.log(`  ${entry.expChange > 0 ? '+' : ''}${entry.expChange} EXP - ${entry.reason_EN}`);
    });
  }
});
```

---

## POST /api/exp/special/reset

รีเซ็ต Special Skill Level ของผู้ใช้ (Admin Only)

### Endpoint
```
POST /api/exp/special/reset
```

### Authentication
Required - SKILL_ADMIN or SUPREME role

### Request Body

```json
{
  "user_id": 123,
  "specialSkill_id": 2
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | number | Yes | ID ของผู้ใช้ |
| specialSkill_id | number | Yes | ID ของ Special Skill ที่ต้องการรีเซ็ต |

### Response

#### Success (200 OK)

```json
{
  "message": "Special skill experience reset successfully.",
  "user_id": 123,
  "specialSkill_id": 2
}
```

#### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบถ้วน
```json
{
  "error": "Missing required fields: user_id, specialSkill_id"
}
```

**401 Unauthorized**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found** - ไม่พบ Level Record
```json
{
  "error": "No special skill level record found to reset."
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Validate**: ตรวจสอบข้อมูลและสิทธิ์
2. **Find Record**: หา Special Skill Level record ที่ต้องการรีเซ็ต
3. **Delete Record**: ลบ record ออกจาก database
4. **Return Success**: ส่งข้อความยืนยันการรีเซ็ต

### Example Usage

```javascript
const response = await fetch('/api/exp/special/reset', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 123,
    specialSkill_id: 2
  })
});

const data = await response.json();
if (data.message) {
  console.log('Special skill reset successfully');
}
```

---

## GET /api/skills

ดึงข้อมูล Skills ทั้งหมด (Main Skills และ Sub Skills)

### Endpoint
```
GET /api/skills?skillType=main
GET /api/skills?skillType=sub&mainSkillId=1
GET /api/skills?includeSubSkills=true&userId=123&includeUserLevels=true
```

### Authentication
Required - LEAP_AUTH cookie

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| skillType | string | No | ประเภท: 'main', 'sub', หรือ null (ทั้งหมด) |
| mainSkillId | number | No | Filter Sub Skills ด้วย Main Skill ID |
| activeOnly | boolean | No | แสดงเฉพาะที่ active (default: true) |
| includeSubSkills | boolean | No | รวม Sub Skills ใน Main Skills (default: false) |
| userId | number | No | ID ของผู้ใช้ (สำหรับดึง Level) |
| includeUserLevels | boolean | No | รวม User Levels (ต้องระบุ userId ด้วย) |

### Response

#### Success (200 OK) - Main Skills Only

```json
{
  "success": true,
  "type": "main",
  "levelThresholds": [
    {
      "id": 1,
      "levelType": "I",
      "expRequired": 8,
      "levelName_TH": "ระดับเริ่มต้น",
      "levelName_EN": "Beginner"
    },
    {
      "id": 2,
      "levelType": "II",
      "expRequired": 16,
      "levelName_TH": "ระดับกลาง",
      "levelName_EN": "Intermediate"
    },
    {
      "id": 3,
      "levelType": "III",
      "expRequired": 32,
      "levelName_TH": "ระดับสูง",
      "levelName_EN": "Advanced"
    },
    {
      "id": 4,
      "levelType": "IV",
      "expRequired": 64,
      "levelName_TH": "ระดับผู้เชี่ยวชาญ",
      "levelName_EN": "Expert"
    }
  ],
  "data": [
    {
      "id": 1,
      "name_TH": "การเขียนโปรแกรม",
      "name_EN": "Programming",
      "slug": "programming",
      "icon": "code",
      "color": "#3B82F6",
      "description_TH": "ทักษะการเขียนโปรแกรม",
      "description_EN": "Programming skills",
      "sortOrder": 1,
      "isActive": true,
      "summary": null
    }
  ],
  "total": 5
}
```

#### Success (200 OK) - Main Skills with Sub Skills and User Levels

```json
{
  "success": true,
  "type": "main",
  "levelThresholds": [...],
  "data": [
    {
      "id": 1,
      "name_TH": "การเขียนโปรแกรม",
      "name_EN": "Programming",
      "slug": "programming",
      "icon": "code",
      "color": "#3B82F6",
      "description_TH": "ทักษะการเขียนโปรแกรม",
      "description_EN": "Programming skills",
      "sortOrder": 1,
      "isActive": true,
      "subSkills": [
        {
          "id": 5,
          "name_TH": "JavaScript",
          "name_EN": "JavaScript",
          "slug": "javascript",
          "icon": "js",
          "color": "#F7DF1E",
          "description_TH": "ภาษา JavaScript",
          "description_EN": "JavaScript language",
          "sortOrder": 1,
          "isActive": true,
          "mainSkillCategory_id": 1,
          "userSubSkillLevels": [
            {
              "id": 12,
              "user_id": 123,
              "subSkillCategory_id": 5,
              "currentLevel": 2,
              "totalExp": 150,
              "Level_I_exp": 24,
              "Level_I_stars": 3,
              "Level_II_exp": 48,
              "Level_II_stars": 3,
              "Level_III_exp": 78,
              "Level_III_stars": 2,
              "Level_IV_exp": 0,
              "Level_IV_stars": 0
            }
          ]
        }
      ],
      "summary": {
        "maxLevel": 3,
        "averageLevel": 2.33,
        "totalExp": 450,
        "completedSubSkills": 3,
        "totalSubSkills": 3
      }
    }
  ],
  "total": 5
}
```

#### Success (200 OK) - Sub Skills Only

```json
{
  "success": true,
  "type": "sub",
  "levelThresholds": [...],
  "data": [
    {
      "id": 5,
      "name_TH": "JavaScript",
      "name_EN": "JavaScript",
      "slug": "javascript",
      "icon": "js",
      "color": "#F7DF1E",
      "description_TH": "ภาษา JavaScript",
      "description_EN": "JavaScript language",
      "sortOrder": 1,
      "isActive": true,
      "mainSkillCategory_id": 1,
      "mainSkillCategory": {
        "id": 1,
        "name_TH": "การเขียนโปรแกรม",
        "name_EN": "Programming",
        "slug": "programming",
        "icon": "code",
        "color": "#3B82F6",
        "isActive": true
      }
    }
  ],
  "total": 15
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Parse Parameters**: ดึงและตรวจสอบ query parameters
2. **Fetch Level Thresholds**: ดึงข้อมูล thresholds
3. **Determine Query Type**: ตรวจสอบว่าต้องการ main, sub, หรือทั้งหมด
4. **Build Query**: สร้าง Prisma query ตาม filters
5. **Include Relations**: รวม Sub Skills และ User Levels ตามที่ระบุ
6. **Calculate Summary**: คำนวณสถิติสำหรับ Main Skills (ถ้าระบุ userId)
7. **Format Response**: จัดรูปแบบข้อมูลและส่งกลับ

### Example Usage

```javascript
// Get all main skills with sub skills
const response = await fetch('/api/skills?skillType=main&includeSubSkills=true', {
  credentials: 'include'
});
const data = await response.json();

// Get main skills with user progress
const userResponse = await fetch(
  '/api/skills?skillType=main&includeSubSkills=true&userId=123&includeUserLevels=true',
  { credentials: 'include' }
);
const userData = await userResponse.json();

// Get sub skills for specific main skill
const subSkillsResponse = await fetch('/api/skills?skillType=sub&mainSkillId=1', {
  credentials: 'include'
});
const subSkillsData = await subSkillsResponse.json();
```

---

## GET /api/skills/special_skills

ดึงข้อมูล Special Skills ทั้งหมด

### Endpoint
```
GET /api/skills/special_skills
GET /api/skills/special_skills?id=2
GET /api/skills/special_skills?category=DISCIPLINE
GET /api/skills/special_skills?isActive=true
```

### Authentication
Required - LEAP_AUTH cookie

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | No | ดึง Special Skill เฉพาะ ID |
| category | string | No | Filter ตาม category |
| isActive | boolean | No | Filter ตามสถานะ active |
| includeInactive | boolean | No | รวม Skills ที่ไม่ active (default: false) |

### Response

#### Success (200 OK) - All Special Skills

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "name_TH": "ความมีวินัย",
      "name_EN": "Discipline",
      "slug": "discipline",
      "description_TH": "การมาตรงเวลาและปฏิบัติตามกฎระเบียบ",
      "description_EN": "Punctuality and following rules",
      "icon": "shield",
      "category": "DISCIPLINE",
      "sortOrder": 1,
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-15T10:30:00.000Z",
      "_count": {
        "userSpecialSkillLevels": 150,
        "specialSkillHistory": 2340,
        "eventSpecialSkillRewards": 25
      }
    },
    {
      "id": 3,
      "name_TH": "ความรับผิดชอบ",
      "name_EN": "Responsibility",
      "slug": "responsibility",
      "description_TH": "ความรับผิดชอบต่อหน้าที่",
      "description_EN": "Taking responsibility for duties",
      "icon": "hand-heart",
      "category": "RESPONSIBILITY",
      "sortOrder": 2,
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-15T10:30:00.000Z",
      "_count": {
        "userSpecialSkillLevels": 120,
        "specialSkillHistory": 1890,
        "eventSpecialSkillRewards": 18
      }
    }
  ],
  "count": 4
}
```

#### Success (200 OK) - Single Special Skill

```json
{
  "success": true,
  "data": {
    "id": 2,
    "name_TH": "ความมีวินัย",
    "name_EN": "Discipline",
    "slug": "discipline",
    "description_TH": "การมาตรงเวลาและปฏิบัติตามกฎระเบียบ",
    "description_EN": "Punctuality and following rules",
    "icon": "shield",
    "category": "DISCIPLINE",
    "sortOrder": 1,
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z",
    "_count": {
      "userSpecialSkillLevels": 150,
      "specialSkillHistory": 2340,
      "eventSpecialSkillRewards": 25
    }
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**404 Not Found** - Special Skill ไม่พบ
```json
{
  "error": "Special skill not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Parse Parameters**: ดึง query parameters
2. **Single vs Multiple**: ตรวจสอบว่าต้องการ skill เดียวหรือทั้งหมด
3. **Build Where Clause**: สร้าง filter condition
4. **Fetch Data**: ดึงข้อมูลจาก database พร้อม count
5. **Format Response**: จัดรูปแบบและส่งกลับ

### Special Skill Categories

- `DISCIPLINE`: ทักษะด้านวินัย
- `LEADERSHIP`: ทักษะด้านความเป็นผู้นำ
- `RESPONSIBILITY`: ทักษะด้านความรับผิดชอบ
- `PROACTIVE`: ทักษะด้านความกระตือรือร้น

### Example Usage

```javascript
// Get all special skills
const response = await fetch('/api/skills/special_skills', {
  credentials: 'include'
});
const data = await response.json();

// Display special skills
data.data.forEach(skill => {
  console.log(`${skill.name_EN} (${skill.category})`);
  console.log(`  Users: ${skill._count.userSpecialSkillLevels}`);
  console.log(`  History Records: ${skill._count.specialSkillHistory}`);
});

// Get specific special skill
const skillResponse = await fetch('/api/skills/special_skills?id=2', {
  credentials: 'include'
});
const skillData = await skillResponse.json();

// Get by category
const categoryResponse = await fetch('/api/skills/special_skills?category=DISCIPLINE', {
  credentials: 'include'
});
const categoryData = await categoryResponse.json();
```

---

## GET /api/skills/LevelThreshold

ดึงข้อมูล Level Thresholds

### Endpoint
```
GET /api/skills/LevelThreshold
```

### Authentication
Required - ACTIVITY_ADMIN, SKILL_ADMIN, or SUPREME role

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "levelTypes": {
    "I": "I",
    "II": "II",
    "III": "III",
    "IV": "IV"
  },
  "data": {
    "levelThresholds": [
      {
        "id": 1,
        "levelType": "I",
        "expRequired": 8,
        "levelName_TH": "ระดับเริ่มต้น",
        "levelName_EN": "Beginner"
      },
      {
        "id": 2,
        "levelType": "II",
        "expRequired": 16,
        "levelName_TH": "ระดับกลาง",
        "levelName_EN": "Intermediate"
      },
      {
        "id": 3,
        "levelType": "III",
        "expRequired": 32,
        "levelName_TH": "ระดับสูง",
        "levelName_EN": "Advanced"
      },
      {
        "id": 4,
        "levelType": "IV",
        "expRequired": 64,
        "levelName_TH": "ระดับผู้เชี่ยวชาญ",
        "levelName_EN": "Expert"
      }
    ]
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Insufficient permissions"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to fetch level thresholds"
}
```

### Business Logic

1. **Check Permissions**: ตรวจสอบว่าเป็น Admin
2. **Fetch Thresholds**: ดึงข้อมูล Level Thresholds ทั้งหมด
3. **Include Level Types**: รวม enum ของ level types
4. **Return Data**: ส่งข้อมูลกลับ

### Example Usage

```javascript
const response = await fetch('/api/skills/LevelThreshold', {
  credentials: 'include'
});
const data = await response.json();

// Display thresholds
data.data.levelThresholds.forEach(threshold => {
  console.log(`Level ${threshold.levelType}: ${threshold.expRequired} EXP per star`);
  console.log(`  ${threshold.levelName_EN} (${threshold.levelName_TH})`);
});

// Use in calculation
const thresholds = {};
data.data.levelThresholds.forEach(t => {
  thresholds[t.levelType] = t.expRequired;
});

// Calculate stars needed
const expToLevel = 100;
const level = 'II';
const starsNeeded = Math.ceil(expToLevel / thresholds[level]);
console.log(`Need ${starsNeeded} stars to reach ${expToLevel} EXP in Level ${level}`);
```

---

## Summary

### Main & Sub Skills Flow

```
1. User เข้าร่วมกิจกรรม
2. Admin เพิ่ม EXP ผ่าน POST /api/exp
3. ระบบคำนวณดาวและตรวจสอบการปลดล็อค
4. อัปเดต Sub Skill และ Main Skill Level
5. บันทึกประวัติ
6. ผู้ใช้เห็นความคืบหน้าผ่าน GET /api/exp หรือ /api/exp/lv
```

### Special Skills Flow

```
1. User เข้าร่วมกิจกรรม/มาสาย/ขาด
2. Admin เพิ่ม/หัก EXP ผ่าน POST /api/exp/special
3. ระบบคำนวณ Tier
4. บันทึก max tier และ statistics
5. บันทึกประวัติ
6. ผู้ใช้เห็นผลผ่าน GET /api/exp/special
```

### Key Differences

| Feature | Main/Sub Skills | Special Skills |
|---------|----------------|----------------|
| ระบบ Level | 4 Levels (I-IV) | Unlimited Tiers |
| การปลดล็อค | Progressive (ต้องปลดล็อคตามลำดับ) | ไม่มี (เริ่มที่ Tier 0) |
| EXP | เฉพาะบวก | บวกและลบได้ |
| Threshold | แตกต่างกันแต่ละ Level | เท่ากันทุก Tier (10 EXP) |
| สถิติ | Total Stars, Max Level | Positive/Negative Actions, Max Tier |
| การรวม | Aggregate ขึ้น Main Skill | ไม่มีการรวม |

### Best Practices

1. **เพิ่ม EXP**: เพิ่ม EXP ทีละเล็กน้อยเพื่อให้เห็นความคืบหน้า
2. **ตรวจสอบ Progress**: ใช้ GET APIs เพื่อดูความคืบหน้าก่อนเพิ่ม EXP
3. **บันทึก Reason**: ระบุ reason ที่ชัดเจนเพื่อให้ผู้ใช้เข้าใจ
4. **Reset อย่างระมัดระวัง**: Reset เฉพาะเมื่อจำเป็นจริงๆ
5. **Special Skills**: ใช้สำหรับทักษะที่ไม่ใช่ความรู้โดยตรง
6. **Monitor Max Tier**: ติดตาม max tier เพื่อให้รางวัล
7. **History**: ตรวจสอบ history เพื่อเข้าใจการเปลี่ยนแปลง

---

## Changelog

**Version 1.0.0** - February 27, 2026
- Initial API documentation
- Complete 4-Level System documentation
- Progressive Unlock Mechanism explanation
- Stored EXP Concept documentation
- Star Calculation formulas
- Main Skill Aggregation logic
- Special Skills Tier System
- All API endpoints documented with examples
