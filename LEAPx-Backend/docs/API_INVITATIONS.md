# Invitations API

API สำหรับการจัดการการเชิญเข้าร่วมกิจกรรม รองรับการเชิญทั้งแบบ bulk upload และการจัดการสถานะ invitation

## Table of Contents

- [Overview](#overview)
- [Invitation Flow](#invitation-flow)
- [Status Management](#status-management)
- [Email & Student ID Matching](#email--student-id-matching)
- [GET /api/invitations](#get-apiinvitations) - ดูรายการเชิญของตัวเอง
- [GET /api/events/[eventId]/invitations](#get-apieventseventidininvitations) - ดูรายการเชิญของกิจกรรม
- [DELETE /api/events/[eventId]/invitations](#delete-apieventseventidininvitations) - ยกเลิกการเชิญ
- [POST /api/events/[eventId]/invitations/upload](#post-apieventseventidininvitationsupload) - อัปโหลดรายการเชิญ
- [GET /api/events/[eventId]/invitations/template](#get-apieventseventidininvitationstemplate) - ดาวน์โหลด Excel template

---

## Overview

ระบบ Invitations ใช้สำหรับเชิญผู้ใช้เข้าร่วมกิจกรรมล่วงหน้า โดยรองรับการเชิญทั้งผู้ใช้ที่มีบัญชีในระบบแล้ว และผู้ที่ยังไม่มีบัญชี

### Key Features

- **Bulk Upload**: อัปโหลดรายการเชิญจากไฟล์ Excel
- **Email/Student ID Matching**: จับคู่กับ user ที่มีอยู่ในระบบ
- **Status Tracking**: ติดตามสถานะการเชิญแต่ละราย
- **Duplicate Prevention**: ป้องกันการเชิญซ้ำ
- **Template Generation**: สร้างไฟล์ template สำหรับ bulk upload

---

## Invitation Flow

```
1. Activity Admin สร้างรายการเชิญ
   - อัปโหลดไฟล์ Excel หรือเพิ่มทีละราย
   - ระบุ email (required) และ student ID (optional)

2. ระบบตรวจสอบความซ้ำซ้อน
   - ตรวจสอบว่า email ถูกเชิญไปแล้วหรือไม่
   - ตรวจสอบว่า user ลงทะเบียนไปแล้วหรือไม่

3. ระบบจับคู่กับ User (ถ้ามี)
   - หา user จาก student ID (ถ้าระบุ)
   - หา user จาก email (ถ้าไม่มี student ID)
   - เก็บ studentId ใน invitation record

4. สร้าง Invitation Record
   - Status: PENDING
   - บันทึกข้อมูลผู้เชิญ (invitedBy)
   - บันทึก timestamp (invitedAt)

5. User ลงทะเบียน
   - เมื่อ user ลงทะเบียนกิจกรรม
   - Status เปลี่ยนเป็น REGISTERED
   - บันทึก registeredAt

6. Admin จัดการ Invitation
   - ยกเลิกการเชิญ → Status: CANCELLED
   - หมดอายุ → Status: EXPIRED
```

---

## Status Management

### Invitation Status Values

| Status | Description | สามารถเปลี่ยนเป็น |
|--------|-------------|-------------------|
| PENDING | รอลงทะเบียน (สถานะเริ่มต้น) | REGISTERED, CANCELLED, EXPIRED |
| REGISTERED | ผู้ได้รับเชิญลงทะเบียนแล้ว | - (สถานะสุดท้าย) |
| CANCELLED | Admin ยกเลิกการเชิญ | - |
| EXPIRED | หมดอายุ (เกินระยะเวลาที่กำหนด) | - |

### Status Transition Rules

1. **PENDING → REGISTERED**
   - เกิดขึ้นอัตโนมัติเมื่อ user ลงทะเบียนกิจกรรม
   - บันทึก registeredAt timestamp
   - ไม่สามารถย้อนกลับได้

2. **PENDING → CANCELLED**
   - Admin ยกเลิกการเชิญ (DELETE endpoint)
   - Support ยกเลิกทีละรายการหรือทั้งหมด
   - ไม่มีผลต่อการลงทะเบียนที่เกิดขึ้นแล้ว

3. **PENDING → EXPIRED**
   - ระบบตั้งค่าอัตโนมัติ (ถ้ามี cron job)
   - ตามระยะเวลาที่กำหนดในกิจกรรม

### Status Filtering

GET invitations endpoint รองรับการกรอง:
```
GET /api/events/123/invitations?status=PENDING
GET /api/events/123/invitations?status=REGISTERED
```

---

## Email & Student ID Matching

### Matching Logic

ระบบจับคู่ invitation กับ user ในลำดับดังนี้:

#### 1. Student ID Matching (Priority)

```typescript
if (invitation.studentId) {
  existingUser = await prisma.user.findUnique({
    where: { id: invitation.studentId }
  });
}
```

- ถ้าระบุ student ID จะใช้ค่านี้จับคู่ก่อน
- เหมาะสำหรับเชิญนักศึกษา CMU ที่มีบัญชีแล้ว

#### 2. Email Matching (Fallback)

```typescript
if (!existingUser) {
  existingUser = await prisma.user.findUnique({
    where: { email: invitation.email }
  });
}
```

- ถ้าไม่ระบุ student ID หรือไม่พบ user
- ใช้ email จับคู่แทน
- เหมาะสำหรับผู้ใช้ภายนอก

#### 3. Store Matched User ID

```typescript
const created = await prisma.eventInvitation.create({
  data: {
    studentId: existingUser?.id || invitation.studentId,
    // ... other fields
  }
});
```

- เก็บ user ID ที่จับคู่ได้ (ถ้ามี)
- เก็บ student ID ที่ระบุมา (ถ้าไม่พบ user)

### Duplicate Prevention

#### ตรวจสอบการเชิญซ้ำ

```typescript
const existingInvitation = await prisma.eventInvitation.findUnique({
  where: {
    event_id_email: {
      event_id: eventIdNum,
      email: invitation.email
    }
  }
});
```

- ตรวจสอบจาก `event_id + email` (unique constraint)
- ป้องกันการเชิญคนเดิมซ้ำในกิจกรรมเดียวกัน

#### ตรวจสอบการลงทะเบียนซ้ำ

```typescript
if (existingUser) {
  const existingRegistration = await prisma.eventRegistration.findUnique({
    where: {
      user_id_event_id: {
        user_id: existingUser.id,
        event_id: eventIdNum
      }
    }
  });
}
```

- ถ้า user ลงทะเบียนไปแล้ว จะไม่สร้าง invitation
- Skip และบันทึก error

### Response Fields

`isExistingUser`: บอกว่า user มีบัญชีในระบบหรือไม่

```json
{
  "id": 123,
  "email": "user@cmu.ac.th",
  "status": "PENDING",
  "isExistingUser": true
}
```

---

## GET /api/invitations

ดูรายการเชิญของผู้ใช้ปัจจุบัน

### Endpoint
```
GET /api/invitations
```

### Authentication
Required - USER role (LEAP_AUTH + LEAP_USER cookies)

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "event_id": 45,
      "email": "user@cmu.ac.th",
      "firstName": "John",
      "lastName": "Doe",
      "studentId": 640610999,
      "status": "PENDING",
      "invitedBy": 1,
      "invitedAt": "2024-01-15T10:00:00.000Z",
      "registeredAt": null,
      "note": "VIP guest",
      "event": {
        "id": 45,
        "name": "Tech Conference 2024",
        "description": "Annual tech conference",
        "startTime": "2024-02-01T09:00:00.000Z",
        "endTime": "2024-02-01T17:00:00.000Z"
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

1. ดึง userId จาก authentication token
2. Query user จาก database
3. ค้นหา invitations ที่ตรงกับ:
   - `email = user.email` OR
   - `studentId = user.id`
4. เรียงจากใหม่ไปเก่า (invitedAt DESC)
5. Include event details

### Query Details

```typescript
const invitations = await prisma.eventInvitation.findMany({
  where: {
    OR: [
      { email: user.email },
      { studentId: user.id }
    ]
  },
  orderBy: { invitedAt: "desc" },
  include: {
    event: true
  }
});
```

### Example Usage

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/invitations', {
  method: 'GET',
  credentials: 'include'
});

const data = await response.json();

if (data.success) {
  console.log('My Invitations:', data.data);
  
  // Filter pending invitations
  const pending = data.data.filter(inv => inv.status === 'PENDING');
  console.log('Pending:', pending.length);
}
```

#### React Example

```javascript
import { useEffect, useState } from 'react';

function MyInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const response = await fetch('/api/invitations', {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
          setInvitations(data.data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, []);

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        invitations.map(inv => (
          <div key={inv.id}>
            <h3>{inv.event.name}</h3>
            <p>Status: {inv.status}</p>
          </div>
        ))
      )}
    </div>
  );
}
```

---

## GET /api/events/[eventId]/invitations

ดูรายการเชิญทั้งหมดของกิจกรรม (สำหรับ Activity Admin)

### Endpoint
```
GET /api/events/[eventId]/invitations
```

### Authentication
Required - ACTIVITY_ADMIN role or higher

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventId | number | Event ID |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status (PENDING, REGISTERED, CANCELLED, EXPIRED) |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "invitations": [
      {
        "id": 123,
        "email": "user@cmu.ac.th",
        "firstName": "John",
        "lastName": "Doe",
        "studentId": 640610999,
        "status": "PENDING",
        "invitedAt": "2024-01-15T10:00:00.000Z",
        "registeredAt": null,
        "note": "VIP guest",
        "isExistingUser": true
      },
      {
        "id": 124,
        "email": "external@email.com",
        "firstName": "Jane",
        "lastName": "Smith",
        "studentId": null,
        "status": "PENDING",
        "invitedAt": "2024-01-15T10:05:00.000Z",
        "registeredAt": null,
        "note": null,
        "isExistingUser": false
      }
    ],
    "summary": {
      "total": 120,
      "pending": 95,
      "registered": 20,
      "expired": 3,
      "cancelled": 2
    }
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
  "error": "Event not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. ตรวจสอบว่า event มีอยู่จริง
2. Query invitations ตาม eventId
3. Filter by status (ถ้าระบุ)
4. สำหรับแต่ละ invitation:
   - ตรวจสอบว่า user มีอยู่ในระบบหรือไม่
   - Set `isExistingUser` flag
5. คำนวณ summary statistics
6. เรียงจากใหม่ไปเก่า (invitedAt DESC)

### isExistingUser Check Logic

```typescript
// Check by studentId first
if (invitation.studentId) {
  const user = await prisma.user.findUnique({
    where: { id: invitation.studentId }
  });
  isExistingUser = !!user;
} else {
  // Fallback to email
  const user = await prisma.user.findUnique({
    where: { email: invitation.email }
  });
  isExistingUser = !!user;
}
```

### Summary Calculation

```typescript
const summary = {
  total: invitations.length,
  pending: invitations.filter(i => i.status === "PENDING").length,
  registered: invitations.filter(i => i.status === "REGISTERED").length,
  expired: invitations.filter(i => i.status === "EXPIRED").length,
  cancelled: invitations.filter(i => i.status === "CANCELLED").length
};
```

### Example Usage

#### Filter by Status

```javascript
// Get only pending invitations
const response = await fetch('/api/events/123/invitations?status=PENDING', {
  credentials: 'include'
});

const data = await response.json();
console.log('Pending:', data.data.summary.pending);
```

#### Get All Invitations

```javascript
const response = await fetch('/api/events/123/invitations', {
  credentials: 'include'
});

const data = await response.json();
console.log('Summary:', data.data.summary);

// Separate existing users from external guests
const existingUsers = data.data.invitations.filter(inv => inv.isExistingUser);
const externalGuests = data.data.invitations.filter(inv => !inv.isExistingUser);

console.log('Existing Users:', existingUsers.length);
console.log('External Guests:', externalGuests.length);
```

#### React Dashboard Component

```javascript
function InvitationsDashboard({ eventId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/invitations`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data);
        }
      });
  }, [eventId]);

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h2>Invitation Summary</h2>
      <ul>
        <li>Total: {data.summary.total}</li>
        <li>Pending: {data.summary.pending}</li>
        <li>Registered: {data.summary.registered}</li>
        <li>Cancelled: {data.summary.cancelled}</li>
        <li>Expired: {data.summary.expired}</li>
      </ul>

      <h3>Invitations</h3>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Status</th>
            <th>User Type</th>
          </tr>
        </thead>
        <tbody>
          {data.invitations.map(inv => (
            <tr key={inv.id}>
              <td>{inv.email}</td>
              <td>{inv.firstName} {inv.lastName}</td>
              <td>{inv.status}</td>
              <td>{inv.isExistingUser ? 'Existing' : 'External'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## DELETE /api/events/[eventId]/invitations

ยกเลิกการเชิญ (เปลี่ยน status เป็น CANCELLED)

### Endpoint
```
DELETE /api/events/[eventId]/invitations
```

### Authentication
Required - ACTIVITY_ADMIN role or higher

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventId | number | Event ID |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| invitationId | string | Yes | Invitation ID to cancel |
| all_cancel | string | No | ถ้าเป็น "true" จะยกเลิกทุกรายการที่ status = PENDING |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Invitation cancelled successfully"
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Invitation ID is required"
}
```

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found**
```json
{
  "error": "Invitation not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

#### Single Cancellation

1. ตรวจสอบว่าระบุ invitationId
2. ดึง invitation จาก database
3. ตรวจสอบว่า invitation เป็นของ event นี้
4. อัปเดต status เป็น CANCELLED

#### Bulk Cancellation

1. ถ้า `all_cancel=true`
2. อัปเดต status ของทุกรายการที่:
   - `event_id = eventId`
   - `status = PENDING`
3. เปลี่ยนเป็น CANCELLED ทั้งหมด

**Note**: ยกเลิกได้เฉพาะ status PENDING เท่านั้น

### Example Usage

#### Cancel Single Invitation

```javascript
const response = await fetch(
  '/api/events/123/invitations?invitationId=456',
  {
    method: 'DELETE',
    credentials: 'include'
  }
);

const data = await response.json();

if (data.success) {
  console.log('Invitation cancelled');
  // Refresh invitation list
}
```

#### Cancel All Pending Invitations

```javascript
const response = await fetch(
  '/api/events/123/invitations?invitationId=1&all_cancel=true',
  {
    method: 'DELETE',
    credentials: 'include'
  }
);

const data = await response.json();

if (data.success) {
  console.log('All pending invitations cancelled');
}
```

**Note**: ต้องระบุ invitationId ด้วยเสมอ (แม้ว่าจะใช้ all_cancel=true)

#### React Component

```javascript
function CancelInvitationButton({ eventId, invitationId, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/events/${eventId}/invitations?invitationId=${invitationId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('Invitation cancelled successfully');
        onSuccess();
      } else {
        alert('Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error cancelling invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleCancel} disabled={loading}>
      {loading ? 'Cancelling...' : 'Cancel Invitation'}
    </button>
  );
}
```

#### Bulk Cancel Component

```javascript
function BulkCancelButton({ eventId, onSuccess }) {
  const handleBulkCancel = async () => {
    const confirmed = confirm(
      'Are you sure you want to cancel ALL pending invitations?'
    );
    
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/events/${eventId}/invitations?invitationId=1&all_cancel=true`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('All pending invitations cancelled');
        onSuccess();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <button onClick={handleBulkCancel} className="danger">
      Cancel All Pending
    </button>
  );
}
```

---

## POST /api/events/[eventId]/invitations/upload

อัปโหลดรายการเชิญจากไฟล์ Excel (Bulk Upload)

### Endpoint
```
POST /api/events/[eventId]/invitations/upload
```

### Authentication
Required - ACTIVITY_ADMIN role or higher

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventId | number | Event ID |

### Request Body

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Excel file (.xlsx, .xls) |

### Excel File Format

#### Required Columns

| Column Name | Type | Required | Description | Example |
|-------------|------|----------|-------------|---------|
| Email (Required) | string | Yes | Email address | user@cmu.ac.th |
| Student ID (Optional) | number | No | รหัสนักศึกษา CMU | 640610999 |
| First Name (Optional) | string | No | ชื่อ | John |
| Last Name (Optional) | string | No | นามสกุล | Doe |
| Note (Optional) | string | No | หมายเหตุ | VIP guest |
| Faculty (Optional) | string | No | คณะ | Engineering |

**Note**: คอลัมน์ในไฟล์ต้องตรงชื่อตามที่กำหนดทุกประการ รวมถึง (Required) และ (Optional)

### Response

#### Success (201 Created)

```json
{
  "success": true,
  "message": "Invitations processed successfully",
  "data": {
    "totalInvitations": 100,
    "successCount": 95,
    "skippedCount": 3,
    "errorCount": 2,
    "errors": [
      {
        "row": 5,
        "email": "invalid-email",
        "reason": "Invalid email format"
      },
      {
        "row": 15,
        "email": "duplicate@cmu.ac.th",
        "reason": "Already invited to this event"
      }
    ],
    "invitations": [
      {
        "id": 123,
        "email": "user1@cmu.ac.th",
        "status": "PENDING",
        "isExistingUser": true
      },
      {
        "id": 124,
        "email": "external@email.com",
        "status": "PENDING",
        "isExistingUser": false
      }
    ]
  }
}
```

#### Error Responses

**400 Bad Request** - ไม่มีไฟล์หรือไฟล์ว่าง
```json
{
  "error": "No file uploaded"
}
```

```json
{
  "error": "Excel file is empty"
}
```

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

### Business Logic

#### 1. File Validation

```typescript
// Check file exists
if (!file) {
  return error("No file uploaded");
}

// Parse Excel
const workbook = XLSX.read(buffer);
const data = XLSX.utils.sheet_to_json(worksheet);

// Check not empty
if (data.length === 0) {
  return error("Excel file is empty");
}
```

#### 2. Row Validation

สำหรับแต่ละแถว:

```typescript
// Required field check
if (!email) {
  errors.push({ row, email: "", reason: "Email is required" });
  continue;
}

// Email format validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  errors.push({ row, email, reason: "Invalid email format" });
  continue;
}

// Student ID validation
if (studentIdStr && isNaN(studentId)) {
  errors.push({ row, email, reason: "Invalid Student ID format" });
  continue;
}
```

#### 3. User Matching

```typescript
// Try match by student ID first
if (invitation.studentId) {
  existingUser = await prisma.user.findUnique({
    where: { id: invitation.studentId }
  });
} else {
  // Fallback to email
  existingUser = await prisma.user.findUnique({
    where: { email: invitation.email }
  });
}
```

#### 4. Duplicate Prevention

```typescript
// Check existing invitation
const existingInvitation = await prisma.eventInvitation.findUnique({
  where: {
    event_id_email: {
      event_id: eventIdNum,
      email: invitation.email
    }
  }
});

if (existingInvitation) {
  skippedCount++;
  errors.push({
    row: 0,
    email: invitation.email,
    reason: "Already invited to this event"
  });
  continue;
}

// Check existing registration
if (existingUser) {
  const existingRegistration = await prisma.eventRegistration.findUnique({
    where: {
      user_id_event_id: {
        user_id: existingUser.id,
        event_id: eventIdNum
      }
    }
  });

  if (existingRegistration) {
    skippedCount++;
    errors.push({
      row: 0,
      email: invitation.email,
      reason: "Already registered for this event"
    });
    continue;
  }
}
```

#### 5. Create Invitation

```typescript
const created = await prisma.eventInvitation.create({
  data: {
    event_id: eventIdNum,
    email: invitation.email,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    studentId: existingUser?.id || invitation.studentId,
    invitedBy: Number(userId),
    note: invitation.note,
    status: "PENDING"
  }
});

successCount++;
```

### Processing Flow

```
1. Upload Excel file
2. Parse worksheet → JSON
3. For each row:
   a. Validate email format
   b. Validate student ID (if provided)
   c. Find existing user (by ID or email)
   d. Check duplicate invitation
   e. Check existing registration
   f. Create invitation record
4. Return summary + errors
```

### Example Usage

#### HTML Form

```html
<form id="uploadForm" enctype="multipart/form-data">
  <input type="file" name="file" accept=".xlsx,.xls" required />
  <button type="submit">Upload Invitations</button>
</form>

<script>
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const eventId = 123; // Your event ID
  
  try {
    const response = await fetch(
      `/api/events/${eventId}/invitations/upload`,
      {
        method: 'POST',
        credentials: 'include',
        body: formData
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      alert(`Success: ${data.data.successCount}/${data.data.totalInvitations}`);
      
      if (data.data.errors.length > 0) {
        console.log('Errors:', data.data.errors);
      }
    } else {
      alert('Upload failed: ' + data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Upload failed');
  }
});
</script>
```

#### React Component

```javascript
import { useState } from 'react';

function BulkUploadInvitations({ eventId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        `/api/events/${eventId}/invitations/upload`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData
        }
      );

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        onSuccess();
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h3>Bulk Upload Invitations</h3>
      
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        disabled={uploading}
      />
      
      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>

      {result && (
        <div className="result">
          <h4>Upload Results</h4>
          <p>Total: {result.totalInvitations}</p>
          <p>Success: {result.successCount}</p>
          <p>Skipped: {result.skippedCount}</p>
          <p>Errors: {result.errorCount}</p>

          {result.errors.length > 0 && (
            <div>
              <h5>Errors:</h5>
              <ul>
                {result.errors.map((err, idx) => (
                  <li key={idx}>
                    Row {err.row}: {err.email} - {err.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### Node.js Example

```javascript
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function uploadInvitations(eventId, filePath) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));

  const response = await fetch(
    `https://api.example.com/api/events/${eventId}/invitations/upload`,
    {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': 'LEAP_AUTH=...; LEAP_USER=...'
      }
    }
  );

  const data = await response.json();
  
  console.log('Total:', data.data.totalInvitations);
  console.log('Success:', data.data.successCount);
  console.log('Errors:', data.data.errorCount);
  
  if (data.data.errors.length > 0) {
    data.data.errors.forEach(err => {
      console.log(`Error at row ${err.row}: ${err.reason}`);
    });
  }
}

uploadInvitations(123, './invitations.xlsx');
```

### Error Handling

#### Common Errors

| Error | Reason | Solution |
|-------|--------|----------|
| Email is required | แถวไม่มี email | ใส่ email ในคอลัมน์ "Email (Required)" |
| Invalid email format | รูปแบบ email ไม่ถูกต้อง | ตรวจสอบ format (xxx@xxx.xxx) |
| Invalid Student ID format | Student ID ไม่ใช่ตัวเลข | ใส่เป็นตัวเลขหรือเว้นว่าง |
| Already invited to this event | Email นี้ถูกเชิญไปแล้ว | ลบรายการซ้ำออกจากไฟล์ |
| Already registered for this event | User ลงทะเบียนไปแล้ว | ไม่ต้องเชิญซ้ำ |

#### Best Practices

1. **ดาวน์โหลด Template**: ใช้ GET /template endpoint
2. **ตรวจสอบข้อมูล**: ตรวจสอบรูปแบบก่อนอัปโหลด
3. **Batch Processing**: อัปโหลดทีละ 100-500 รายการ
4. **Handle Errors**: แสดงรายการ error ให้ user แก้ไข
5. **Retry Logic**: Retry สำหรับ error ที่แก้ไขได้

---

## GET /api/events/[eventId]/invitations/template

ดาวน์โหลดไฟล์ Excel template สำหรับ bulk upload

### Endpoint
```
GET /api/events/[eventId]/invitations/template
```

### Authentication
Required - ACTIVITY_ADMIN role or higher

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventId | number | Event ID |

### Response

#### Success (200 OK)

**Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Content-Disposition**: `attachment; filename="event_invitation_template_{eventId}.xlsx"`

ไฟล์ Excel ที่มีตัวอย่างข้อมูล 2 แถว:

| Student ID (Optional) | Email (Required) | First Name (Optional) | Last Name (Optional) | Note (Optional) | Faculty (Optional) |
|----------------------|------------------|-----------------------|----------------------|-----------------|-------------------|
| 650619999 | student@cmu.ac.th | ข้าวเกรียบ | ตัวจริง | หมายเหตุ | วิศวกรรมศาสตร์ |
| | external@email.com | John | Doe | Note | |

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

### Template Structure

#### Column Configuration

```typescript
worksheet['!cols'] = [
  { wch: 25 }, // Student ID
  { wch: 30 }, // Email
  { wch: 20 }, // First Name
  { wch: 20 }, // Last Name
  { wch: 30 }, // Note
  { wch: 30 }  // Faculty
];
```

#### Sample Data

```typescript
const templateData = [
  {
    "Student ID (Optional)": "650619999",
    "Email (Required)": "student@cmu.ac.th",
    "First Name (Optional)": "ข้าวเกรียบ",
    "Last Name (Optional)": "ตัวจริง",
    "Note (Optional)": "หมายเหตุ",
    "Faculty (Optional)": "วิศวกรรมศาสตร์"
  },
  {
    "Student ID (Optional)": "",
    "Email (Required)": "external@email.com",
    "First Name (Optional)": "John",
    "Last Name (Optional)": "Doe",
    "Note (Optional)": "Note",
    "Faculty (Optional)": ""
  }
];
```

### Example Usage

#### Download via JavaScript

```javascript
async function downloadTemplate(eventId) {
  try {
    const response = await fetch(
      `/api/events/${eventId}/invitations/template`,
      {
        method: 'GET',
        credentials: 'include'
      }
    );

    if (!response.ok) {
      throw new Error('Download failed');
    }

    // Create download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event_invitation_template_${eventId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading template:', error);
    alert('Failed to download template');
  }
}

// Usage
downloadTemplate(123);
```

#### React Component

```javascript
function DownloadTemplateButton({ eventId }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);

    try {
      const response = await fetch(
        `/api/events/${eventId}/invitations/template`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event_invitation_template_${eventId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to download template');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button onClick={handleDownload} disabled={downloading}>
      {downloading ? 'Downloading...' : 'Download Template'}
    </button>
  );
}
```

#### HTML Link

```html
<a 
  href="/api/events/123/invitations/template"
  download
  class="btn btn-primary"
>
  Download Excel Template
</a>
```

### Filling Out the Template

#### Guidelines

1. **Email (Required)**:
   - ต้องระบุเสมอ
   - รูปแบบ: xxx@xxx.xxx
   - ไม่ซ้ำกันภายในไฟล์เดียวกัน

2. **Student ID (Optional)**:
   - ระบุสำหรับนักศึกษา CMU
   - ตัวเลข 9 หลัก
   - เว้นว่างสำหรับคนภายนอก

3. **First Name & Last Name (Optional)**:
   - แนะนำให้ระบุ
   - ใช้สำหรับแสดงชื่อใน invitation

4. **Note (Optional)**:
   - หมายเหตุเพิ่มเติม
   - เช่น: VIP, Speaker, Sponsor

5. **Faculty (Optional)**:
   - คณะของนักศึกษา
   - อนุญาตให้ว่างได้

#### Example Scenarios

**CMU Student (มีบัญชีแล้ว)**:
```
Student ID: 640610999
Email: john.d@cmu.ac.th
First Name: John
Last Name: Doe
Note: Committee member
Faculty: Engineering
```

**CMU Student (ยังไม่มีบัญชี)**:
```
Student ID: 650612345
Email: jane.s@cmu.ac.th
First Name: Jane
Last Name: Smith
Note: 
Faculty: Science
```

**External Guest**:
```
Student ID: (empty)
Email: external@company.com
First Name: Bob
Last Name: Wilson
Note: Industry speaker
Faculty: (empty)
```

### Tips

1. อย่าลบหรือเปลี่ยนชื่อคอลัมน์
2. ลบแถวตัวอย่างก่อนใส่ข้อมูลจริง
3. ตรวจสอบ email ไม่ซ้ำกัน
4. Student ID ต้องเป็นตัวเลขเท่านั้น
5. บันทึกเป็น .xlsx format

---

## Complete Workflow Example

### Admin Inviting Users

```javascript
class InvitationManager {
  constructor(eventId) {
    this.eventId = eventId;
  }

  // Step 1: Download template
  async downloadTemplate() {
    const response = await fetch(
      `/api/events/${this.eventId}/invitations/template`,
      { credentials: 'include' }
    );
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${this.eventId}.xlsx`;
    a.click();
  }

  // Step 2: Upload filled file
  async uploadInvitations(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `/api/events/${this.eventId}/invitations/upload`,
      {
        method: 'POST',
        credentials: 'include',
        body: formData
      }
    );

    return await response.json();
  }

  // Step 3: View invitations
  async getInvitations(status = null) {
    const url = status
      ? `/api/events/${this.eventId}/invitations?status=${status}`
      : `/api/events/${this.eventId}/invitations`;

    const response = await fetch(url, {
      credentials: 'include'
    });

    return await response.json();
  }

  // Step 4: Cancel invitation
  async cancelInvitation(invitationId) {
    const response = await fetch(
      `/api/events/${this.eventId}/invitations?invitationId=${invitationId}`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    );

    return await response.json();
  }

  // Complete workflow
  async manageInvitations() {
    // 1. Download template
    await this.downloadTemplate();
    console.log('Template downloaded');

    // 2. Wait for user to fill and select file
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      
      // 3. Upload
      const uploadResult = await this.uploadInvitations(file);
      console.log('Upload result:', uploadResult.data);

      // 4. Show results
      alert(`
        Success: ${uploadResult.data.successCount}
        Skipped: ${uploadResult.data.skippedCount}
        Errors: ${uploadResult.data.errorCount}
      `);

      // 5. Refresh list
      const invitations = await this.getInvitations();
      console.log('Summary:', invitations.data.summary);
    });
  }
}

// Usage
const manager = new InvitationManager(123);
manager.manageInvitations();
```

### User Viewing Their Invitations

```javascript
class UserInvitations {
  async getMyInvitations() {
    const response = await fetch('/api/invitations', {
      credentials: 'include'
    });

    const data = await response.json();
    
    if (data.success) {
      return this.categorizeInvitations(data.data);
    }
    
    return null;
  }

  categorizeInvitations(invitations) {
    return {
      pending: invitations.filter(i => i.status === 'PENDING'),
      registered: invitations.filter(i => i.status === 'REGISTERED'),
      expired: invitations.filter(i => i.status === 'EXPIRED'),
      cancelled: invitations.filter(i => i.status === 'CANCELLED')
    };
  }

  async displayInvitations() {
    const categorized = await this.getMyInvitations();
    
    if (!categorized) {
      console.log('No invitations found');
      return;
    }

    console.log('Pending Invitations:', categorized.pending.length);
    categorized.pending.forEach(inv => {
      console.log(`- ${inv.event.name} (${inv.invitedAt})`);
    });

    console.log('Registered:', categorized.registered.length);
    console.log('Expired:', categorized.expired.length);
    console.log('Cancelled:', categorized.cancelled.length);
  }
}

// Usage
const userInv = new UserInvitations();
userInv.displayInvitations();
```

---

## Database Schema

### EventInvitation Model

```prisma
model EventInvitation {
  id              Int                @id @default(autoincrement())
  event_id        Int
  email           String
  firstName       String?
  lastName        String?
  studentId       Int?               // CMU ID (if exists)
  status          InvitationStatus   @default(PENDING)
  invitedBy       Int                // User ID who invited
  invitedAt       DateTime           @default(now())
  registeredAt    DateTime?
  note            String?            // Additional notes
  
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  
  event           Event              @relation(fields: [event_id], references: [id], onDelete: Cascade)
  
  @@unique([event_id, email])
  @@index([event_id, status])
  @@index([email])
  @@index([studentId])
}

enum InvitationStatus {
  PENDING         // Waiting for registration
  REGISTERED      // User has registered
  EXPIRED         // Invitation expired
  CANCELLED       // Admin cancelled
}
```

### Key Constraints

1. **@@unique([event_id, email])**:
   - ป้องกัน email ถูกเชิญซ้ำในกิจกรรมเดียวกัน

2. **@@index([event_id, status])**:
   - ค้นหาเร็วเมื่อกรองตาม status

3. **@@index([email])**:
   - ค้นหาเร็วเมื่อ user ดูการเชิญของตัวเอง

4. **@@index([studentId])**:
   - ค้นหาเร็วเมื่อจับคู่กับ user

---

## Security Considerations

### Authorization

1. **User Endpoints**:
   - GET /api/invitations: USER role
   - ดูได้เฉพาะการเชิญของตัวเอง

2. **Admin Endpoints**:
   - ทุก endpoints ใน /api/events/[eventId]/invitations
   - ต้องการ ACTIVITY_ADMIN role ขึ้นไป

### Data Privacy

1. **Email Privacy**:
   - User ดูได้เฉพาะ invitation ของตัวเอง
   - Admin ดูได้ทุกรายการในกิจกรรมที่ดูแล

2. **Student ID Protection**:
   - ไม่แสดง studentId ให้ผู้ใช้ทั่วไป
   - เฉพาะ admin เห็น

### Input Validation

1. **Email Validation**:
   ```typescript
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   ```

2. **Student ID Validation**:
   - ต้องเป็นตัวเลขเท่านั้น
   - ถ้าระบุมาต้อง valid

3. **File Upload**:
   - Accept เฉพาะ .xlsx, .xls
   - ตรวจสอบ file size
   - ป้องกัน malicious files

---

## Best Practices

### For Administrators

1. **Use Template**:
   - ดาวน์โหลด template ก่อนเสมอ
   - อย่าเปลี่ยนชื่อคอลัมน์

2. **Verify Data**:
   - ตรวจสอบ email format
   - ตรวจสอบ student ID ถูกต้อง
   - ลบข้อมูลตัวอย่างออก

3. **Handle Errors**:
   - ดู error response ทุกครั้ง
   - แก้ไขและ re-upload ตรง error

4. **Monitor Status**:
   - ตรวจสอบ summary หลัง upload
   - ติดตามการลงทะเบียน

### For Developers

1. **Error Handling**:
   ```javascript
   try {
     const result = await uploadInvitations(file);
     // Handle success
   } catch (error) {
     // Handle error
     console.error(error);
   }
   ```

2. **Loading States**:
   - แสดง loading ขณะ upload
   - Disable button ขระทำงาน

3. **Progress Tracking**:
   - แสดง progress bar สำหรับไฟล์ใหญ่
   - แสดงจำนวนที่ประมวลผลแล้ว

4. **User Feedback**:
   - แสดงผลลัพธ์ชัดเจน
   - แสดง error list ให้แก้ไข

---

## Troubleshooting

### Common Issues

#### 1. Upload Failed

**Problem**: ไฟล์อัปโหลดไม่สำเร็จ

**Solutions**:
- ตรวจสอบ file format (.xlsx)
- ตรวจสอบขนาดไฟล์ไม่เกิน limit
- ตรวจสอบชื่อคอลัมน์ถูกต้อง

#### 2. Many Errors in Upload

**Problem**: มี error เยอะในการอัปโหลด

**Solutions**:
- ตรวจสอบ email format ทุกรายการ
- ตรวจสอบ student ID เป็นตัวเลข
- ลบรายการที่ซ้ำออก

#### 3. Invitation Not Found

**Problem**: User บอกว่าไม่เห็น invitation

**Solutions**:
- ตรวจสอบ email ตรงกับในระบบ
- ตรวจสอบ status ไม่ใช่ CANCELLED
- ตรวจสอบ user login ด้วย email ถูกต้อง

#### 4. Cannot Cancel Invitation

**Problem**: ยกเลิก invitation ไม่ได้

**Solutions**:
- ตรวจสอบ invitationId ถูกต้อง
- ตรวจสอบ invitation เป็นของ event นั้น
- ตรวจสอบสิทธิ์ admin

---

## API Testing Examples

### cURL Examples

```bash
# Get my invitations
curl -X GET "https://api.example.com/api/invitations" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -H "Accept: application/json"

# Get event invitations
curl -X GET "https://api.example.com/api/events/123/invitations" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -H "Accept: application/json"

# Get pending invitations only
curl -X GET "https://api.example.com/api/events/123/invitations?status=PENDING" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -H "Accept: application/json"

# Upload invitations
curl -X POST "https://api.example.com/api/events/123/invitations/upload" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -F "file=@invitations.xlsx"

# Download template
curl -X GET "https://api.example.com/api/events/123/invitations/template" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -o template.xlsx

# Cancel invitation
curl -X DELETE "https://api.example.com/api/events/123/invitations?invitationId=456" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -H "Accept: application/json"

# Cancel all pending
curl -X DELETE "https://api.example.com/api/events/123/invitations?invitationId=1&all_cancel=true" \
  -H "Cookie: LEAP_AUTH=...; LEAP_USER=..." \
  -H "Accept: application/json"
```

### Postman Collection

```json
{
  "info": {
    "name": "LEAP Invitations API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get My Invitations",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/invitations"
      }
    },
    {
      "name": "Get Event Invitations",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/events/{{eventId}}/invitations"
      }
    },
    {
      "name": "Upload Invitations",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/events/{{eventId}}/invitations/upload",
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "file",
              "type": "file",
              "src": "invitations.xlsx"
            }
          ]
        }
      }
    },
    {
      "name": "Download Template",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/events/{{eventId}}/invitations/template"
      }
    },
    {
      "name": "Cancel Invitation",
      "request": {
        "method": "DELETE",
        "url": {
          "raw": "{{base_url}}/api/events/{{eventId}}/invitations",
          "query": [
            {
              "key": "invitationId",
              "value": "{{invitationId}}"
            }
          ]
        }
      }
    }
  ]
}
```

---

## Integration Examples

### Integration with Registration System

```typescript
// When user registers for event, update invitation status
async function registerForEvent(userId: number, eventId: number) {
  // 1. Create registration
  const registration = await prisma.eventRegistration.create({
    data: {
      user_id: userId,
      event_id: eventId,
      // ... other fields
    }
  });

  // 2. Update invitation status (if exists)
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (user) {
    await prisma.eventInvitation.updateMany({
      where: {
        event_id: eventId,
        OR: [
          { email: user.email },
          { studentId: user.id }
        ],
        status: 'PENDING'
      },
      data: {
        status: 'REGISTERED',
        registeredAt: new Date()
      }
    });
  }

  return registration;
}
```

### Integration with Notification System

```typescript
// Send notification when invited
async function notifyInvitation(invitation: EventInvitation) {
  const event = await prisma.event.findUnique({
    where: { id: invitation.event_id }
  });

  // Check if user exists
  const user = invitation.studentId 
    ? await prisma.user.findUnique({ where: { id: invitation.studentId }})
    : await prisma.user.findUnique({ where: { email: invitation.email }});

  if (user) {
    // Send in-app notification
    await sendNotification({
      userId: user.id,
      title: 'Event Invitation',
      message: `You are invited to ${event.name}`,
      type: 'INVITATION'
    });

    // Send email
    await sendEmail({
      to: invitation.email,
      subject: `Invitation: ${event.name}`,
      body: generateInvitationEmail(invitation, event)
    });
  } else {
    // Send email only for external users
    await sendEmail({
      to: invitation.email,
      subject: `Invitation: ${event.name}`,
      body: generateInvitationEmail(invitation, event)
    });
  }
}
```

---

## Changelog

### Version 1.0.0 (Current)

**Features**:
- Bulk upload via Excel
- Template download
- Status management
- Email/Student ID matching
- Duplicate prevention
- Summary statistics

**Endpoints**:
- GET /api/invitations
- GET /api/events/[eventId]/invitations
- DELETE /api/events/[eventId]/invitations
- POST /api/events/[eventId]/invitations/upload
- GET /api/events/[eventId]/invitations/template

---

## Support

หากพบปัญหาหรือมีคำถาม:

1. ตรวจสอบ error response
2. ดู Business Logic ใน documentation
3. ตรวจสอบ authorization และ authentication
4. ติดต่อทีมพัฒนาพร้อม error details
