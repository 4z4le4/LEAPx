# Major Category Management API

API สำหรับการจัดการหมวดหมู่สาขาวิชาและ administrators

## Table of Contents

### Major Categories
- [GET /api/major/category](#get-apimajorcategory) - ดึงรายการ major categories
- [POST /api/major/category](#post-apimajorcategory) - สร้าง major category ใหม่
- [PUT /api/major/category](#put-apimajorcategory) - อัปเดต major category
- [DELETE /api/major/category](#delete-apimajorcategory) - ลบ major category

### Major Administrators
- [GET /api/major/manage](#get-apimajormanage) - ดึงรายการ major admins
- [POST /api/major/manage](#post-apimajormanage) - เพิ่ม major admin
- [PUT /api/major/manage](#put-apimajormanage) - อัปเดต major admin role
- [DELETE /api/major/manage](#delete-apimajormanage) - ลบ major admin

### User Major Admin Roles
- [GET /api/major/check](#get-apimajorcheck) - ตรวจสอบ major admin roles ของ user

---

## GET /api/major/category

ดึงรายการ major categories

### Endpoint
```
GET /api/major/category?id={id}&code={code}&isActive={isActive}&includeAdmins={includeAdmins}&includeEvents={includeEvents}
```

### Authentication
Required - User Authentication

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | No | Major category ID (ระบุเพื่อดึงรายการเดียว) |
| code | string | No | Major code (เช่น "CPE", "EE") |
| isActive | boolean | No | กรองตามสถานะ active/inactive |
| includeAdmins | boolean | No | รวมรายชื่อ admins (default: false) |
| includeEvents | boolean | No | รวมรายการ events (default: false) |

### Response

#### Success - Single Major (200 OK)

```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "CPE",
    "name_TH": "วิศวกรรมคอมพิวเตอร์",
    "name_EN": "Computer Engineering",
    "faculty_TH": "คณะวิศวกรรมศาสตร์",
    "faculty_EN": "Faculty of Engineering",
    "description_TH": "สาขาวิชาวิศวกรรมคอมพิวเตอร์",
    "description_EN": "Computer Engineering Department",
    "icon": "Cpu",
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z",
    "admins": [
      {
        "id": 1,
        "user_id": 10,
        "majorCategory_id": 1,
        "role": "OWNER",
        "assignedAt": "2024-01-01T10:00:00Z",
        "isActive": true,
        "user": {
          "id": 10,
          "firstName": "สมชาย",
          "lastName": "ใจดี",
          "email": "somchai@cmu.ac.th",
          "photo": "https://example.com/photo.jpg"
        }
      }
    ],
    "events": [
      {
        "id": 5,
        "title_TH": "กิจกรรมวันคอมพิวเตอร์",
        "title_EN": "Computer Day Event",
        "status": "PUBLISHED",
        "activityStart": "2024-02-01T09:00:00Z",
        "activityEnd": "2024-02-01T17:00:00Z"
      }
    ]
  }
}
```

#### Success - Multiple Majors (200 OK)

```json
{
  "success": true,
  "total": 15,
  "data": [
    {
      "id": 1,
      "code": "CPE",
      "name_TH": "วิศวกรรมคอมพิวเตอร์",
      "name_EN": "Computer Engineering",
      "faculty_TH": "คณะวิศวกรรมศาสตร์",
      "faculty_EN": "Faculty of Engineering",
      "icon": "Cpu",
      "isActive": true
    },
    {
      "id": 2,
      "code": "EE",
      "name_TH": "วิศวกรรมไฟฟ้า",
      "name_EN": "Electrical Engineering",
      "faculty_TH": "คณะวิศวกรรมศาสตร์",
      "faculty_EN": "Faculty of Engineering",
      "icon": "Zap",
      "isActive": true
    }
  ]
}
```

#### Error Responses

**404 Not Found** - ไม่พบ major category
```json
{
  "error": "Major category not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Query Modes**:
   - ระบุ `id` → ส่งรายการเดียว (single object)
   - ไม่ระบุ `id` → ส่งรายการทั้งหมด (array)

2. **Sorting**:
   - Active majors ก่อน
   - เรียงตาม code (A-Z)

3. **Include Options**:
   - `includeAdmins=true` → รวม admin list (เฉพาะ active)
   - `includeEvents=true` → รวม published events (ล่าสุด 10 รายการ)

### Example Usage

#### Get All Active Majors

```bash
curl "https://api.example.com/api/major/category?isActive=true" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

#### Get Single Major with Admins

```bash
curl "https://api.example.com/api/major/category?id=1&includeAdmins=true" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

#### Get Major by Code

```bash
curl "https://api.example.com/api/major/category?code=CPE" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

---

## POST /api/major/category

สร้าง major category ใหม่ (SUPREME only)

### Endpoint
```
POST /api/major/category
```

### Authentication
Required - SUPREME role only

### Request Body

```json
{
  "code": "CPE",
  "name_TH": "วิศวกรรมคอมพิวเตอร์",
  "name_EN": "Computer Engineering",
  "faculty_TH": "คณะวิศวกรรมศาสตร์",
  "faculty_EN": "Faculty of Engineering",
  "description_TH": "สาขาวิชาวิศวกรรมคอมพิวเตอร์",
  "description_EN": "Computer Engineering Department",
  "icon": "Cpu",
  "isActive": true
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | Yes | รหัสสาขา (unique, uppercase) เช่น "CPE", "EE" |
| name_TH | string | Yes | ชื่อสาขา (ไทย) |
| name_EN | string | Yes | ชื่อสาขา (อังกฤษ) |
| faculty_TH | string | No | ชื่อคณะ (ไทย) |
| faculty_EN | string | No | ชื่อคณะ (อังกฤษ) |
| description_TH | string | No | คำอธิบาย (ไทย) |
| description_EN | string | No | คำอธิบาย (อังกฤษ) |
| icon | string | No | ชื่อ icon (Lucide icon name) |
| isActive | boolean | No | เปิดใช้งานทันทีหรือไม่ (default: true) |

### Response

#### Success (201 Created)

```json
{
  "success": true,
  "message": "Major category created successfully",
  "data": {
    "id": 10,
    "code": "CPE",
    "name_TH": "วิศวกรรมคอมพิวเตอร์",
    "name_EN": "Computer Engineering",
    "faculty_TH": "คณะวิศวกรรมศาสตร์",
    "faculty_EN": "Faculty of Engineering",
    "description_TH": "สาขาวิชาวิศวกรรมคอมพิวเตอร์",
    "description_EN": "Computer Engineering Department",
    "icon": "Cpu",
    "isActive": true,
    "createdAt": "2024-01-20T10:00:00Z",
    "updatedAt": "2024-01-20T10:00:00Z"
  }
}
```

#### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบ
```json
{
  "error": "Missing required fields: code, name_TH, name_EN"
}
```

**403 Forbidden** - ไม่ใช่ SUPREME
```json
{
  "error": "Only SUPREME can create major categories"
}
```

**409 Conflict** - code ซ้ำ
```json
{
  "error": "Major category with code \"CPE\" already exists"
}
```

**409 Conflict** - ชื่อภาษาไทยซ้ำ
```json
{
  "error": "Major category with name_TH \"วิศวกรรมคอมพิวเตอร์\" already exists"
}
```

**409 Conflict** - ชื่อภาษาอังกฤษซ้ำ
```json
{
  "error": "Major category with name_EN \"Computer Engineering\" already exists"
}
```

### Business Logic

1. **Code Normalization**:
   - แปลง code เป็น uppercase อัตโนมัติ
   - code ต้อง unique

2. **Name Uniqueness**:
   - name_TH และ name_EN ต้องไม่ซ้ำกับที่มีอยู่

3. **Icon**:
   - ใช้ชื่อ icon จาก Lucide Icons
   - Example: "Cpu", "Zap", "Building", "GraduationCap"

### Example Usage

```bash
curl -X POST https://api.example.com/api/major/category \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CPE",
    "name_TH": "วิศวกรรมคอมพิวเตอร์",
    "name_EN": "Computer Engineering",
    "faculty_TH": "คณะวิศวกรรมศาสตร์",
    "faculty_EN": "Faculty of Engineering",
    "icon": "Cpu"
  }'
```

---

## PUT /api/major/category

อัปเดต major category

### Endpoint
```
PUT /api/major/category
```

### Authentication
Required - SUPREME role only

### Request Body

```json
{
  "id": 10,
  "code": "CPE",
  "name_TH": "วิศวกรรมคอมพิวเตอร์ (ใหม่)",
  "name_EN": "Computer Engineering (New)",
  "faculty_TH": "คณะวิศวกรรมศาสตร์",
  "faculty_EN": "Faculty of Engineering",
  "description_TH": "คำอธิบายใหม่",
  "description_EN": "New description",
  "icon": "Laptop",
  "isActive": false
}
```

### Response

```json
{
  "success": true,
  "message": "Major category updated successfully",
  "data": {
    "id": 10,
    "code": "CPE",
    "name_TH": "วิศวกรรมคอมพิวเตอร์ (ใหม่)",
    "name_EN": "Computer Engineering (New)",
    "isActive": false
  }
}
```

#### Error Responses

**404 Not Found**
```json
{
  "error": "Major category not found"
}
```

**403 Forbidden**
```json
{
  "error": "Only SUPREME can update major categories"
}
```

**409 Conflict** - ชื่อหรือ code ซ้ำ
```json
{
  "error": "Major category with name_TH \"...\" already exists"
}
```

---

## DELETE /api/major/category

ลบ major category (soft delete)

### Endpoint
```
DELETE /api/major/category?id={id}
```

### Authentication
Required - SUPREME role only

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Major category ID |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Major category deactivated successfully"
}
```

#### Error Responses

**404 Not Found**
```json
{
  "error": "Major category not found"
}
```

**403 Forbidden**
```json
{
  "error": "Only SUPREME can delete major categories"
}
```

### Business Logic

- Soft delete: ตั้งค่า `isActive: false`
- ไม่ลบออกจากฐานข้อมูล
- Events และ admins ที่เชื่อมโยงยังคงอยู่

---

## GET /api/major/manage

ดึงรายการ major admins

### Endpoint
```
GET /api/major/manage?majorCategoryId={majorCategoryId}
```

### Authentication
Required - User Authentication

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| majorCategoryId | number | No | กรองตาม major category (ถ้าไม่ระบุ = ดึงทั้งหมด) |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 10,
      "majorCategory_id": 1,
      "role": "OWNER",
      "assignedAt": "2024-01-01T10:00:00Z",
      "assignedBy": "autoAssign",
      "isActive": true,
      "user": {
        "id": 10,
        "firstName": "สมชาย",
        "lastName": "ใจดี",
        "email": "somchai@cmu.ac.th",
        "faculty": "Engineering",
        "major": "Computer Engineering",
        "photo": "https://example.com/photo.jpg"
      },
      "majorCategory": {
        "id": 1,
        "code": "CPE",
        "name_TH": "วิศวกรรมคอมพิวเตอร์",
        "name_EN": "Computer Engineering"
      }
    },
    {
      "id": 2,
      "user_id": 15,
      "majorCategory_id": 1,
      "role": "ADMIN",
      "assignedAt": "2024-01-05T14:00:00Z",
      "assignedBy": "10",
      "isActive": true,
      "user": {
        "id": 15,
        "firstName": "สมหญิง",
        "lastName": "รักษ์ดี",
        "email": "somying@cmu.ac.th"
      },
      "majorCategory": {
        "id": 1,
        "code": "CPE",
        "name_TH": "วิศวกรรมคอมพิวเตอร์",
        "name_EN": "Computer Engineering"
      }
    }
  ]
}
```

#### Error Responses

**403 Forbidden** - ไม่มีสิทธิ์ดู admins ของ major นี้
```json
{
  "error": "You don't have permission to view admins for this major"
}
```

**404 Not Found**
```json
{
  "error": "User not found"
}
```

### Business Logic

1. **Permission Check**:
   - SUPREME → ดูได้ทั้งหมด
   - Major OWNER/ADMIN → ดูได้เฉพาะ major ที่ตนเป็น admin

2. **Filter**:
   - ดึงเฉพาะ admins ที่ active
   - เรียงตาม role (OWNER ก่อน) และ assignedAt

3. **Query Scope**:
   - ระบุ `majorCategoryId` → ดึงเฉพาะ major นั้น
   - ไม่ระบุ → ดึงทั้งหมด (สำหรับ SUPREME)

### Example Usage

```bash
# Get all admins (SUPREME only)
curl https://api.example.com/api/major/manage \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"

# Get admins for specific major
curl "https://api.example.com/api/major/manage?majorCategoryId=1" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

---

## POST /api/major/manage

เพิ่ม major admin

### Endpoint
```
POST /api/major/manage
```

### Authentication
Required - SUPREME or Major OWNER

### Request Body

```json
{
  "user_id": 15,
  "majorCategoryId": 1,
  "role": "ADMIN"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | number | Yes | User ID ที่จะเพิ่มเป็น admin |
| majorCategoryId | number | Yes | Major category ID |
| role | string | No | "OWNER" หรือ "ADMIN" (default: "ADMIN") |

### Response

#### Success (201 Created)

```json
{
  "success": true,
  "message": "Admin assigned successfully",
  "data": {
    "id": 10,
    "user_id": 15,
    "majorCategory_id": 1,
    "role": "ADMIN",
    "assignedAt": "2024-01-20T10:00:00Z",
    "assignedBy": "10",
    "isActive": true,
    "user": {
      "id": 15,
      "firstName": "สมหญิง",
      "lastName": "รักษ์ดี",
      "email": "somying@cmu.ac.th"
    },
    "majorCategory": {
      "id": 1,
      "code": "CPE",
      "name_TH": "วิศวกรรมคอมพิวเตอร์",
      "name_EN": "Computer Engineering"
    }
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required fields: user_id, majorCategoryId"
}
```

```json
{
  "error": "Invalid role. Must be OWNER or ADMIN"
}
```

```json
{
  "error": "This user is already assigned as admin for the specified major"
}
```

**403 Forbidden**
```json
{
  "error": "Only SUPREME or OWNER can add new admins"
}
```

**404 Not Found**
```json
{
  "error": "Major category not found"
}
```

```json
{
  "error": "Target user not found"
}
```

### Business Logic

1. **Permission**:
   - SUPREME → สามารถเพิ่ม admin ให้ major ใดก็ได้
   - OWNER → สามารถเพิ่ม admin ให้ major ที่ตนเป็น OWNER

2. **Role Hierarchy**:
   - OWNER > ADMIN
   - OWNER สามารถเพิ่ม OWNER หรือ ADMIN
   - มี OWNER ได้หลายคน

3. **Duplicate Check**:
   - ห้ามเพิ่ม user ที่เป็น admin ของ major นั้นอยู่แล้ว

4. **Auto-reactivate**:
   - ถ้า user เคยเป็น admin แต่ถูก deactivate → reactivate และอัปเดต role

### Example Usage

```bash
curl -X POST https://api.example.com/api/major/manage \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 15,
    "majorCategoryId": 1,
    "role": "ADMIN"
  }'
```

---

## PUT /api/major/manage

อัปเดต role ของ major admin

### Endpoint
```
PUT /api/major/manage
```

### Authentication
Required - SUPREME or Major OWNER

### Request Body

```json
{
  "user_id": 15,
  "majorCategoryId": 1,
  "newRole": "OWNER"
}
```

### Response

```json
{
  "success": true,
  "message": "Admin role updated successfully",
  "data": {
    "user_id": 15,
    "majorCategory_id": 1,
    "previousRole": "ADMIN",
    "newRole": "OWNER"
  }
}
```

#### Error Responses

**404 Not Found**
```json
{
  "error": "Admin assignment not found"
}
```

**403 Forbidden**
```json
{
  "error": "Only SUPREME or OWNER can update admin roles"
}
```

---

## DELETE /api/major/manage

ลบ major admin (soft delete)

### Endpoint
```
DELETE /api/major/manage?user_id={user_id}&majorCategoryId={majorCategoryId}
```

### Authentication
Required - SUPREME or Major OWNER

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| user_id | number | Yes | User ID |
| majorCategoryId | number | Yes | Major category ID |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Admin removed successfully"
}
```

#### Error Responses

**404 Not Found**
```json
{
  "error": "Admin assignment not found"
}
```

**403 Forbidden**
```json
{
  "error": "Only SUPREME or OWNER can remove admins"
}
```

### Business Logic

- Soft delete: ตั้งค่า `isActive: false`
- OWNER สามารถลบ ADMIN ได้
- ไม่สามารถลบตัวเองถ้าเป็น OWNER คนสุดท้าย

---

## GET /api/major/check

ตรวจสอบว่า user เป็น admin ของ major ใดบ้าง

### Endpoint
```
GET /api/major/check?userId={userId}
```

### Authentication
Required - User Authentication

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | number | No | User ID ที่ต้องการตรวจสอบ (ไม่ระบุ = ตรวจสอบตัวเอง) |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "userId": 10,
  "adminCount": 2,
  "data": [
    {
      "id": 1,
      "role": "OWNER",
      "assignedAt": "2024-01-01T10:00:00Z",
      "majorCategory": {
        "id": 1,
        "code": "CPE",
        "name_TH": "วิศวกรรมคอมพิวเตอร์",
        "name_EN": "Computer Engineering",
        "faculty_TH": "คณะวิศวกรรมศาสตร์",
        "faculty_EN": "Faculty of Engineering",
        "icon": "Cpu"
      }
    },
    {
      "id": 5,
      "role": "ADMIN",
      "assignedAt": "2024-01-10T14:00:00Z",
      "majorCategory": {
        "id": 3,
        "code": "EE",
        "name_TH": "วิศวกรรมไฟฟ้า",
        "name_EN": "Electrical Engineering",
        "faculty_TH": "คณะวิศวกรรมศาสตร์",
        "faculty_EN": "Faculty of Engineering",
        "icon": "Zap"
      }
    }
  ]
}
```

#### Error Responses

**403 Forbidden** - พยายามดูของคนอื่นโดยไม่ใช่ SUPREME
```json
{
  "error": "You don't have permission to view other users' admin roles"
}
```

**404 Not Found**
```json
{
  "error": "User not found"
}
```

### Business Logic

1. **Permission**:
   - User สามารถดูของตัวเองได้
   - SUPREME สามารถดูของใครก็ได้

2. **Response**:
   - ดึงเฉพาะ majors ที่ user เป็น active admin
   - เรียงตาม assignedAt (ใหม่กว่าก่อน)

### Example Usage

#### Check Own Roles

```bash
curl https://api.example.com/api/major/check \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

#### Check Other User's Roles (SUPREME only)

```bash
curl "https://api.example.com/api/major/check?userId=15" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

#### JavaScript

```javascript
// Check if user is admin of any major
const response = await fetch('/api/major/check', {
  credentials: 'include'
});

const { data, adminCount } = await response.json();

if (adminCount > 0) {
  console.log('User is admin of', adminCount, 'majors');
  data.forEach(admin => {
    console.log(`- ${admin.majorCategory.name_EN} (${admin.role})`);
  });
} else {
  console.log('User is not a major admin');
}
```

---

## Role Hierarchy

### Role Types

| Role | Description | Permissions |
|------|-------------|-------------|
| SUPREME | System administrator | Full access to all majors |
| OWNER | Major owner | Can add/remove admins, manage events |
| ADMIN | Major administrator | Can manage events, limited admin functions |
| USER | Regular user | No admin privileges |

### Permission Matrix

| Action | SUPREME | OWNER | ADMIN | USER |
|--------|---------|-------|-------|------|
| Create Major Category | Yes | No | No | No |
| Update Major Category | Yes | No | No | No |
| Delete Major Category | Yes | No | No | No |
| View All Majors | Yes | Yes | Yes | Yes |
| Add Major Admin | Yes | Yes (own major) | No | No |
| Remove Major Admin | Yes | Yes (own major) | No | No |
| Update Admin Role | Yes | Yes (own major) | No | No |
| Create Event (for major) | Yes | Yes | Yes | No |
| Manage Event (for major) | Yes | Yes | Yes | No |

---

## Common Workflows

### 1. Create New Major and Assign Owner

```bash
# Step 1: Create major (SUPREME)
curl -X POST https://api.example.com/api/major/category \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CPE",
    "name_TH": "วิศวกรรมคอมพิวเตอร์",
    "name_EN": "Computer Engineering",
    "faculty_TH": "คณะวิศวกรรมศาสตร์",
    "faculty_EN": "Faculty of Engineering"
  }'

# Response: { "data": { "id": 10 } }

# Step 2: Assign owner
curl -X POST https://api.example.com/api/major/manage \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 15,
    "majorCategoryId": 10,
    "role": "OWNER"
  }'
```

### 2. Add Multiple Admins

```bash
# Add multiple admins to a major
for user_id in 15 20 25 30; do
  curl -X POST https://api.example.com/api/major/manage \
    -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": $user_id,
      \"majorCategoryId\": 10,
      \"role\": \"ADMIN\"
    }"
done
```

### 3. Check User Permissions

```javascript
async function checkMajorAdminStatus() {
  const response = await fetch('/api/major/check', {
    credentials: 'include'
  });
  
  const { adminCount, data } = await response.json();
  
  if (adminCount === 0) {
    return { isAdmin: false };
  }
  
  return {
    isAdmin: true,
    majorIds: data.map(a => a.majorCategory.id),
    roles: data.reduce((acc, a) => {
      acc[a.majorCategory.id] = a.role;
      return acc;
    }, {})
  };
}

// Usage
const status = await checkMajorAdminStatus();
if (status.isAdmin) {
  console.log('Admin for majors:', status.majorIds);
}
```

---

## Notes

### Major Code Guidelines

- Use uppercase letters (2-5 characters)
- Examples: "CPE", "EE", "ME", "CS", "MATH"
- Should be intuitive and match faculty standards

### Icon Selection

Use Lucide Icons: https://lucide.dev/icons
- **Engineering**: Cpu, Zap, Cog, Wrench
- **Science**: Atom, Microscope, Flask
- **Arts**: Palette, Music, Camera
- **Business**: TrendingUp, DollarSign, Building

### Best Practices

1. **Creating Majors**:
   - Coordinate with university departments
   - Use official names and codes
   - Assign at least one OWNER

2. **Admin Management**:
   - Start with OWNER role for department heads
   - Add ADMINs for staff members
   - Keep admin list updated

3. **Permissions**:
   - Use SUPREME sparingly (system admins only)
   - OWNER for department heads
   - ADMIN for event coordinators
