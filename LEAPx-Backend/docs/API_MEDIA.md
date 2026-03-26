# Media Management API

API สำหรับการจัดการรูปภาพ banners, logos และ icons

## Table of Contents

### Public Endpoints
- [GET /api/media](#get-apimedia) - ดึง banners และ logos (สำหรับแสดงหน้าเว็บ)

### Banner Management (Activity Admin)
- [GET /api/media/banner](#get-apimediabanner) - ดึงรายการ banners
- [POST /api/media/banner](#post-apimediabanner) - อัปโหลด banner ใหม่
- [PUT /api/media/banner](#put-apimediabanner) - อัปเดต banner
- [DELETE /api/media/banner](#delete-apimediabanner) - ลบ banner

### Logo Management (Activity Admin)
- [GET /api/media/logo](#get-apimedialogo) - ดึงรายการ logos
- [POST /api/media/logo](#post-apimedialogo) - อัปโหลด logo ใหม่
- [PUT /api/media/logo](#put-apimedialogo) - อัปเดต logo
- [DELETE /api/media/logo](#delete-apimedialogo) - ลบ logo

### Icon Management (Activity Admin)
- [GET /api/icons](#get-apiicons) - ดึงรายการ icons
- [POST /api/icons](#post-apiicons) - สร้าง icon ใหม่
- [PUT /api/icons](#put-apiicons) - อัปเดต icon
- [DELETE /api/icons](#delete-apiicons) - ลบ icon

---

## GET /api/media

ดึงข้อมูล banners และ logos ที่ active สำหรับแสดงบนหน้าเว็บ (Public endpoint)

### Endpoint
```
GET /api/media?type={type}&limit={limit}
```

### Authentication
ไม่ต้องการ (Public endpoint)

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | No | ประเภทที่ต้องการ: `banner`, `logo`, หรือไม่ระบุ (ดึงทั้งหมด) |
| limit | number | No | จำนวน banners สูงสุด (default: 10) |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "logo": {
      "id": 1,
      "url": "https://res.cloudinary.com/.../logo.png"
    },
    "banners": [
      {
        "id": 1,
        "url": "https://res.cloudinary.com/.../banner1.jpg",
        "caption_TH": "กิจกรรมพิเศษ",
        "caption_EN": "Special Event",
        "isMain": true,
        "sortOrder": 0
      },
      {
        "id": 2,
        "url": "https://res.cloudinary.com/.../banner2.jpg",
        "caption_TH": null,
        "caption_EN": null,
        "isMain": false,
        "sortOrder": 1
      }
    ]
  }
}
```

#### Error Responses

**500 Internal Server Error**
```json
{
  "error": "Failed to fetch media"
}
```

### Business Logic

1. **Logo**:
   - ดึงเฉพาะ logo ที่ active
   - ถ้ามีหลายรูป เลือกรูปที่สร้างล่าสุด
   - ถ้าไม่มีเลย ส่ง `null`

2. **Banners**:
   - ดึงเฉพาะ banners ที่ active
   - เรียงลำดับ: Main banner ก่อน → sortOrder (0,1,2...) → ใหม่กว่าก่อน
   - จำกัดจำนวนตาม limit parameter

3. **Type Filter**:
   - `type=logo` → ส่งเฉพาะ logo
   - `type=banner` → ส่งเฉพาะ banners
   - ไม่ระบุ → ส่งทั้งหมด

### Example Usage

#### Get All Media

```bash
curl https://api.example.com/api/media
```

#### Get Only Banners

```bash
curl "https://api.example.com/api/media?type=banner&limit=5"
```

#### JavaScript

```javascript
const response = await fetch('/api/media?type=banner&limit=5');
const { data } = await response.json();
console.log('Banners:', data.banners);
```

---

## GET /api/media/banner

ดึงรายการ banners สำหรับจัดการ (Activity Admin)

### Endpoint
```
GET /api/media/banner?mode={mode}&isActive={isActive}&page={page}&limit={limit}
```

### Authentication
Required - Activity Admin role

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mode | string | No | `display` (ดึงเฉพาะ active) หรือ `manage` (ดึงทั้งหมด) |
| isActive | boolean | No | กรอง active/inactive (`true`, `false`) |
| page | number | No | หน้าปัจจุบัน (default: 1, ใช้กับ manage mode) |
| limit | number | No | จำนวนต่อหน้า (default: 20, ใช้กับ manage mode) |

### Response

#### Success - Display Mode (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://res.cloudinary.com/.../banner1.jpg",
      "caption_TH": "กิจกรรมพิเศษ",
      "caption_EN": "Special Event",
      "isMain": true,
      "sortOrder": 0
    }
  ]
}
```

#### Success - Manage Mode (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cloudinaryImage_id": 456,
      "name_TH": "แบนเนอร์หลัก",
      "name_EN": "Main Banner",
      "isMain": true,
      "sortOrder": 0,
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-15T14:30:00Z",
      "cloudinaryImage": {
        "id": 456,
        "url": "http://res.cloudinary.com/.../banner1.jpg",
        "secureUrl": "https://res.cloudinary.com/.../banner1.jpg",
        "width": 1920,
        "height": 1080,
        "format": "jpg"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

#### Error Responses

**403 Forbidden**
```json
{
  "error": "Unauthorized access"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to fetch banners"
}
```

### Example Usage

```bash
# Display mode - for public display
curl https://api.example.com/api/media/banner?mode=display \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"

# Manage mode - for admin panel
curl "https://api.example.com/api/media/banner?mode=manage&page=1&limit=20" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

---

## POST /api/media/banner

อัปโหลด banner ใหม่

### Endpoint
```
POST /api/media/banner
```

### Authentication
Required - Activity Admin role

### Request Body (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | File | Yes | ไฟล์รูปภาพ (JPG, PNG, etc.) |
| name_TH | string | No | ชื่อ banner (ไทย) |
| name_EN | string | No | ชื่อ banner (อังกฤษ) |
| isMain | boolean | No | เป็น main banner หรือไม่ (default: false) |
| sortOrder | number | No | ลำดับการแสดง (auto-increment ถ้าไม่ระบุ) |
| isActive | boolean | No | แสดงผลทันทีหรือไม่ (default: false) |

### Response

#### Success (201 Created)

```json
{
  "success": true,
  "message": "Banner uploaded successfully (inactive by default)",
  "data": {
    "id": 10,
    "cloudinaryImage_id": 789,
    "name_TH": "แบนเนอร์ใหม่",
    "name_EN": "New Banner",
    "isMain": false,
    "sortOrder": 5,
    "isActive": false,
    "createdAt": "2024-01-20T10:00:00Z",
    "cloudinaryImage": {
      "id": 789,
      "url": "http://res.cloudinary.com/.../banner-new.jpg",
      "secureUrl": "https://res.cloudinary.com/.../banner-new.jpg",
      "width": 1920,
      "height": 1080,
      "format": "jpg"
    }
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Image file is required"
}
```

```json
{
  "error": "File must be an image"
}
```

```json
{
  "error": "At least one of name_TH or name_EN is required"
}
```

**403 Forbidden**
```json
{
  "error": "Unauthorized access"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Upload to Cloudinary**:
   - สร้าง unique publicId: `banner-{timestamp}-{random}`
   - อัปโหลดไปยัง folder: `banners`
   - บันทึกข้อมูลใน CloudinaryImage และ LeapBanner

2. **Main Banner**:
   - หาก `isMain: true` → ตั้งค่า banners อื่นเป็น `isMain: false` ก่อน
   - มี main banner ได้เพียง 1 รูปในเวลาเดียวกัน

3. **Sort Order**:
   - ถ้าไม่ระบุ → ใช้ `max(sortOrder) + 1`
   - ใช้สำหรับจัดลำดับการแสดงผล

4. **Default Values**:
   - `isActive: false` → ไม่แสดงผลทันที (ต้องเปิดใช้งานภายหลัง)
   - `name_TH`, `name_EN` → ถ้าไม่ระบุจะเป็น `"-"`

### Example Usage

```bash
curl -X POST https://api.example.com/api/media/banner \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -F "image=@banner.jpg" \
  -F "name_TH=แบนเนอร์ใหม่" \
  -F "name_EN=New Banner" \
  -F "isMain=false" \
  -F "sortOrder=0" \
  -F "isActive=true"
```

#### JavaScript (FormData)

```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('name_TH', 'แบนเนอร์ใหม่');
formData.append('name_EN', 'New Banner');
formData.append('isMain', 'false');
formData.append('isActive', 'true');

const response = await fetch('/api/media/banner', {
  method: 'POST',
  credentials: 'include',
  body: formData
});

const data = await response.json();
```

---

## PUT /api/media/banner

อัปเดตข้อมูล banner หรือเปลี่ยนรูปภาพ

### Endpoint
```
PUT /api/media/banner
```

### Authentication
Required - Activity Admin role

### Request Body (multipart/form-data or application/json)

#### With New Image (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | Yes | Banner ID |
| image | File | No | ไฟล์รูปภาพใหม่ (ถ้าต้องการเปลี่ยน) |
| name_TH | string | No | ชื่อใหม่ (ไทย) |
| name_EN | string | No | ชื่อใหม่ (อังกฤษ) |
| isMain | boolean | No | เป็น main banner |
| sortOrder | number | No | ลำดับการแสดง |
| isActive | boolean | No | แสดงผล/ซ่อน |

#### Without Image (application/json)

```json
{
  "id": 10,
  "name_TH": "ชื่อใหม่",
  "name_EN": "New Name",
  "isMain": true,
  "sortOrder": 0,
  "isActive": true
}
```

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Banner updated successfully",
  "data": {
    "id": 10,
    "name_TH": "ชื่อใหม่",
    "name_EN": "New Name",
    "isMain": true,
    "sortOrder": 0,
    "isActive": true,
    "cloudinaryImage": {
      "secureUrl": "https://res.cloudinary.com/.../banner.jpg"
    }
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
  "error": "Banner not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **Update Options**:
   - อัปเดตเฉพาะ fields ที่ระบุ
   - ถ้ามีไฟล์รูปใหม่ → ลบรูปเก่าจาก Cloudinary และอัปโหลดรูปใหม่

2. **Main Banner Logic**:
   - หากตั้ง `isMain: true` → ตั้งค่า banners อื่นเป็น false

3. **Transaction Safety**:
   - ใช้ database transaction เพื่อความปลอดภัย

### Example Usage

```bash
# Update without changing image
curl -X PUT https://api.example.com/api/media/banner \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 10,
    "isActive": true,
    "isMain": true
  }'

# Update with new image
curl -X PUT https://api.example.com/api/media/banner \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -F "id=10" \
  -F "image=@new-banner.jpg" \
  -F "name_TH=แบนเนอร์ใหม่"
```

---

## DELETE /api/media/banner

ลบ banner (soft delete)

### Endpoint
```
DELETE /api/media/banner?id={id}
```

### Authentication
Required - Activity Admin role

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Banner ID ที่ต้องการลบ |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Banner deactivated successfully"
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required parameter: id"
}
```

**404 Not Found**
```json
{
  "error": "Banner not found"
}
```

### Business Logic

1. **Soft Delete**:
   - ไม่ลบออกจากฐานข้อมูล
   - ตั้งค่า `isActive: false`
   - รูปภาพยังคงอยู่บน Cloudinary

2. **Main Banner**:
   - ถ้าลบ main banner → ไม่มี main banner

### Example Usage

```bash
curl -X DELETE "https://api.example.com/api/media/banner?id=10" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

---

## GET /api/media/logo

ดึงรายการ logos สำหรับจัดการ

### Endpoint
```
GET /api/media/logo?mode={mode}&isActive={isActive}
```

### Authentication
Required - User Authentication

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mode | string | No | `display` (active logo อันเดียว) หรือ `manage` (ทั้งหมด) |
| isActive | boolean | No | กรอง active/inactive |

### Response

#### Success - Display Mode (200 OK)

```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://res.cloudinary.com/.../logo.png"
  }
}
```

หรือถ้าไม่มี active logo:

```json
{
  "success": true,
  "data": null,
  "message": "No active logo found"
}
```

#### Success - Manage Mode (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cloudinaryImage_id": 123,
      "name_TH": "โลโก้ LEAP",
      "name_EN": "LEAP Logo",
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z",
      "cloudinaryImage": {
        "id": 123,
        "url": "http://res.cloudinary.com/.../logo.png",
        "secureUrl": "https://res.cloudinary.com/.../logo.png",
        "width": 512,
        "height": 512,
        "format": "png"
      }
    }
  ]
}
```

---

## POST /api/media/logo

อัปโหลด logo ใหม่

### Endpoint
```
POST /api/media/logo
```

### Authentication
Required - Activity Admin role

### Request Body (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | File | Yes | ไฟล์รูปภาพ logo |
| name_TH | string | No | ชื่อ logo (ไทย) |
| name_EN | string | No | ชื่อ logo (อังกฤษ) |
| isActive | boolean | No | แสดงผลทันทีหรือไม่ (default: false) |

### Response

#### Success (201 Created)

```json
{
  "success": true,
  "message": "Logo uploaded successfully (inactive by default)",
  "data": {
    "id": 5,
    "cloudinaryImage_id": 890,
    "name_TH": "โลโก้ใหม่",
    "name_EN": "New Logo",
    "isActive": false,
    "createdAt": "2024-01-20T10:00:00Z",
    "cloudinaryImage": {
      "id": 890,
      "secureUrl": "https://res.cloudinary.com/.../logo-new.png"
    }
  }
}
```

### Business Logic

1. **Upload to Cloudinary**:
   - Folder: `logos`
   - Public ID: `logo-{timestamp}-{random}`

2. **Active Logo**:
   - หาก `isActive: true` → ตั้งค่า logos อื่นเป็น false
   - มี active logo ได้เพียง 1 รูป

### Example Usage

```bash
curl -X POST https://api.example.com/api/media/logo \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -F "image=@logo.png" \
  -F "name_TH=โลโก้ใหม่" \
  -F "name_EN=New Logo" \
  -F "isActive=true"
```

---

## PUT /api/media/logo

อัปเดต logo

### Endpoint
```
PUT /api/media/logo
```

### Authentication
Required - Activity Admin role

### Request Body

Similar to PUT /api/media/banner - supports both JSON and FormData

### Response

Same structure as POST /api/media/logo

---

## DELETE /api/media/logo

ลบ logo (soft delete)

### Endpoint
```
DELETE /api/media/logo?id={id}
```

### Authentication
Required - Activity Admin role

### Response

```json
{
  "success": true,
  "message": "Logo deactivated successfully"
}
```

---

## GET /api/icons

ดึงรายการ icons

### Endpoint
```
GET /api/icons?search={search}&page={page}&limit={limit}&sortBy={sortBy}&sortOrder={sortOrder}
```

### Authentication
Required - User Authentication

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| search | string | No | ค้นหาจากชื่อหรือคำอธิบาย |
| page | number | No | หน้าที่ต้องการ (default: 1) |
| limit | number | No | จำนวนต่อหน้า (default: 50) |
| sortBy | string | No | เรียงตาม: `name`, `createdAt`, `updatedAt` (default: name) |
| sortOrder | string | No | `asc` หรือ `desc` (default: asc) |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Calendar",
      "url": "https://lucide.dev/icons/calendar",
      "description": "Calendar icon",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    },
    {
      "id": 2,
      "name": "User",
      "url": "https://lucide.dev/icons/user",
      "description": "User profile icon",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

### Example Usage

```bash
curl "https://api.example.com/api/icons?search=calendar&limit=20" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

---

## POST /api/icons

สร้าง icon ใหม่

### Endpoint
```
POST /api/icons
```

### Authentication
Required - Activity Admin role

### Request Body

```json
{
  "name": "Calendar",
  "url": "https://lucide.dev/icons/calendar",
  "description": "Calendar icon"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | ชื่อ icon (unique) |
| url | string | No | URL ของ icon (auto-generate ถ้าไม่ระบุ) |
| description | string | No | คำอธิบาย |

### Response

#### Success (201 Created)

```json
{
  "success": true,
  "message": "Icon created successfully",
  "data": {
    "id": 50,
    "name": "Calendar",
    "url": "https://lucide.dev/icons/calendar",
    "description": "Calendar icon",
    "createdAt": "2024-01-20T10:00:00Z",
    "updatedAt": "2024-01-20T10:00:00Z"
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required field: name"
}
```

**409 Conflict**
```json
{
  "error": "Icon name already exists"
}
```

### Business Logic

1. **Auto URL Generation**:
   - ถ้าไม่ระบุ URL → สร้างจาก name
   - Format: `https://lucide.dev/icons/{kebab-case-name}`
   - Example: `CalendarPlus` → `calendar-plus`

2. **Name Uniqueness**:
   - Icon name ต้องไม่ซ้ำ

---

## PUT /api/icons

อัปเดต icon

### Endpoint
```
PUT /api/icons
```

### Authentication
Required - Activity Admin role

### Request Body

```json
{
  "id": 50,
  "name": "CalendarNew",
  "url": "https://lucide.dev/icons/calendar-new",
  "description": "New calendar icon"
}
```

### Response

```json
{
  "success": true,
  "message": "Icon updated successfully",
  "data": {
    "id": 50,
    "name": "CalendarNew",
    "url": "https://lucide.dev/icons/calendar-new",
    "description": "New calendar icon"
  }
}
```

#### Error Responses

**404 Not Found**
```json
{
  "error": "Icon not found"
}
```

**409 Conflict** - ถ้าเปลี่ยนชื่อเป็นชื่อที่มีอยู่แล้ว
```json
{
  "error": "Icon name already exists"
}
```

---

## DELETE /api/icons

ลบ icon

### Endpoint
```
DELETE /api/icons?id={id}
```

### Authentication
Required - Activity Admin role

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Icon ID ที่ต้องการลบ |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Icon deleted successfully"
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing required parameter: id"
}
```

**404 Not Found**
```json
{
  "error": "Icon not found"
}
```

### Example Usage

```bash
curl -X DELETE "https://api.example.com/api/icons?id=50" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

---

## Notes

### Image Upload Guidelines

1. **Banners**:
   - Recommended size: 1920x1080 px (16:9 ratio)
   - Formats: JPG, PNG, WebP
   - Max file size: 5MB

2. **Logos**:
   - Recommended size: 512x512 px (square)
   - Format: PNG (with transparency)
   - Max file size: 2MB

### Cloudinary Integration

- All images are uploaded to Cloudinary
- Auto-optimization enabled
- Secure URLs (HTTPS)
- Auto-generated thumbnails
- CDN delivery

### Display Priority

Banners are displayed in this order:
1. `isMain: true` first
2. Lower `sortOrder` first (0, 1, 2, ...)
3. Newer `createdAt` first

### Security

- Only Activity Admin can upload/modify media
- All users can view active media
- Image validation on upload
- Cloudinary credentials secured in environment variables
