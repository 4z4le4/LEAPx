# Evaluations API

API สำหรับระบบแบบประเมินกิจกรรม รองรับทั้ง Pre-test และ Post-test พร้อมระบบคำนวณคะแนน และ Analytics

## Table of Contents

- [GET /api/events/[eventId]/evaluation](#get-apieventseventidevaluation) - ดึงรายการแบบประเมินทั้งหมด (Admin)
- [GET /api/events/[eventId]/evaluation/available](#get-apieventseventidevaluationavailable) - ดึงแบบประเมินที่พร้อมทำ (User)
- [POST /api/events/[eventId]/evaluation/[evaluationId]/submit](#post-apieventseventidevaluationevaluationidsubmit) - ส่งคำตอบแบบประเมิน
- [GET /api/events/[eventId]/evaluation/[evaluationId]/analytics](#get-apieventseventidevaluationevaluationidanalytics) - ดูสถิติและผลการประเมิน (Admin)
- [POST /api/events/[eventId]/evaluation/upload](#post-apieventseventidevaluationupload) - อัปโหลดแบบประเมินจาก Excel (Admin)
- [GET /api/events/[eventId]/evaluation/template](#get-apieventseventidevaluationtemplate) - ดาวน์โหลด Excel Template (Admin)

---

## Question Types

ระบบรองรับคำถาม 5 ประเภท:

### 1. TEXT
- ข้อความสั้น (Single line text)
- ไม่มีตัวเลือก
- ไม่มีการให้คะแนน (score = 0)
- ใช้สำหรับคำถามปลายเปิด

### 2. TEXTAREA
- ข้อความยาว (Multi-line text)
- ไม่มีตัวเลือก
- ไม่มีการให้คะแนน (score = 0)
- ใช้สำหรับคำตอบแบบอธิบาย

### 3. SINGLE_CHOICE
- เลือกตอบเพียง 1 ข้อ (Radio button)
- ต้องมีตัวเลือก (options) อย่างน้อย 1 ตัว
- แต่ละตัวเลือกมี score ได้
- คะแนนที่ได้ = score ของตัวเลือกที่เลือก
- maxScore = คะแนนสูงสุดของตัวเลือกทั้งหมด

**ตัวอย่าง Options:**
```json
[
  {
    "label": "น้อยมาก",
    "label_EN": "Very Low",
    "value": "น้อยมาก",
    "score": 1
  },
  {
    "label": "ปานกลาง",
    "label_EN": "Medium",
    "value": "ปานกลาง",
    "score": 3
  },
  {
    "label": "มากที่สุด",
    "label_EN": "Very High",
    "value": "มากที่สุด",
    "score": 5
  }
]
```

### 4. MULTIPLE_CHOICE
- เลือกได้หลายข้อ (Checkbox)
- ต้องมีตัวเลือก (options) อย่างน้อย 1 ตัว
- แต่ละตัวเลือกมี score ได้
- คะแนนที่ได้ = ผลรวม score ของทุกตัวเลือกที่เลือก
- maxScore = ผลรวม score ของตัวเลือกทั้งหมด

**ตัวอย่าง Options:**
```json
[
  {
    "label": "ทักษะการทำงานเป็นทีม",
    "label_EN": "Teamwork skills",
    "value": "teamwork",
    "score": 10
  },
  {
    "label": "ความคิดสร้างสรรค์",
    "label_EN": "Creativity",
    "value": "creativity",
    "score": 10
  },
  {
    "label": "การแก้ปัญหา",
    "label_EN": "Problem solving",
    "value": "problem_solving",
    "score": 10
  }
]
```

### 5. RATING
- ให้คะแนน 1-5 ดาว
- ไม่มีตัวเลือก
- คะแนนที่ได้ = ค่า rating ที่เลือก (1-5)
- maxScore = 5
- Validation: ต้องเป็นเลข 1-5 เท่านั้น

---

## Score Calculation

### การคำนวณคะแนนแต่ละคำถาม

| Question Type | Score Calculation |
|---------------|-------------------|
| TEXT | 0 (ไม่มีคะแนน) |
| TEXTAREA | 0 (ไม่มีคะแนน) |
| SINGLE_CHOICE | score ของตัวเลือกที่เลือก |
| MULTIPLE_CHOICE | ผลรวม score ของทุกตัวเลือกที่เลือก |
| RATING | ค่า rating (1-5) |

### การคำนวณคะแนนรวม

```
totalScore = ผลรวมคะแนนจากทุกคำถาม
maxScore = ผลรวม maxScore จากทุกคำถาม
percentage = (totalScore / maxScore) * 100
```

**ตัวอย่าง:**
- คำถามที่ 1 (SINGLE_CHOICE, maxScore: 5): ได้ 5 คะแนน
- คำถามที่ 2 (MULTIPLE_CHOICE, maxScore: 30): ได้ 20 คะแนน
- คำถามที่ 3 (TEXTAREA, maxScore: 0): ได้ 0 คะแนน
- คำถามที่ 4 (RATING, maxScore: 5): ได้ 4 คะแนน

```
totalScore = 5 + 20 + 0 + 4 = 29
maxScore = 5 + 30 + 0 + 5 = 40
percentage = (29 / 40) * 100 = 72.50%
```

---

## Time Window Management

แบบประเมินมีการกำหนดเวลาเปิด-ปิด:

### ฟิลด์การกำหนดเวลา

| Field | Type | Description |
|-------|------|-------------|
| openAt | DateTime \| null | เวลาเริ่มให้ทำแบบประเมิน (null = เปิดทันที) |
| closeAt | DateTime \| null | เวลาปิดแบบประเมิน (null = ไม่มีกำหนดปิด) |

### Logic การเปิดใช้งาน

แบบประเมินจะแสดงใน available API เมื่อ:

```typescript
const now = new Date();
const isOpen = (
  evaluation.isActive === true &&
  (evaluation.openAt === null || evaluation.openAt <= now) &&
  (evaluation.closeAt === null || evaluation.closeAt >= now)
);
```

### Error Messages

| Condition | Status | Error Message |
|-----------|--------|---------------|
| ยังไม่ถึงเวลาเปิด | 403 | "Evaluation is not open yet" |
| เลยเวลาปิดแล้ว | 403 | "Evaluation is closed" |
| ไม่มีหรือไม่ active | 404 | "Evaluation not found or not available" |

---

## Required Field Validation

### Question Level Validation

แต่ละคำถามมีฟิลด์ `isRequired`:
- `true`: ต้องตอบคำถามนี้ ไม่ตอบจะ submit ไม่ได้
- `false`: ไม่บังคับ สามารถข้ามได้

### Evaluation Level Validation

แบบประเมินมีฟิลด์ `isRequired`:
- `true`: ผู้เข้าร่วมต้องทำแบบประเมินนี้
- `false`: ทำหรือไม่ทำก็ได้

### Submit Validation

เมื่อ submit แบบประเมิน:

1. **ตรวจสอบคำถามบังคับ:**
```typescript
const missingRequired = [];
for (const question of questions) {
  if (question.isRequired && !hasAnswer(question.id)) {
    missingRequired.push(question.questionNumber);
  }
}

if (missingRequired.length > 0) {
  return error 400: {
    error: "Missing required questions",
    missingQuestions: [1, 3, 5] // Question numbers
  }
}
```

2. **ตรวจสอบ format คำตอบ:**
- TEXT/TEXTAREA: ต้องเป็น string
- SINGLE_CHOICE: ต้องเป็น string (1 ค่า)
- MULTIPLE_CHOICE: ต้องเป็น array of strings
- RATING: ต้องเป็นเลข 1-5

3. **ตรวจสอบว่าเคยส่งแล้วหรือยัง:**
- แต่ละคนทำได้ครั้งเดียว
- ถ้าทำไปแล้ว → Error 400: "You have already submitted this evaluation"

---

## GET /api/events/[eventId]/evaluation

ดึงรายการแบบประเมินทั้งหมดของกิจกรรม (สำหรับ Admin)

### Endpoint
```
GET /api/events/[eventId]/evaluation
```

### Authentication
Required - Activity Admin role

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventId | number | Event ID |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "event_id": 5,
      "type_evaluation": "PRE_TEST",
      "title_TH": "แบบทดสอบก่อนเรียน",
      "title_EN": "Pre-test",
      "description_TH": "ทดสอบความรู้พื้นฐาน",
      "description_EN": "Test basic knowledge",
      "isRequired": true,
      "isActive": true,
      "maxScore": 40,
      "openAt": "2026-02-01T00:00:00.000Z",
      "closeAt": "2026-02-28T23:59:59.000Z",
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-01T10:00:00.000Z",
      "questions": [
        {
          "id": 1,
          "questionNumber": 1,
          "question_TH": "คุณพอใจกับกิจกรรมนี้มากน้อยแค่ไหน?",
          "question_EN": "How satisfied are you with this event?",
          "type": "SINGLE_CHOICE",
          "isRequired": true,
          "options": [
            {
              "label": "น้อยมาก",
              "label_EN": "Very Low",
              "value": "น้อยมาก",
              "score": 1
            },
            {
              "label": "มากที่สุด",
              "label_EN": "Very High",
              "value": "มากที่สุด",
              "score": 5
            }
          ],
          "maxScore": 5
        },
        {
          "id": 2,
          "questionNumber": 2,
          "question_TH": "ข้อเสนอแนะ",
          "question_EN": "Feedback",
          "type": "TEXTAREA",
          "isRequired": false,
          "options": null,
          "maxScore": 0
        }
      ],
      "_count": {
        "responses": 15
      }
    }
  ]
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Response Fields

| Field | Description |
|-------|-------------|
| id | Evaluation ID |
| event_id | Event ID |
| type_evaluation | ประเภท: "PRE_TEST" หรือ "POST_TEST" |
| title_TH | ชื่อแบบประเมิน (ภาษาไทย) |
| title_EN | ชื่อแบบประเมิน (อังกฤษ) |
| isRequired | บังคับทำหรือไม่ |
| isActive | เปิดใช้งานหรือไม่ |
| maxScore | คะแนนเต็มรวม |
| openAt | เวลาเริ่มเปิด (null = เปิดทันที) |
| closeAt | เวลาปิด (null = ไม่กำหนด) |
| questions | รายการคำถาม (เรียงตาม questionNumber) |
| _count.responses | จำนวนคนที่ส่งแบบประเมินแล้ว |

### Example Usage

```javascript
const response = await fetch(`/api/events/${eventId}/evaluation`, {
  method: 'GET',
  credentials: 'include'
});

const data = await response.json();
console.log(`Found ${data.data.length} evaluations`);
```

---

## GET /api/events/[eventId]/evaluation/available

ดึงรายการแบบประเมินที่พร้อมให้ผู้ใช้ทำ

### Endpoint
```
GET /api/events/[eventId]/evaluation/available
```

### Authentication
Required - USER role + ต้องลงทะเบียนและเช็คอินกิจกรรมแล้ว

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventId | number | Event ID |

### Access Requirements

1. ผู้ใช้ต้อง login แล้ว
2. ต้องลงทะเบียนกิจกรรม (EventRegistration)
3. ต้องเช็คอินแล้ว (checkedIn = true)

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "evaluations": [
      {
        "id": 1,
        "title_TH": "แบบทดสอบก่อนเรียน",
        "title_EN": "Pre-test",
        "description_TH": "ทดสอบความรู้พื้นฐาน",
        "description_EN": "Test basic knowledge",
        "isRequired": true,
        "maxScore": 40,
        "closeAt": "2026-02-28T23:59:59.000Z",
        "questionCount": 4,
        "isCompleted": false,
        "submittedAt": null,
        "totalScore": null,
        "questions": [
          {
            "id": 1,
            "questionNumber": 1,
            "question_TH": "คำถามที่ 1",
            "question_EN": "Question 1",
            "type": "SINGLE_CHOICE",
            "isRequired": true,
            "options": [
              {
                "label": "ตัวเลือก A",
                "label_EN": "Option A",
                "value": "option_a",
                "score": 10
              }
            ],
            "maxScore": 10
          }
        ]
      },
      {
        "id": 2,
        "title_TH": "แบบประเมินหลังเรียน",
        "title_EN": "Post-test",
        "isRequired": false,
        "maxScore": 50,
        "closeAt": null,
        "questionCount": 5,
        "isCompleted": true,
        "submittedAt": "2026-02-15T14:30:00.000Z",
        "totalScore": 42,
        "questions": undefined
      }
    ],
    "registration": {
      "id": 123,
      "checkedIn": true,
      "checkInTime": "2026-02-15T09:00:00.000Z"
    }
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "User not found"
}
```

**403 Forbidden** - ไม่ได้ลงทะเบียนหรือเช็คอิน
```json
{
  "error": "You must register and check-in to access evaluations"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **ตรวจสอบสิทธิ์:**
   - User ต้อง login
   - ต้องมี EventRegistration record
   - checkedIn ต้องเป็น true

2. **Filter แบบประเมิน:**
   - isActive = true
   - openAt <= now (หรือ null)
   - closeAt >= now (หรือ null)

3. **ตรวจสอบสถานะการทำ:**
   - Query EvaluationResponse ของ user
   - ถ้าทำแล้ว: isCompleted = true, ไม่ส่ง questions
   - ถ้ายังไม่ทำ: isCompleted = false, ส่ง questions

### Example Usage

```javascript
const response = await fetch(`/api/events/${eventId}/evaluation/available`, {
  method: 'GET',
  credentials: 'include'
});

const data = await response.json();

// แสดงแบบประเมินที่ยังไม่ทำ
const pending = data.data.evaluations.filter(e => !e.isCompleted);
console.log(`You have ${pending.length} evaluations to complete`);
```

---

## POST /api/events/[eventId]/evaluation/[evaluationId]/submit

ส่งคำตอบแบบประเมิน

### Endpoint
```
POST /api/events/[eventId]/evaluation/[evaluationId]/submit
```

### Authentication
Required - USER role + ต้องลงทะเบียนและเช็คอินกิจกรรมแล้ว

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventId | number | Event ID |
| evaluationId | number | Evaluation ID |

### Request Body

```json
{
  "answers": [
    {
      "question_id": 1,
      "answer": "option_a"
    },
    {
      "question_id": 2,
      "answer": ["teamwork", "creativity"]
    },
    {
      "question_id": 3,
      "answer": "This is my feedback text"
    },
    {
      "question_id": 4,
      "answer": 4
    }
  ]
}
```

#### Answer Format by Question Type

| Question Type | Answer Format | Example |
|---------------|---------------|---------|
| TEXT | string | `"My answer"` |
| TEXTAREA | string | `"Long text..."` |
| SINGLE_CHOICE | string | `"option_a"` |
| MULTIPLE_CHOICE | string[] | `["option_a", "option_b"]` |
| RATING | number \| string | `4` หรือ `"4"` |

### Access Requirements

1. User ต้อง login
2. ต้องลงทะเบียนและเช็คอินกิจกรรม
3. แบบประเมินต้อง active และอยู่ในช่วงเวลาที่กำหนด
4. ต้องไม่เคยส่งแบบประเมินนี้มาก่อน

### Validation Rules

1. **Required Questions:**
   - ต้องตอบทุกคำถามที่ isRequired = true
   - ถ้าไม่ครบ → Error 400 พร้อม missingQuestions array

2. **Answer Format:**
   - ต้องตรง type ของคำถาม
   - RATING ต้องเป็น 1-5 (ต่ำกว่าหรือสูงกว่าจะถูกตั้งเป็น 0)

3. **Time Window:**
   - openAt <= now (ถ้ามี)
   - closeAt >= now (ถ้ามี)

4. **Duplicate Submission:**
   - ตรวจสอบว่าไม่เคยส่งแล้ว

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Evaluation submitted successfully",
  "data": {
    "response": {
      "id": 456,
      "totalScore": 29,
      "maxScore": 40,
      "percentage": "72.50",
      "submittedAt": "2026-02-15T14:30:00.000Z"
    }
  }
}
```

#### Error Responses

**400 Bad Request** - ข้อมูลไม่ถูกต้อง
```json
{
  "error": "Invalid answers format"
}
```

**400 Bad Request** - ไม่ตอบคำถามบังคับ
```json
{
  "error": "Missing required questions",
  "missingQuestions": [1, 3, 5]
}
```

**400 Bad Request** - ทำไปแล้ว
```json
{
  "error": "You have already submitted this evaluation"
}
```

**401 Unauthorized**
```json
{
  "error": "User not found"
}
```

**403 Forbidden** - ไม่มีสิทธิ์
```json
{
  "error": "You must register and check-in to submit evaluations"
}
```

**403 Forbidden** - ยังไม่เปิด
```json
{
  "error": "Evaluation is not open yet"
}
```

**403 Forbidden** - ปิดแล้ว
```json
{
  "error": "Evaluation is closed"
}
```

**404 Not Found**
```json
{
  "error": "Evaluation not found or not available"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Score Calculation Process

```typescript
// 1. สร้าง map ของคำถามและคำตอบ
const questionMap = Map<questionId, question>;
const answerMap = Map<questionId, answer>;

// 2. วน loop ตรวจสอบคำตอบแต่ละข้อ
let totalScore = 0;
for (const answer of answers) {
  const question = questionMap.get(answer.question_id);
  let score = 0;
  
  switch (question.type) {
    case 'TEXT':
    case 'TEXTAREA':
      score = 0;
      break;
      
    case 'SINGLE_CHOICE':
      const selected = options.find(opt => opt.value === answer);
      score = selected?.score || 0;
      break;
      
    case 'MULTIPLE_CHOICE':
      score = answer.reduce((sum, choice) => {
        const opt = options.find(o => o.value === choice);
        return sum + (opt?.score || 0);
      }, 0);
      break;
      
    case 'RATING':
      score = (answer >= 1 && answer <= 5) ? answer : 0;
      break;
  }
  
  totalScore += score;
}

// 3. บันทึกลง database
await prisma.evaluationResponse.create({
  data: {
    evaluation_id,
    user_id,
    registration_id,
    totalScore,
    answers: { create: answersArray }
  }
});
```

### Example Usage

```javascript
const submitEvaluation = async (evaluationId, answers) => {
  const response = await fetch(
    `/api/events/${eventId}/evaluation/${evaluationId}/submit`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    }
  );
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`Score: ${data.data.response.totalScore}/${data.data.response.maxScore}`);
    console.log(`Percentage: ${data.data.response.percentage}%`);
  } else {
    console.error('Submission failed:', data.error);
    if (data.missingQuestions) {
      console.log('Missing questions:', data.missingQuestions);
    }
  }
};

// ตัวอย่างการส่งคำตอบ
const answers = [
  { question_id: 1, answer: "มากที่สุด" },
  { question_id: 2, answer: ["teamwork", "creativity", "problem_solving"] },
  { question_id: 3, answer: "กิจกรรมดีมากครับ ได้เรียนรู้อะไรเยอะ" },
  { question_id: 4, answer: 5 }
];

await submitEvaluation(1, answers);
```

---

## GET /api/events/[eventId]/evaluation/[evaluationId]/analytics

ดูสถิติและผลการประเมิน (สำหรับ Admin)

### Endpoint
```
GET /api/events/[eventId]/evaluation/[evaluationId]/analytics
```

### Authentication
Required - Activity Admin role

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventId | number | Event ID |
| evaluationId | number | Evaluation ID |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "evaluation": {
      "id": 1,
      "title_TH": "แบบทดสอบก่อนเรียน",
      "title_EN": "Pre-test",
      "maxScore": 40
    },
    "summary": {
      "totalResponses": 15,
      "averageScore": 32.5,
      "percentage": 81.25
    },
    "questions": [
      {
        "id": 1,
        "questionNumber": 1,
        "question_TH": "คุณพอใจกับกิจกรรมนี้มากน้อยแค่ไหน?",
        "question_EN": "How satisfied are you with this event?",
        "type": "SINGLE_CHOICE",
        "responseCount": 15,
        "averageScore": 4.2,
        "choiceDistribution": {
          "น้อยมาก": 1,
          "น้อย": 2,
          "ปานกลาง": 3,
          "มาก": 5,
          "มากที่สุด": 4
        }
      },
      {
        "id": 2,
        "questionNumber": 2,
        "question_TH": "คุณได้เรียนรู้อะไรจากกิจกรรมนี้?",
        "question_EN": "What did you learn from this event?",
        "type": "MULTIPLE_CHOICE",
        "responseCount": 15,
        "averageScore": 18.67,
        "choiceDistribution": {
          "ทักษะการทำงานเป็นทีม": 12,
          "ความคิดสร้างสรรค์": 10,
          "การแก้ปัญหา": 14
        }
      },
      {
        "id": 3,
        "questionNumber": 3,
        "question_TH": "ข้อเสนอแนะเพิ่มเติม",
        "question_EN": "Additional feedback",
        "type": "TEXTAREA",
        "responseCount": 12,
        "textAnswers": [
          "กิจกรรมดีมากครับ",
          "อยากให้มีกิจกรรมแบบนี้บ่อยๆ",
          "...more answers..."
        ]
      },
      {
        "id": 4,
        "questionNumber": 4,
        "question_TH": "คะแนนโดยรวม (1-5)",
        "question_EN": "Overall rating (1-5)",
        "type": "RATING",
        "responseCount": 15,
        "averageScore": 4.5,
        "ratingDistribution": {
          "1": 0,
          "2": 1,
          "3": 2,
          "4": 5,
          "5": 7
        }
      }
    ],
    "responses": [
      {
        "id": 456,
        "user": {
          "id": 123,
          "firstName": "สมชาย",
          "lastName": "ใจดี",
          "email": "user@cmu.ac.th"
        },
        "totalScore": 35,
        "submittedAt": "2026-02-15T14:30:00.000Z",
        "answers": [
          {
            "questionNumber": 1,
            "question_TH": "คำถามที่ 1",
            "answerText": null,
            "answerChoices": ["มากที่สุด"],
            "answerRating": null,
            "score": 5
          },
          {
            "questionNumber": 2,
            "question_TH": "คำถามที่ 2",
            "answerText": null,
            "answerChoices": ["teamwork", "creativity", "problem_solving"],
            "answerRating": null,
            "score": 30
          },
          {
            "questionNumber": 3,
            "question_TH": "คำถามที่ 3",
            "answerText": "กิจกรรมดีมากครับ",
            "answerChoices": [],
            "answerRating": null,
            "score": 0
          },
          {
            "questionNumber": 4,
            "question_TH": "คำถามที่ 4",
            "answerText": null,
            "answerChoices": [],
            "answerRating": 5,
            "score": 5
          }
        ]
      }
    ]
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found**
```json
{
  "error": "Evaluation not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Analytics Data Structure

#### Summary
- **totalResponses**: จำนวนคนที่ทำแบบประเมินแล้ว
- **averageScore**: คะแนนเฉลี่ยของทุกคน
- **percentage**: เปอร์เซ็นต์เฉลี่ย (averageScore/maxScore * 100)

#### Question Analytics by Type

**SINGLE_CHOICE / MULTIPLE_CHOICE:**
- `choiceDistribution`: จำนวนคนที่เลือกแต่ละตัวเลือก
- `averageScore`: คะแนนเฉลี่ยของคำถามนี้

**RATING:**
- `ratingDistribution`: จำนวนคนที่ให้คะแนนแต่ละระดับ (1-5)
- `averageScore`: ค่าเฉลี่ยของ rating

**TEXT / TEXTAREA:**
- `textAnswers`: array ของคำตอบทั้งหมด (สำหรับ admin อ่าน)

#### Individual Responses
- รายละเอียดของแต่ละคนที่ทำแบบประเมิน
- แสดง user info, totalScore, และคำตอบแต่ละข้อ

### Example Usage

```javascript
const getAnalytics = async (eventId, evaluationId) => {
  const response = await fetch(
    `/api/events/${eventId}/evaluation/${evaluationId}/analytics`,
    {
      method: 'GET',
      credentials: 'include'
    }
  );
  
  const data = await response.json();
  
  if (data.success) {
    const { summary, questions, responses } = data.data;
    
    console.log(`Total Responses: ${summary.totalResponses}`);
    console.log(`Average Score: ${summary.averageScore}/${data.data.evaluation.maxScore}`);
    console.log(`Pass Rate: ${summary.percentage}%`);
    
    // แสดงสถิติแต่ละคำถาม
    questions.forEach(q => {
      console.log(`\nQuestion ${q.questionNumber}: ${q.question_EN}`);
      console.log(`Responses: ${q.responseCount}`);
      
      if (q.choiceDistribution) {
        console.log('Choice Distribution:', q.choiceDistribution);
      }
      
      if (q.ratingDistribution) {
        console.log('Rating Distribution:', q.ratingDistribution);
        console.log(`Average Rating: ${q.averageScore}/5`);
      }
      
      if (q.textAnswers) {
        console.log(`Text Answers (${q.textAnswers.length}):`);
        q.textAnswers.forEach((text, i) => {
          console.log(`${i + 1}. ${text}`);
        });
      }
    });
  }
};
```

---

## POST /api/events/[eventId]/evaluation/upload

อัปโหลดแบบประเมินจากไฟล์ Excel (สำหรับ Admin)

### Endpoint
```
POST /api/events/[eventId]/evaluation/upload
```

### Authentication
Required - Activity Admin role

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventId | number | Event ID |

### Request Body

Content-Type: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Excel file (.xlsx) |
| type_evaluation | string | Yes | "PRE_TEST" หรือ "POST_TEST" |
| title_TH | string | Yes | ชื่อแบบประเมิน (ภาษาไทย) |
| title_EN | string | Yes | ชื่อแบบประเมิน (อังกฤษ) |
| description_TH | string | No | คำอธิบาย (ภาษาไทย) |
| description_EN | string | No | คำอธิบาย (อังกฤษ) |
| isRequired | string | No | "true" หรือ "false" (default: false) |
| openAt | string | No | ISO datetime เวลาเปิด |
| closeAt | string | No | ISO datetime เวลาปิด |

### Excel File Format

Excel file ต้องมีโครงสร้างดังนี้:

#### Column Headers

| Column | Description | Example |
|--------|-------------|---------|
| Type | "QUESTION" หรือ "OPTION" | QUESTION |
| Question Number | เลขที่คำถาม (1, 2, 3, ...) | 1 |
| Question Type | TEXT / TEXTAREA / SINGLE_CHOICE / MULTIPLE_CHOICE / RATING | SINGLE_CHOICE |
| Question (TH) | คำถาม (ภาษาไทย) | คุณพอใจกับกิจกรรมนี้มากน้อยแค่ไหน? |
| Question (EN) | คำถาม (อังกฤษ) | How satisfied are you? |
| Is Required | TRUE หรือ FALSE | TRUE |
| Max Score | คะแนนเต็มของคำถาม | 5 |
| Option Label (TH) | ชื่อตัวเลือก (ภาษาไทย) | มากที่สุด |
| Option Label (EN) | ชื่อตัวเลือก (อังกฤษ) | Very High |
| Option Score | คะแนนของตัวเลือก | 5 |

#### Row Structure

**สำหรับคำถามที่ไม่มีตัวเลือก (TEXT, TEXTAREA, RATING):**
```
Type      | Q# | Type     | Question (TH) | Question (EN) | Required | MaxScore | Label(TH) | Label(EN) | Score
----------|----|-----------|--------------  |---------------|----------|----------|-----------|-----------|------
QUESTION  | 1  | TEXTAREA | ข้อเสนอแนะ    | Feedback      | FALSE    | 0        |           |           |
```

**สำหรับคำถามที่มีตัวเลือก (SINGLE_CHOICE, MULTIPLE_CHOICE):**
```
Type      | Q# | Type           | Question (TH)      | Question (EN)      | Required | MaxScore | Label(TH)  | Label(EN) | Score
----------|----| ---------------|--------------------|--------------------|----------|----------|------------|-----------|------
QUESTION  | 1  | SINGLE_CHOICE | คุณพอใจมากน้อย?    | How satisfied?     | TRUE     | 5        |            |           |
OPTION    | 1  |                |                    |                    |          |          | น้อยมาก    | Very Low  | 1
OPTION    | 1  |                |                    |                    |          |          | น้อย       | Low       | 2
OPTION    | 1  |                |                    |                    |          |          | ปานกลาง    | Medium    | 3
OPTION    | 1  |                |                    |                    |          |          | มาก        | High      | 4
OPTION    | 1  |                |                    |                    |          |          | มากที่สุด  | Very High | 5
```

### Validation Rules

1. **Type Validation:**
   - Type ต้องเป็น "QUESTION" หรือ "OPTION" เท่านั้น

2. **Question Type Validation:**
   - ต้องเป็น: TEXT, TEXTAREA, SINGLE_CHOICE, MULTIPLE_CHOICE, RATING

3. **Question Number:**
   - ต้องเป็นตัวเลข
   - ไม่ซ้ำกัน
   - OPTION rows ต้องอ้างอิง Question Number ที่มีอยู่

4. **Required Fields:**
   - QUESTION row: Type, Question Number, Question Type, Question (TH), Question (EN)
   - OPTION row: Type, Question Number, Option Label (TH), Option Score

5. **Options Validation:**
   - SINGLE_CHOICE และ MULTIPLE_CHOICE ต้องมี OPTION อย่างน้อย 1 ตัว
   - TEXT, TEXTAREA, RATING ต้องไม่มี OPTION
   - Option Label ต้องไม่ซ้ำในคำถามเดียวกัน

6. **Score Validation:**
   - Option Score ต้องเป็นตัวเลข

### Response

#### Success (201 Created)

```json
{
  "success": true,
  "message": "Evaluation created successfully",
  "data": {
    "evaluation": {
      "id": 5,
      "title_TH": "แบบทดสอบก่อนเรียน",
      "title_EN": "Pre-test",
      "maxScore": 40,
      "questionCount": 4
    }
  }
}
```

#### Error Responses

**400 Bad Request** - ไม่มีไฟล์
```json
{
  "error": "No file uploaded"
}
```

**400 Bad Request** - type_evaluation ผิด
```json
{
  "error": "Invalid or missing type_evaluation"
}
```

**400 Bad Request** - ไม่มี title
```json
{
  "error": "Title is required"
}
```

**400 Bad Request** - Excel ว่าง
```json
{
  "error": "Excel file is empty"
}
```

**400 Bad Request** - Validation errors
```json
{
  "error": "Validation errors found in Excel file",
  "errors": [
    {
      "row": 5,
      "reason": "Missing required question fields (Type, Question TH, Question EN)"
    },
    {
      "row": 8,
      "reason": "Invalid question type: MULTI. Must be one of: TEXT, TEXTAREA, SINGLE_CHOICE, MULTIPLE_CHOICE, RATING"
    },
    {
      "row": 12,
      "reason": "Option references non-existent Question Number 10"
    }
  ],
  "totalErrors": 3
}
```

**400 Bad Request** - Question-Option mismatch
```json
{
  "error": "Question validation errors",
  "errors": [
    {
      "row": 5,
      "reason": "Question 2 (SINGLE_CHOICE) requires at least one OPTION row"
    },
    {
      "row": 10,
      "reason": "Question 4 (TEXT) should not have OPTION rows"
    }
  ],
  "totalErrors": 2
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
  "error": "Error message"
}
```

### Example Usage

#### JavaScript (FormData)

```javascript
const uploadEvaluation = async (eventId, fileInput, metadata) => {
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('type_evaluation', metadata.type_evaluation);
  formData.append('title_TH', metadata.title_TH);
  formData.append('title_EN', metadata.title_EN);
  formData.append('description_TH', metadata.description_TH || '');
  formData.append('description_EN', metadata.description_EN || '');
  formData.append('isRequired', metadata.isRequired.toString());
  
  if (metadata.openAt) {
    formData.append('openAt', new Date(metadata.openAt).toISOString());
  }
  if (metadata.closeAt) {
    formData.append('closeAt', new Date(metadata.closeAt).toISOString());
  }
  
  const response = await fetch(
    `/api/events/${eventId}/evaluation/upload`,
    {
      method: 'POST',
      credentials: 'include',
      body: formData
    }
  );
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`Evaluation created: ${data.data.evaluation.id}`);
    console.log(`Questions: ${data.data.evaluation.questionCount}`);
    console.log(`Max Score: ${data.data.evaluation.maxScore}`);
  } else {
    console.error('Upload failed:', data.error);
    if (data.errors) {
      data.errors.forEach(err => {
        console.error(`Row ${err.row}: ${err.reason}`);
      });
    }
  }
};

// ตัวอย่างการใช้งาน
const fileInput = document.getElementById('excelFile');
const metadata = {
  type_evaluation: 'PRE_TEST',
  title_TH: 'แบบทดสอบก่อนเรียน',
  title_EN: 'Pre-test',
  description_TH: 'ทดสอบความรู้พื้นฐาน',
  description_EN: 'Test basic knowledge',
  isRequired: true,
  openAt: '2026-02-01T00:00:00Z',
  closeAt: '2026-02-28T23:59:59Z'
};

await uploadEvaluation(5, fileInput, metadata);
```

#### cURL

```bash
curl -X POST https://api.example.com/api/events/5/evaluation/upload \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -F "file=@evaluation.xlsx" \
  -F "type_evaluation=PRE_TEST" \
  -F "title_TH=แบบทดสอบก่อนเรียน" \
  -F "title_EN=Pre-test" \
  -F "description_TH=ทดสอบความรู้พื้นฐาน" \
  -F "description_EN=Test basic knowledge" \
  -F "isRequired=true" \
  -F "openAt=2026-02-01T00:00:00Z" \
  -F "closeAt=2026-02-28T23:59:59Z"
```

---

## GET /api/events/[eventId]/evaluation/template

ดาวน์โหลดไฟล์ Excel Template สำหรับสร้างแบบประเมิน (สำหรับ Admin)

### Endpoint
```
GET /api/events/[eventId]/evaluation/template
```

### Authentication
Required - Activity Admin role

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventId | number | Event ID |

### Response

#### Success (200 OK)

- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition**: `attachment; filename="evaluation_template_event_{eventId}.xlsx"`
- **Body**: Excel file binary

Excel file จะมี 2 sheets:

#### Sheet 1: "Evaluation" (ตัวอย่างแบบประเมิน)

มีคำถามตัวอย่าง 4 ข้อ:
1. SINGLE_CHOICE - คำถามความพึงพอใจ (5 ตัวเลือก)
2. MULTIPLE_CHOICE - คำถามเลือกหลายข้อ (3 ตัวเลือก)
3. TEXTAREA - ข้อเสนอแนะ (ไม่มีตัวเลือก)
4. RATING - คะแนนโดยรวม (ไม่มีตัวเลือก)

#### Sheet 2: "Instructions" (คำแนะนำ)

มีคำแนะนำการใช้งาน template:
- โครงสร้างของไฟล์
- ประเภทคำถามที่รองรับ
- รูปแบบการเขียน QUESTION และ OPTION rows
- ตัวอย่างการใช้งาน
- Tips และข้อควรระวัง

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
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
  "error": "Error message"
}
```

### Template Structure

```
Sheet: Evaluation
┌──────────┬──────────┬──────────────┬────────────────┬────────────────┬─────────┬──────────┬───────────┬───────────┬───────┐
│ Type     │ Q Number │ Q Type       │ Question (TH)  │ Question (EN)  │ Required│ MaxScore │ Label(TH) │ Label(EN) │ Score │
├──────────┼──────────┼──────────────┼────────────────┼────────────────┼─────────┼──────────┼───────────┼───────────┼───────┤
│ QUESTION │ 1        │SINGLE_CHOICE │ คุณพอใจ...     │ How satisfied..│ TRUE    │ 5        │           │           │       │
│ OPTION   │ 1        │              │                │                │         │          │ น้อยมาก   │ Very Low  │ 1     │
│ OPTION   │ 1        │              │                │                │         │          │ น้อย      │ Low       │ 2     │
│ OPTION   │ 1        │              │                │                │         │          │ ปานกลาง   │ Medium    │ 3     │
│ OPTION   │ 1        │              │                │                │         │          │ มาก       │ High      │ 4     │
│ OPTION   │ 1        │              │                │                │         │          │ มากที่สุด │ Very High │ 5     │
│ QUESTION │ 2        │MULTIPLE_...  │ คุณได้เรียนรู้..│ What did you...│ FALSE   │ 30       │           │           │       │
│ OPTION   │ 2        │              │                │                │         │          │ ทีมเวิร์ก  │ Teamwork  │ 10    │
│ OPTION   │ 2        │              │                │                │         │          │ ความคิด... │ Creativity│ 10    │
│ OPTION   │ 2        │              │                │                │         │          │ แก้ปัญหา  │ Problem...│ 10    │
│ QUESTION │ 3        │ TEXTAREA     │ ข้อเสนอแนะ     │ Feedback       │ FALSE   │ 0        │           │           │       │
│ QUESTION │ 4        │ RATING       │ คะแนนโดยรวม    │ Overall rating │ TRUE    │ 5        │           │           │       │
└──────────┴──────────┴──────────────┴────────────────┴────────────────┴─────────┴──────────┴───────────┴───────────┴───────┘
```

### Example Usage

#### JavaScript (Download)

```javascript
const downloadTemplate = async (eventId) => {
  const response = await fetch(
    `/api/events/${eventId}/evaluation/template`,
    {
      method: 'GET',
      credentials: 'include'
    }
  );
  
  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluation_template_event_${eventId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } else {
    console.error('Download failed');
  }
};

// ดาวน์โหลด template
await downloadTemplate(5);
```

#### cURL

```bash
curl -X GET https://api.example.com/api/events/5/evaluation/template \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -o evaluation_template.xlsx
```

### Workflow

1. **Download Template:**
   ```javascript
   await downloadTemplate(eventId);
   ```

2. **Edit Excel:**
   - เปิดไฟล์ evaluation_template.xlsx
   - อ่าน Instructions sheet
   - แก้ไข Evaluation sheet ตามต้องการ
   - เพิ่มคำถามและตัวเลือกตามรูปแบบที่กำหนด

3. **Upload Evaluation:**
   ```javascript
   await uploadEvaluation(eventId, fileInput, metadata);
   ```

---

## Common Workflows

### Workflow 1: Admin สร้างแบบประเมิน

```javascript
// 1. ดาวน์โหลด template
const response = await fetch(`/api/events/${eventId}/evaluation/template`, {
  method: 'GET',
  credentials: 'include'
});
const blob = await response.blob();
// Save to disk

// 2. แก้ไข Excel file
// ... user edits the file ...

// 3. อัปโหลดแบบประเมิน
const formData = new FormData();
formData.append('file', editedFile);
formData.append('type_evaluation', 'PRE_TEST');
formData.append('title_TH', 'แบบทดสอบก่อนเรียน');
formData.append('title_EN', 'Pre-test');
formData.append('isRequired', 'true');
formData.append('openAt', '2026-02-01T00:00:00Z');
formData.append('closeAt', '2026-02-28T23:59:59Z');

const uploadResponse = await fetch(
  `/api/events/${eventId}/evaluation/upload`,
  {
    method: 'POST',
    credentials: 'include',
    body: formData
  }
);

// 4. ตรวจสอบรายการแบบประเมิน
const listResponse = await fetch(
  `/api/events/${eventId}/evaluation`,
  {
    method: 'GET',
    credentials: 'include'
  }
);
const evaluations = await listResponse.json();
```

### Workflow 2: User ทำแบบประเมิน

```javascript
// 1. ดึงรายการแบบประเมินที่พร้อมทำ
const response = await fetch(
  `/api/events/${eventId}/evaluation/available`,
  {
    method: 'GET',
    credentials: 'include'
  }
);
const { data } = await response.json();
const pendingEvaluations = data.evaluations.filter(e => !e.isCompleted);

// 2. แสดงแบบประเมินแรกที่ยังไม่ทำ
const evaluation = pendingEvaluations[0];
console.log(`Please complete: ${evaluation.title_EN}`);
console.log(`Questions: ${evaluation.questionCount}`);

// 3. รับคำตอบจาก user
const answers = [];
evaluation.questions.forEach(q => {
  console.log(`Q${q.questionNumber}: ${q.question_EN}`);
  console.log(`Type: ${q.type}, Required: ${q.isRequired}`);
  
  if (q.options) {
    q.options.forEach(opt => {
      console.log(`  - ${opt.label_EN} (${opt.score} points)`);
    });
  }
  
  // Get user input
  const userAnswer = getUserInput(q);
  answers.push({
    question_id: q.id,
    answer: userAnswer
  });
});

// 4. ส่งคำตอบ
const submitResponse = await fetch(
  `/api/events/${eventId}/evaluation/${evaluation.id}/submit`,
  {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers })
  }
);

const result = await submitResponse.json();
if (result.success) {
  console.log(`Score: ${result.data.response.totalScore}/${result.data.response.maxScore}`);
  console.log(`Percentage: ${result.data.response.percentage}%`);
}
```

### Workflow 3: Admin ดูผลการประเมิน

```javascript
// 1. ดูรายการแบบประเมินทั้งหมด
const listResponse = await fetch(
  `/api/events/${eventId}/evaluation`,
  {
    method: 'GET',
    credentials: 'include'
  }
);
const { data: evaluations } = await listResponse.json();

// 2. เลือกแบบประเมินที่ต้องการดูสถิติ
const evaluation = evaluations[0];
console.log(`${evaluation.title_EN}: ${evaluation._count.responses} responses`);

// 3. ดึง analytics
const analyticsResponse = await fetch(
  `/api/events/${eventId}/evaluation/${evaluation.id}/analytics`,
  {
    method: 'GET',
    credentials: 'include'
  }
);
const analytics = await analyticsResponse.json();

// 4. แสดงสถิติ
const { summary, questions, responses } = analytics.data;
console.log(`\n=== Summary ===`);
console.log(`Total Responses: ${summary.totalResponses}`);
console.log(`Average Score: ${summary.averageScore}/${analytics.data.evaluation.maxScore}`);
console.log(`Percentage: ${summary.percentage}%`);

console.log(`\n=== Question Analytics ===`);
questions.forEach(q => {
  console.log(`\nQ${q.questionNumber}: ${q.question_EN}`);
  console.log(`Responses: ${q.responseCount}`);
  
  if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') {
    console.log(`Average Score: ${q.averageScore}`);
    console.log('Distribution:');
    Object.entries(q.choiceDistribution).forEach(([choice, count]) => {
      const percentage = (count / q.responseCount * 100).toFixed(1);
      console.log(`  ${choice}: ${count} (${percentage}%)`);
    });
  }
  
  if (q.type === 'RATING') {
    console.log(`Average Rating: ${q.averageScore}/5`);
    console.log('Distribution:');
    for (let i = 1; i <= 5; i++) {
      const count = q.ratingDistribution[i] || 0;
      const percentage = (count / q.responseCount * 100).toFixed(1);
      console.log(`  ${i} star: ${count} (${percentage}%)`);
    }
  }
  
  if (q.type === 'TEXT' || q.type === 'TEXTAREA') {
    console.log(`Text Answers (${q.textAnswers.length}):`);
    q.textAnswers.slice(0, 3).forEach((text, i) => {
      console.log(`  ${i + 1}. ${text}`);
    });
    if (q.textAnswers.length > 3) {
      console.log(`  ... and ${q.textAnswers.length - 3} more`);
    }
  }
});
```

---

## Error Handling Best Practices

### 1. Handle Missing Questions

```javascript
try {
  const response = await fetch(url, { method: 'POST', body });
  const data = await response.json();
  
  if (response.status === 400 && data.missingQuestions) {
    // แสดง error ที่คำถามที่ไม่ได้ตอบ
    data.missingQuestions.forEach(questionNumber => {
      const questionElement = document.querySelector(
        `[data-question-number="${questionNumber}"]`
      );
      questionElement.classList.add('error');
      questionElement.scrollIntoView({ behavior: 'smooth' });
    });
    
    alert(`กรุณาตอบคำถามข้อที่: ${data.missingQuestions.join(', ')}`);
  }
} catch (error) {
  console.error('Submission error:', error);
}
```

### 2. Handle Time Window Errors

```javascript
try {
  const response = await fetch(url);
  const data = await response.json();
  
  if (response.status === 403) {
    if (data.error.includes('not open yet')) {
      const openDate = new Date(evaluation.openAt);
      alert(`แบบประเมินจะเปิดในวันที่ ${openDate.toLocaleDateString()}`);
    } else if (data.error.includes('closed')) {
      alert('แบบประเมินปิดรับคำตอบแล้ว');
    }
  }
} catch (error) {
  console.error('Error:', error);
}
```

### 3. Handle Upload Validation Errors

```javascript
const uploadWithValidation = async (eventId, file, metadata) => {
  const formData = new FormData();
  formData.append('file', file);
  // ... append other fields ...
  
  const response = await fetch(
    `/api/events/${eventId}/evaluation/upload`,
    {
      method: 'POST',
      credentials: 'include',
      body: formData
    }
  );
  
  const data = await response.json();
  
  if (response.status === 400 && data.errors) {
    // แสดง validation errors ในรูปแบบตาราง
    console.error(`Found ${data.totalErrors} errors:`);
    console.table(data.errors);
    
    // สร้าง error report
    const errorReport = data.errors
      .map(err => `Row ${err.row}: ${err.reason}`)
      .join('\n');
    
    alert(`กรุณาแก้ไขข้อผิดพลาดในไฟล์ Excel:\n\n${errorReport}`);
    
    return false;
  }
  
  return true;
};
```

---

## Security Considerations

1. **Authentication & Authorization:**
   - Admin APIs: ต้องมี Activity Admin role
   - User APIs: ต้อง login และเช็คอินกิจกรรม
   - Analytics: เฉพาะ Admin เท่านั้น

2. **Data Validation:**
   - Validate question types
   - Validate answer formats
   - Check required fields
   - Prevent duplicate submissions

3. **File Upload Security:**
   - Validate file type (.xlsx only)
   - Limit file size
   - Validate Excel structure
   - Sanitize input data

4. **Privacy:**
   - User responses แสดงเฉพาะ Admin
   - Analytics ไม่แสดง sensitive user info
   - Text answers สามารถมี sensitive data

5. **Rate Limiting:**
   - Upload API ควรมี rate limit
   - Submit API ป้องกัน spam submissions

---

## Performance Optimization

### 1. Caching Strategies

```javascript
// Cache available evaluations
const getCachedEvaluations = async (eventId) => {
  const cacheKey = `evaluations_${eventId}`;
  const cached = sessionStorage.getItem(cacheKey);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    
    // Cache valid for 5 minutes
    if (age < 5 * 60 * 1000) {
      return data;
    }
  }
  
  const response = await fetch(
    `/api/events/${eventId}/evaluation/available`,
    { credentials: 'include' }
  );
  const data = await response.json();
  
  sessionStorage.setItem(cacheKey, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
  
  return data;
};
```

### 2. Lazy Loading Questions

```javascript
// โหลดคำถามเมื่อ user เริ่มทำแบบประเมิน
const loadQuestions = async (evaluationId) => {
  const response = await fetch(
    `/api/events/${eventId}/evaluation/available`,
    { credentials: 'include' }
  );
  const { data } = await response.json();
  const evaluation = data.evaluations.find(e => e.id === evaluationId);
  
  return evaluation.questions;
};
```

### 3. Batch Analytics Loading

```javascript
// โหลด analytics หลายแบบประเมินพร้อมกัน
const loadAllAnalytics = async (eventId, evaluationIds) => {
  const promises = evaluationIds.map(id =>
    fetch(`/api/events/${eventId}/evaluation/${id}/analytics`, {
      credentials: 'include'
    }).then(r => r.json())
  );
  
  const results = await Promise.all(promises);
  return results;
};
```

---

## Testing Examples

### Test 1: Upload Evaluation

```bash
# Create test Excel file first
curl -X POST http://localhost:3000/api/events/1/evaluation/upload \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -F "file=@test_evaluation.xlsx" \
  -F "type_evaluation=PRE_TEST" \
  -F "title_TH=ทดสอบระบบ" \
  -F "title_EN=System Test" \
  -F "isRequired=true"
```

### Test 2: Get Available Evaluations

```bash
curl -X GET http://localhost:3000/api/events/1/evaluation/available \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  | jq '.data.evaluations[] | {id, title_EN, isCompleted}'
```

### Test 3: Submit Evaluation

```bash
curl -X POST http://localhost:3000/api/events/1/evaluation/1/submit \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"question_id": 1, "answer": "มากที่สุด"},
      {"question_id": 2, "answer": ["teamwork", "creativity"]},
      {"question_id": 3, "answer": "Very good event"},
      {"question_id": 4, "answer": 5}
    ]
  }'
```

### Test 4: Get Analytics

```bash
curl -X GET http://localhost:3000/api/events/1/evaluation/1/analytics \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  | jq '{
    totalResponses: .data.summary.totalResponses,
    avgScore: .data.summary.averageScore,
    percentage: .data.summary.percentage
  }'
```

### Test 5: Download Template

```bash
curl -X GET http://localhost:3000/api/events/1/evaluation/template \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -o template.xlsx
```

---

## Migration & Backward Compatibility

### Database Schema

แบบประเมินใช้ tables:
- `EventEvaluation` - ข้อมูลแบบประเมิน
- `EvaluationQuestion` - คำถาม
- `EvaluationResponse` - คำตอบของผู้ใช้
- `EvaluationAnswer` - คำตอบแต่ละข้อ

### Type Enums

```typescript
enum QuestionType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  RATING = 'RATING'
}

enum EvaluationType {
  PRE_TEST = 'PRE_TEST',
  POST_TEST = 'POST_TEST'
}
```

---

## Troubleshooting

### Problem 1: "You have already submitted this evaluation"
**Cause:** User พยายามส่งแบบประเมินซ้ำ  
**Solution:** แต่ละคนทำได้แค่ครั้งเดียว ตรวจสอบว่าทำไปแล้วหรือยัง

### Problem 2: "Missing required questions"
**Cause:** ไม่ได้ตอบคำถามบังคับ  
**Solution:** ตอบทุกคำถามที่มี isRequired = true

### Problem 3: "Evaluation is closed"
**Cause:** เลยเวลาปิดแบบประเมิน  
**Solution:** ติดต่อ Admin เพื่อขยายเวลา

### Problem 4: "Validation errors found in Excel file"
**Cause:** Excel file มีรูปแบบไม่ถูกต้อง  
**Solution:** ตรวจสอบ errors array และแก้ไขตาม error messages

### Problem 5: Analytics ไม่แสดงข้อมูล
**Cause:** ยังไม่มีคนทำแบบประเมิน  
**Solution:** รอให้มีผู้ส่งคำตอบก่อน

---
