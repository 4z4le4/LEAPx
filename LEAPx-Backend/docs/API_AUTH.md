# Authentication & Authorization API

API สำหรับการยืนยันตัวตนและจัดการสิทธิ์การเข้าถึง

## Table of Contents

- [POST /api/auth](#post-apiauth) - สร้าง/อัปเดตบัญชีและล็อกอิน
- [GET /api/auth](#get-apiauth) - ดึงข้อมูลผู้ใช้ปัจจุบัน
- [DELETE /api/auth](#delete-apiauth) - ล็อกเอาท์
- [GET /api/auth/verify](#get-apiauthverify) - ตรวจสอบสถานะการล็อกอิน
- [POST /api/signIn](#post-apisignin) - ล็อกอินด้วย CMU EntraID
- [GET /api/whoAmI](#get-apiwhoami) - ดึงข้อมูล CMU EntraID

---

## POST /api/auth

สร้างบัญชีใหม่หรืออัปเดตข้อมูลและล็อกอิน

### Endpoint
```
POST /api/auth
```

### Authentication
ไม่ต้องการ (Public endpoint)

### Request Body

```json
{
  "cmu_id": "640610xxx",
  "email": "user@cmu.ac.th",
  "Fname": "สมชาย",
  "Lname": "ใจดี",
  "faculty": "Engineering",
  "picture": "https://example.com/photo.jpg"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cmu_id | string | No | รหัสนักศึกษา CMU (1-99999999) หากไม่ระบุจะ auto-assign |
| email | string | Yes | Email address (unique) |
| Fname | string | Yes | ชื่อจริง |
| Lname | string | No | นามสกุล (default: "-") |
| faculty | string | Yes | คณะ (default: "outsider") |
| picture | string | No | URL รูปโปรไฟล์ |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": 123,
    "firstName": "สมชาย",
    "lastName": "ใจดี",
    "email": "user@cmu.ac.th",
    "faculty": "Engineering",
    "photo": "https://example.com/photo.jpg"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isNewUser": true
}
```

**Cookies Set:**
- `LEAP_AUTH`: JWT token (HttpOnly, 1 day expiry)
- `LEAP_USER`: JWT with role info (HttpOnly, 1 day expiry)

#### Error Responses

**400 Bad Request** - ข้อมูลไม่ครบหรือไม่ถูกต้อง
```json
{
  "error": "Missing required fields: email, Fname, faculty"
}
```

**403 Forbidden** - บัญชีถูกปิดการใช้งาน
```json
{
  "error": "Account is deactivated"
}
```

**409 Conflict** - ข้อมูลขัดแย้ง
```json
{
  "error": "Email user@cmu.ac.th already exists with ID 456, but you're trying to use ID 123"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

### Business Logic

1. **การสร้าง User ใหม่**:
   - หากไม่ระบุ `cmu_id` จะหา ID ว่างถัดไป (1-99999999)
   - Role เริ่มต้น = USER (role_id: 1)
   - isActive = true

2. **การอัปเดต User เดิม**:
   - ตรวจสอบจาก email
   - อัปเดต firstName, lastName, faculty, photo
   - ไม่สามารถเปลี่ยน email ได้

3. **การตรวจสอบความขัดแย้ง**:
   - ถ้า ID และ email มีอยู่แล้วแต่ไม่ตรงกัน → Error 409
   - ถ้า ID มีแล้วแต่ email ต่างกัน → Error 409

4. **Token Generation**:
   - LEAP_AUTH: userId + timestamp (1 day expiry)
   - LEAP_USER: userId + role (1 day expiry)

### Example Usage

#### cURL

```bash
curl -X POST https://api.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@cmu.ac.th",
    "Fname": "John",
    "Lname": "Doe",
    "faculty": "Engineering"
  }'
```

#### JavaScript (Fetch)

```javascript
const response = await fetch('/api/auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({
    email: 'john@cmu.ac.th',
    Fname: 'John',
    Lname: 'Doe',
    faculty: 'Engineering'
  })
});

const data = await response.json();
```

---

## GET /api/auth

ดึงข้อมูลผู้ใช้ที่ล็อกอินอยู่

### Endpoint
```
GET /api/auth
```

### Authentication
Required - LEAP_AUTH และ LEAP_USER cookies

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "user": {
    "id": 123,
    "firstName": "สมชาย",
    "lastName": "ใจดี",
    "email": "user@cmu.ac.th",
    "faculty": "Engineering",
    "major": "Computer Engineering",
    "photo": "https://example.com/photo.jpg",
    "isActive": true,
    "CMU_YEAR": 3
  }
}
```

#### Error Responses

**401 Unauthorized** - ไม่มี token หรือ token ไม่ถูกต้อง
```json
{
  "error": "No token provided"
}
```

**404 Not Found** - ไม่พบผู้ใช้หรือบัญชีถูกปิด
```json
{
  "error": "User not found or inactive"
}
```

### Business Logic

1. ตรวจสอบ LEAP_AUTH และ LEAP_USER tokens
2. Verify tokens และตรวจสอบ userId ตรงกัน
3. ดึงข้อมูล user จาก database พร้อม role
4. คำนวณ CMU_YEAR จากรหัสนักศึกษา
5. ส่งข้อมูลกลับ

**CMU_YEAR Calculation:**
- Extract first 2 digits of student ID
- Calculate: CurrentYear - (2500 + first2digits) + 1

### Example Usage

```javascript
const response = await fetch('/api/auth', {
  method: 'GET',
  credentials: 'include'
});

const data = await response.json();
if (data.success) {
  console.log('User:', data.user);
}
```

---

## DELETE /api/auth

ล็อกเอาท์ - ลบ authentication cookies

### Endpoint
```
DELETE /api/auth
```

### Authentication
ไม่จำเป็นต้องมี (แต่ควรมี)

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Cookies Cleared:**
- `LEAP_AUTH` - ตั้ง maxAge = 0
- `LEAP_USER` - ตั้ง maxAge = 0

### Example Usage

```javascript
const response = await fetch('/api/auth', {
  method: 'DELETE',
  credentials: 'include'
});

const data = await response.json();
if (data.success) {
  window.location.href = '/login';
}
```

---

## GET /api/auth/verify

ตรวจสอบสถานะการล็อกอิน (Verify Token)

### Endpoint
```
GET /api/auth/verify
```

### Authentication
Required - LEAP_AUTH และ LEAP_USER cookies

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": 123,
    "firstName": "สมชาย",
    "lastName": "ใจดี",
    "email": "user@cmu.ac.th",
    "faculty": "Engineering",
    "major": "Computer Engineering",
    "photo": "https://example.com/photo.jpg",
    "role": "USER",
    "isActive": true,
    "CMU_YEAR": 3
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "success": false,
  "authenticated": false,
  "error": "No authentication token found"
}
```

```json
{
  "success": false,
  "authenticated": false,
  "error": "Token mismatch"
}
```

```json
{
  "success": false,
  "authenticated": false,
  "error": "Invalid or expired token"
}
```

**404 Not Found**
```json
{
  "success": false,
  "authenticated": false,
  "error": "User not found or inactive"
}
```

### Business Logic

1. ตรวจสอบว่ามี token ทั้ง 2 ตัว
2. Verify และ decode tokens
3. ตรวจสอบว่า userId ใน 2 tokens ตรงกัน
4. Query user จาก database
5. ตรวจสอบ isActive status
6. คำนวณ CMU_YEAR
7. ส่งข้อมูล user + authenticated status

### Use Case

ใช้สำหรับ:
- Protected routes ใน frontend (ตรวจสอบว่าล็อกอินอยู่หรือไม่)
- Persistent login (auto-login จาก cookies)
- Middleware ตรวจสอบสิทธิ์

### Example Usage

```javascript
// React Example - Protected Route
useEffect(() => {
  const verifyAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (!data.authenticated) {
        router.push('/login');
      } else {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      router.push('/login');
    }
  };
  
  verifyAuth();
}, []);
```

---

## POST /api/signIn

ล็อกอินด้วย CMU EntraID OAuth

### Endpoint
```
POST /api/signIn
```

### Authentication
ไม่ต้องการ (Public endpoint)

### Request Body

```json
{
  "authorizationCode": "ABC123XYZ..."
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| authorizationCode | string | Yes | Authorization code จาก CMU EntraID OAuth flow |

### Response

#### Success (200 OK)

```json
{
  "ok": true
}
```

**Cookie Set:**
- `cmu-entraid`: JWT with CMU basic info (1 day expiry)

#### Error Responses

**400 Bad Request**
```json
{
  "ok": false,
  "message": "Invalid authorization code"
}
```

```json
{
  "ok": false,
  "message": "Cannot get EntraID access token"
}
```

```json
{
  "ok": false,
  "message": "Cannot get cmu basic info"
}
```

**500 Internal Server Error**
```json
{
  "ok": false,
  "message": "Internal server error"
}
```

### Business Logic

1. **Exchange Authorization Code**:
   - POST to CMU EntraID token endpoint
   - ส่ง code, redirect_uri, client_id, client_secret
   - ได้ access_token กลับมา

2. **Fetch CMU Basic Info**:
   - GET CMU basic info endpoint with access_token
   - ได้ข้อมูล: student_id, name, faculty, organization, etc.

3. **Generate JWT**:
   - สร้าง JWT เก็บข้อมูล CMU
   - Expiry: 1 hour
   - Set cookie: cmu-entraid

### CMU EntraID Data Structure

JWT payload contains:
```json
{
  "cmuitaccount_name": "john_d",
  "cmuitaccount": "john.d@cmu.ac.th",
  "student_id": "640610xxx",
  "prename_TH": "นาย",
  "prename_EN": "Mr.",
  "firstname_TH": "สมชาย",
  "firstname_EN": "John",
  "lastname_TH": "ใจดี",
  "lastname_EN": "Doe",
  "organization_code": "30",
  "organization_name_TH": "คณะวิศวกรรมศาสตร์",
  "organization_name_EN": "Faculty of Engineering",
  "itaccounttype_id": "StdAcc",
  "itaccounttype_TH": "บัญชีนักศึกษา",
  "itaccounttype_EN": "Student Account"
}
```

### OAuth Flow

```
1. Frontend → Redirect to CMU EntraID authorize endpoint
2. User login at CMU EntraID
3. CMU EntraID → Redirect back with authorization code
4. Frontend → POST /api/signIn with code
5. Backend → Exchange code for access token
6. Backend → Fetch user info from CMU
7. Backend → Generate JWT and set cookie
8. Frontend → Use /api/auth to create/login user
```

### Example Usage

```javascript
// Step 1: Redirect to CMU EntraID
const redirectToCMULogin = () => {
  const authUrl = `${process.env.CMU_ENTRAID_AUTHORIZE_URL}?` +
    `client_id=${process.env.CMU_ENTRAID_CLIENT_ID}&` +
    `redirect_uri=${process.env.CMU_ENTRAID_REDIRECT_URL}&` +
    `response_type=code&` +
    `scope=${process.env.SCOPE}`;
  
  window.location.href = authUrl;
};

// Step 2: Handle callback with code
const handleCallback = async (code) => {
  const response = await fetch('/api/signIn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ authorizationCode: code })
  });
  
  const data = await response.json();
  if (data.ok) {
    // Get CMU info and create/login user
    const whoAmI = await fetch('/api/whoAmI', {
      credentials: 'include'
    }).then(r => r.json());
    
    // Use CMU info to call /api/auth
    const authResponse = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        cmu_id: whoAmI.cmuBasicInfo[0].student_id,
        email: whoAmI.cmuBasicInfo[0].cmuitaccount,
        Fname: whoAmI.cmuBasicInfo[0].firstname_EN,
        Lname: whoAmI.cmuBasicInfo[0].lastname_EN,
        faculty: whoAmI.cmuBasicInfo[0].organization_name_EN
      })
    });
  }
};
```

---

## GET /api/whoAmI

ดึงข้อมูล CMU EntraID จาก cookie

### Endpoint
```
GET /api/whoAmI
```

### Authentication
Required - `cmu-entraid` cookie

### Response

#### Success (200 OK)

```json
{
  "ok": true,
  "cmuBasicInfo": [
    {
      "cmuitaccount_name": "john_d",
      "cmuitaccount": "john.d@cmu.ac.th",
      "student_id": "640610xxx",
      "prename_TH": "นาย",
      "prename_EN": "Mr.",
      "firstname_TH": "สมชาย",
      "firstname_EN": "John",
      "lastname_TH": "ใจดี",
      "lastname_EN": "Doe",
      "organization_code": "30",
      "organization_name_TH": "คณะวิศวกรรมศาสตร์",
      "organization_name_EN": "Faculty of Engineering",
      "itaccounttype_id": "StdAcc",
      "itaccounttype_TH": "บัญชีนักศึกษา",
      "itaccounttype_EN": "Student Account"
    }
  ]
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "ok": false,
  "message": "Invalid token"
}
```

### Business Logic

1. อ่าน `cmu-entraid` cookie
2. Verify JWT signature
3. Decode และส่งข้อมูลกลับ

### Example Usage

```javascript
const getCMUInfo = async () => {
  const response = await fetch('/api/whoAmI', {
    credentials: 'include'
  });
  
  const data = await response.json();
  if (data.ok) {
    const info = data.cmuBasicInfo[0];
    console.log(`Welcome ${info.firstname_EN} ${info.lastname_EN}`);
  }
};
```

---

## Security Considerations

1. **Token Security**:
   - HttpOnly cookies ป้องกัน XSS
   - SameSite=Strict ป้องกัน CSRF
   - Secure flag ใน production

2. **Token Expiry**:
   - LEAP tokens: 1 day
   - CMU EntraID token: 1 hour
   - Auto-refresh ไม่มี (ต้อง login ใหม่)

3. **Double Token**:
   - LEAP_AUTH: authentication
   - LEAP_USER: authorization (role)
   - ทั้ง 2 ต้องตรงกันและ valid

4. **Rate Limiting**:
   - ควรใช้ rate limiting สำหรับ /api/auth
   - Prevent brute force attacks

5. **CORS**:
   - กำหนด allowed origins
   - Credentials: true สำหรับ cookies

---

## Common Error Scenarios

### Scenario 1: Token Expired
```
User action: Load protected page
Error: 401 Unauthorized "Invalid or expired token"
Solution: Redirect to /login
```

### Scenario 2: Token Mismatch
```
User action: API call
Error: 401 "Token mismatch"
Cause: LEAP_AUTH และ LEAP_USER userId ไม่ตรงกัน
Solution: Clear cookies, redirect to login
```

### Scenario 3: Account Deactivated
```
User action: Login
Error: 403 "Account is deactivated"
Solution: Contact admin
```

### Scenario 4: Email Conflict
```
User action: Register with existing email
Error: 409 "Email already exists..."
Solution: Use different email or login
```

---

## Testing Examples

### Test 1: Register New User

```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@cmu.ac.th",
    "Fname": "Test",
    "Lname": "User",
    "faculty": "Engineering"
  }'
```

### Test 2: Get Current User

```bash
curl -X GET http://localhost:3000/api/auth \
  -b cookies.txt
```

### Test 3: Verify Token

```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -b cookies.txt
```

### Test 4: Logout

```bash
curl -X DELETE http://localhost:3000/api/auth \
  -b cookies.txt
```

---

## Best Practices

1. **Frontend**:
   - Use `credentials: 'include'` ใน fetch
   - ตรวจสอบ auth state ด้วย /api/auth/verify
   - Handle 401 errors globally (redirect to login)

2. **Error Handling**:
   - แสดง error message ที่เป็นมิตร
   - Log errors สำหรับ debugging
   - ไม่ expose sensitive info ใน error messages

3. **User Experience**:
   - Auto-redirect หลัง login/logout
   - Show loading state ขณะ verify token
   - Persistent login check on page load

4. **Security**:
   - ใช้ HTTPS ใน production
   - Set secure flags สำหรับ cookies
   - Validate input data
   - Sanitize user input
