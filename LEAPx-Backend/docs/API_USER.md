# User & Utilities API

API สำหรับข้อมูลผู้ใช้และ utility endpoints

## Table of Contents

### Health Check & Testing
- [GET /api/hello](#get-apihello) - Health check endpoint
- [GET /api/hello/info](#get-apihelloinfo) - User info และ system status

### User Services
- [GET /api/user/current-event](#get-apiusercurrent-event) - ดึงข้อมูลอีเวนต์ที่กำลังเข้าร่วม

### Role Management
- [GET /api/role](#get-apirole) - ดึงรายการผู้ใช้พร้อม role และ major categories
- [PATCH /api/role](#patch-apirole) - เปลี่ยน role ของผู้ใช้ตามสิทธิ์

---

## GET /api/hello

Health check endpoint สำหรับตรวจสอบว่า API ทำงานปกติ

### Endpoint
```
GET /api/hello
```

### Authentication
ไม่ต้องการ (Public endpoint)

### Response

#### Success (200 OK)

```json
{
  "LEAPx": "Hello LEAPx!🍀🍀🍀"
}
```

### Business Logic

- Simple health check
- ใช้ตรวจสอบว่า API server ทำงาน
- ไม่มี logic ซับซ้อน

### Use Cases

1. **Health Monitoring**:
   - Uptime monitoring tools
   - Load balancer health checks
   - CI/CD pipeline verification

2. **Connection Testing**:
   - Test API connectivity
   - Verify CORS settings
   - Debug network issues

### Example Usage

#### cURL

```bash
curl https://api.example.com/api/hello
```

#### JavaScript

```javascript
async function checkAPIHealth() {
  try {
    const response = await fetch('/api/hello');
    const data = await response.json();
    
    if (response.ok) {
      console.log('API is healthy:', data.LEAPx);
      return true;
    } else {
      console.error('API returned error');
      return false;
    }
  } catch (error) {
    console.error('API is unreachable:', error);
    return false;
  }
}

// Usage
const isHealthy = await checkAPIHealth();
```

#### Health Monitoring Script

```javascript
import fetch from 'node-fetch';

async function monitorAPI() {
  const endpoints = [
    '/api/hello',
    '/api/auth',
    '/api/media'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await fetch(`https://api.example.com${endpoint}`);
      const duration = Date.now() - start;
      
      console.log(`${endpoint}: ${response.status} (${duration}ms)`);
    } catch (error) {
      console.error(`${endpoint}: FAILED - ${error.message}`);
    }
  }
}

// Run every 5 minutes
setInterval(monitorAPI, 5 * 60 * 1000);
```

---

## GET /api/hello/info

ดึงข้อมูล user และ system information (สำหรับ authenticated users)

### Endpoint
```
GET /api/hello/info
```

### Authentication
Required - LEAP_AUTH และ LEAP_USER cookies

### Response

#### Success (200 OK)

```json
{
  "LEAP": "Hello LEAP!🍀🍀🍀",
  "userId": 123,
  "CMU_YEAR": 3,
  "displayText": "นักศึกษาปี 3",
  "isExternal": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| LEAP | string | Welcome message |
| userId | number | User ID ของผู้ใช้ที่ล็อกอิน |
| CMU_YEAR | string/number | ชั้นปีของนักศึกษา (1-4) หรือ "EXTERNAL" |
| displayText | string | ข้อความแสดงสถานะ (ภาษาไทย) |
| isExternal | boolean | เป็นบุคคลภายนอกหรือไม่ |

### Response Examples

#### นักศึกษา CMU

```json
{
  "LEAP": "Hello LEAP!🍀🍀🍀",
  "userId": 123,
  "CMU_YEAR": 2,
  "displayText": "นักศึกษาปี 2",
  "isExternal": false
}
```

#### บุคคลภายนอก

```json
{
  "LEAP": "Hello LEAP!🍀🍀🍀",
  "userId": 999,
  "CMU_YEAR": "EXTERNAL",
  "displayText": "บุคคลภายนอก",
  "isExternal": true
}
```

#### ไม่สามารถระบุได้

```json
{
  "LEAP": "Hello LEAP!🍀🍀🍀",
  "userId": 456,
  "CMU_YEAR": null,
  "displayText": "ไม่สามารถระบุสถานะได้",
  "isExternal": false
}
```

### Business Logic

1. **User ID Extraction**:
   - อ่าน userId จาก LEAP_AUTH cookie
   - Verify token validity

2. **CMU Year Calculation**:
   - ดึง student ID จากฐานข้อมูล
   - คำนวณจากเลข 2 หลักแรกของรหัสนักศึกษา
   - Formula: `CurrentYear - (2500 + first2digits) + 1`
   - Example: 640610xxx → 64 → 2024 - (2500 + 64) + 1 = -540 (invalid) → recalculate

3. **External User Detection**:
   - ถ้า student ID ไม่ใช่ CMU format → EXTERNAL
   - ถ้า year calculation ผิดปกติ → อาจเป็น EXTERNAL

4. **Display Text Generation**:
   - CMU students: "นักศึกษาปี {year}"
   - External: "บุคคลภายนอก"
   - Unknown: "ไม่สามารถระบุสถานะได้"

### Use Cases

1. **Profile Display**:
   - แสดงข้อมูลผู้ใช้บนหน้าโปรไฟล์
   - แสดงสถานะนักศึกษา

2. **Permission Check**:
   - ตรวจสอบสิทธิ์ตามชั้นปี
   - Filter contented based on user status

3. **Analytics**:
   - Track user types
   - Generate reports by year level

### Example Usage

#### Basic Request

```bash
curl https://api.example.com/api/hello/info \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

#### JavaScript

```javascript
async function getUserInfo() {
  const response = await fetch('/api/hello/info', {
    credentials: 'include' // Include cookies
  });
  
  const data = await response.json();
  
  console.log(`User ID: ${data.userId}`);
  console.log(`Status: ${data.displayText}`);
  
  if (data.isExternal) {
    console.log('This is an external user');
  } else if (data.CMU_YEAR) {
    console.log(`CMU Year ${data.CMU_YEAR} student`);
  }
  
  return data;
}
```

#### React Component

```javascript
import { useState, useEffect } from 'react';

function UserBadge() {
  const [userInfo, setUserInfo] = useState(null);
  
  useEffect(() => {
    fetch('/api/hello/info', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUserInfo(data))
      .catch(error => console.error('Failed to load user info:', error));
  }, []);
  
  if (!userInfo) return <div>Loading...</div>;
  
  return (
    <div className="user-badge">
      <span className="user-id">User #{userInfo.userId}</span>
      <span className={`status ${userInfo.isExternal ? 'external' : 'student'}`}>
        {userInfo.displayText}
      </span>
      {!userInfo.isExternal && userInfo.CMU_YEAR && (
        <span className="year-badge">Year {userInfo.CMU_YEAR}</span>
      )}
    </div>
  );
}
```

---

## GET /api/user/current-event

ดึงข้อมูลอีเวนต์ที่ผู้ใช้กำลังเข้าร่วมอยู่ (checked in แต่ยัง check out)

### Endpoint
```
GET /api/user/current-event
```

### Authentication
Required - LEAP_AUTH และ LEAP_USER cookies

### Response

#### Success - มีอีเวนต์ที่กำลังเข้าร่วม (200 OK)

```json
{
  "success": true,
  "message": "Currently attending event",
  "data": {
    "registrationId": 100,
    "eventId": 10,
    "eventTitle_TH": "เวิร์คช็อปวิทยาการคอมพิวเตอร์",
    "eventTitle_EN": "Computer Science Workshop",
    "description_TH": "เรียนรู้การเขียนโปรแกรม",
    "description_EN": "Learn programming",
    "location_TH": "ห้อง 101",
    "location_EN": "Room 101",
    "isOnline": false,
    "meetingLink": null,
    "activityStart": "2024-02-01T09:00:00Z",
    "activityEnd": "2024-02-01T17:00:00Z",
    "registrationStatus": "ATTENDED",
    "checkInTime": "2024-02-01T09:05:00Z",
    "allowMultipleCheckIns": true,
    "checkInSlots": [
      {
        "slotId": 1,
        "slotNumber": 1,
        "checkInTime": "2024-02-01T09:05:00Z",
        "startTime": "2024-02-01T09:00:00Z",
        "endTime": "2024-02-01T10:00:00Z",
        "checkedOut": false,
        "checkOutTime": null
      }
    ],
    "currentCheckInSlot": {
      "slotId": 1,
      "slotNumber": 1,
      "checkInTime": "2024-02-01T09:05:00Z",
      "startTime": "2024-02-01T09:00:00Z",
      "endTime": "2024-02-01T10:00:00Z",
      "checkedOut": false,
      "checkOutTime": null
    }
  }
}
```

#### Success - ไม่มีอีเวนต์ที่กำลังเข้าร่วม (200 OK)

```json
{
  "success": true,
  "message": "No current event",
  "data": null
}
```

#### Error Responses

**401 Unauthorized** - ไม่มี token หรือ token ไม่ถูกต้อง
```json
{
  "error": "No token provided"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "error": "Failed to fetch current event",
  "details": "Error message"
}
```

### Business Logic

1. **Current Event Criteria**:
   - Registration status: ATTENDED หรือ LATE
   - `checkedIn: true` และ `checkedOut: false`
   - Event status: PUBLISHED
   - `activityStart <= now <= activityEnd` (อีเวนต์กำลังดำเนินอยู่)

2. **Multiple Check-ins**:
   - หาก `allowMultipleCheckIns: true` → อาจมีหลาย check-in slots
   - แสดง `currentCheckInSlot` เป็น slot ล่าสุด

3. **Online Events**:
   - ถ้า `isOnline: true` → มี `meetingLink`
   - ผู้ใช้สามารถเข้าร่วมผ่าน link

4. **Data Privacy**:
   - ดึงข้อมูลเฉพาะอีเวนต์ของผู้ใช้เท่านั้น
   - ไม่แสดงข้อมูลอีเวนต์ของคนอื่น

### Use Cases

1. **Active Event Display**:
   - แสดง banner อีเวนต์ที่กำลังเข้าร่วม
   - แสดง countdown ถึงเวลา check-out

2. **Quick Access**:
   - ลิงก์ไปยังอีเวนต์ที่กำลังเข้าร่วม
   - ลิงก์ meeting สำหรับอีเวนต์ออนไลน์

3. **Check-out Button**:
   - แสดงปุ่ม check-out เมื่ออยู่ในอีเวนต์
   - รองรับ multiple check-in slots

4. **Prevent Overlap**:
   - ป้องกันการ check-in อีเวนต์ใหม่ขณะที่ยังอยู่ในอีเวนต์อื่น

### Example Usage

#### Basic Request

```bash
curl https://api.example.com/api/user/current-event \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

#### JavaScript

```javascript
async function getCurrentEvent() {
  const response = await fetch('/api/user/current-event', {
    credentials: 'include'
  });
  
  const result = await response.json();
  
  if (result.success && result.data) {
    const event = result.data;
    console.log(`Currently attending: ${event.eventTitle_EN}`);
    console.log(`Location: ${event.location_EN}`);
    console.log(`Check-in time: ${event.checkInTime}`);
    
    if (event.isOnline && event.meetingLink) {
      console.log(`Join meeting: ${event.meetingLink}`);
    }
    
    return event;
  } else {
    console.log('No current event');
    return null;
  }
}
```

#### React Component - Current Event Banner

```javascript
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

function CurrentEventBanner() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadCurrentEvent();
    
    // Refresh every minute
    const interval = setInterval(loadCurrentEvent, 60000);
    return () => clearInterval(interval);
  }, []);
  
  const loadCurrentEvent = async () => {
    try {
      const response = await fetch('/api/user/current-event', {
        credentials: 'include'
      });
      const result = await response.json();
      setEvent(result.data);
    } catch (error) {
      console.error('Failed to load current event:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  if (!event) return null; // No current event
  
  const timeRemaining = formatDistanceToNow(
    new Date(event.activityEnd),
    { addSuffix: true }
  );
  
  return (
    <div className="current-event-banner">
      <div className="event-info">
        <h3>{event.eventTitle_EN}</h3>
        <p className="location">
          {event.isOnline ? '🌐 Online' : `📍 ${event.location_EN}`}
        </p>
        <p className="time-remaining">
          Ends {timeRemaining}
        </p>
      </div>
      
      <div className="event-actions">
        {event.isOnline && event.meetingLink && (
          <a
            href={event.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-join"
          >
            Join Meeting
          </a>
        )}
        
        <button
          onClick={() => handleCheckOut(event.eventId)}
          className="btn-checkout"
        >
          Check Out
        </button>
      </div>
    </div>
  );
}
```

#### Check-out Handler

```javascript
async function handleCheckOut(eventId) {
  const confirmed = confirm('Are you sure you want to check out?');
  if (!confirmed) return;
  
  try {
    const response = await fetch('/api/checkin/checkout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId })
    });
    
    if (response.ok) {
      alert('Checked out successfully!');
      window.location.reload();
    } else {
      const error = await response.json();
      alert(`Failed to check out: ${error.message}`);
    }
  } catch (error) {
    alert('Network error. Please try again.');
  }
}
```

#### Multiple Check-in Slots Display

```javascript
function CheckInSlotsList({ event }) {
  if (!event.allowMultipleCheckIns) {
    return (
      <div className="single-checkin">
        <p>Checked in at: {formatTime(event.checkInTime)}</p>
      </div>
    );
  }
  
  return (
    <div className="multiple-checkin-slots">
      <h4>Check-in Records:</h4>
      <ul>
        {event.checkInSlots.map((slot, index) => (
          <li key={slot.slotId}>
            <span className="slot-number">Slot {slot.slotNumber}</span>
            <span className="slot-time">
              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
            </span>
            <span className={`slot-status ${slot.checkedOut ? 'completed' : 'active'}`}>
              {slot.checkedOut ? '✓ Completed' : '⏱ In Progress'}
            </span>
            {!slot.checkedOut && index === event.checkInSlots.length - 1 && (
              <button onClick={() => handleCheckOut(event.eventId, slot.slotId)}>
                Check Out Slot {slot.slotNumber}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## GET /api/role

ดึงรายการผู้ใช้สำหรับหน้าจัดการ role พร้อม role ปัจจุบัน, major categories และสิทธิ์การแก้ไขราย user

### Endpoint
```
GET /api/role?page=1&limit=20&search=chae&majorCategoryId=3
```

### Authentication
Required - ACTIVITY_ADMIN, SKILL_ADMIN หรือ SUPREME

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | หน้าที่ต้องการ (เริ่มที่ 1) |
| limit | number | No | 20 | จำนวนรายการต่อหน้า (สูงสุด 100) |
| search | string | No | - | ค้นหาจาก firstName, lastName, email หรือ id |
| majorCategoryId | number | No | - | กรองเฉพาะ user ที่เป็น major admin ในหมวดนี้ |

### Permission Rules

1. **SUPREME**:
   - เห็นผู้ใช้ได้ทั้งหมด
   - ใช้ `majorCategoryId` ได้ทุกหมวด

2. **Category Admin (ACTIVITY_ADMIN/SKILL_ADMIN ที่มี major assignment)**:
   - เห็นเฉพาะผู้ใช้ที่มี major category ซ้อนกับหมวดที่ตัวเองดูแล
   - ถ้าส่ง `majorCategoryId` ที่ไม่ใช่หมวดตัวเอง → `403`
   - ถ้าไม่มี major assignment เลย → `403`

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 650612077,
      "firstName": "Chae",
      "lastName": "Young",
      "email": "chae@example.com",
      "currentRole": {
        "id": 4,
        "name": "ACTIVITY_ADMIN"
      },
      "majorCategories": [
        {
          "id": 3,
          "code": "CPE",
          "name_TH": "วิศวกรรมคอมพิวเตอร์",
          "name_EN": "Computer Engineering",
          "majorAdminRole": "ADMIN"
        }
      ],
      "permission": {
        "canEdit": true,
        "editableMajorCategoryIds": [3]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 42,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "access": {
    "role": "ACTIVITY_ADMIN",
    "isSupreme": false,
    "managedMajorCategoryIds": [3, 5]
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "majorCategoryId must be a positive integer"
}
```

**403 Forbidden**
```json
{
  "error": "You can only view users in your managed major categories"
}
```

---

## PATCH /api/role

เปลี่ยน role ของผู้ใช้เป้าหมาย

### Endpoint
```
PATCH /api/role
```

### Authentication
Required - ACTIVITY_ADMIN, SKILL_ADMIN หรือ SUPREME

### Request Body

```json
{
  "user_id": 650612077,
  "new_role_id": 4
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | number | Yes | id ของ user เป้าหมาย |
| new_role_id | number | Yes | role id ใหม่ที่ต้องการเปลี่ยน |

### Permission Rules

1. **SUPREME**:
   - เปลี่ยน role ของทุก user ได้

2. **Category Admin (non-SUPREME)**:
   - ต้องมี major assignment อย่างน้อย 1 หมวด
   - เปลี่ยนได้เฉพาะ user ที่มี major category ซ้อนกับหมวดที่ตัวเองดูแล
   - ห้ามเปลี่ยน role ที่เป็น/ไปเป็น `SKILL_ADMIN` หรือ `SUPREME`

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "User role updated successfully",
  "data": {
    "user": {
      "id": 650612077,
      "role_id": 4,
      "role": {
        "id": 4,
        "name": "ACTIVITY_ADMIN"
      }
    },
    "previousRole": {
      "id": 3,
      "name": "STUDENT"
    },
    "newRole": {
      "id": 4,
      "name": "ACTIVITY_ADMIN"
    }
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "user_id and new_role_id must be integers"
}
```

**403 Forbidden**
```json
{
  "error": "You can only change role for users in your managed categories"
}
```

```json
{
  "error": "Category admin can only update roles below SKILL_ADMIN"
}
```

### Example Usage

#### cURL (GET)

```bash
curl "https://api.example.com/api/role?page=1&limit=20&majorCategoryId=3" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token"
```

#### cURL (PATCH)

```bash
curl -X PATCH https://api.example.com/api/role \
  -H "Content-Type: application/json" \
  -H "Cookie: LEAP_AUTH=token; LEAP_USER=token" \
  -d '{"user_id":650612077,"new_role_id":4}'
```

---

## Integration Examples

### Navigation Guard

```javascript
// Prevent navigation to other events while attending one
async function canNavigateToEvent(newEventId) {
  const response = await fetch('/api/user/current-event', {
    credentials: 'include'
  });
  
  const result = await response.json();
  
  if (result.data && result.data.eventId !== newEventId) {
    const confirmed = confirm(
      `You are currently attending "${result.data.eventTitle_EN}". ` +
      'Do you want to check out and navigate to another event?'
    );
    
    if (confirmed) {
      await handleCheckOut(result.data.eventId);
      return true;
    }
    return false;
  }
  
  return true; // No current event or navigating to same event
}

// Usage in router
router.beforeEach(async (to, from, next) => {
  if (to.name === 'event-detail') {
    const canNavigate = await canNavigateToEvent(to.params.eventId);
    if (canNavigate) {
      next();
    } else {
      next(false);
    }
  } else {
    next();
  }
});
```

### Dashboard Widget

```javascript
function DashboardCurrentEvent() {
  const [event, setEvent] = useState(null);
  
  useEffect(() => {
    fetch('/api/user/current-event', { credentials: 'include' })
      .then(res => res.json())
      .then(result => setEvent(result.data));
  }, []);
  
  if (!event) {
    return (
      <div className="dashboard-widget empty">
        <h3>Current Event</h3>
        <p>You are not attending any event right now</p>
        <a href="/events" className="btn-browse">Browse Events</a>
      </div>
    );
  }
  
  return (
    <div className="dashboard-widget current-event">
      <h3>You're Attending</h3>
      <div className="event-card">
        <h4>{event.eventTitle_EN}</h4>
        <div className="event-meta">
          <span className="location">
            {event.isOnline ? 'Online' : event.location_EN}
          </span>
          <span className="time">
            {formatTime(event.activityStart)} - {formatTime(event.activityEnd)}
          </span>
        </div>
        <div className="event-actions">
          <a href={`/events/${event.eventId}`} className="btn-view">
            View Details
          </a>
          {event.isOnline && event.meetingLink && (
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-join"
            >
              Join Meeting
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Best Practices

### Health Checks

1. **Monitoring**:
   - Use `/api/hello` for uptime monitoring
   - Set up alerts for downtime
   - Monitor response times

2. **Load Balancing**:
   - Configure health check endpoint
   - Set appropriate timeout
   - Handle graceful degradation

### User Info

1. **Caching**:
   - Cache user info on client side
   - Refresh periodically
   - Invalidate on logout

2. **Display**:
   - Show user status prominently
   - Handle loading states
   - Provide fallback for unknown status

### Current Event

1. **Polling**:
   - Poll `/api/user/current-event` periodically
   - Use reasonable interval (30-60 seconds)
   - Stop polling when inactive

2. **Real-time Updates**:
   - Consider WebSocket for real-time updates
   - Show notifications on event changes
   - Update UI immediately

3. **Error Handling**:
   - Handle network errors gracefully
   - Show user-friendly error messages
   - Provide retry mechanism

### Security

1. **Authentication**:
   - Always include cookies in requests
   - Handle 401 errors (redirect to login)
   - Refresh tokens when needed

2. **Data Privacy**:
   - Never expose other users' data
   - Validate user permissions
   - Log access attempts

---

## Troubleshooting

### Health Check Issues

**Problem**: `/api/hello` returns error

**Solutions**:
1. Check server logs
2. Verify server is running
3. Check network connectivity
4. Verify CORS settings

### User Info Issues

**Problem**: CMU_YEAR is incorrect

**Solutions**:
1. Verify student ID format
2. Check year calculation logic
3. Update student ID if needed

**Problem**: isExternal is wrong

**Solutions**:
1. Verify user's student ID
2. Check database entry
3. Update user profile

### Current Event Issues

**Problem**: Current event not showing

**Solutions**:
1. Verify user is checked in
2. Check event time range
3. Verify event status is PUBLISHED
4. Check database records

**Problem**: Can't check out

**Solutions**:
1. Verify check-out API endpoint
2. Check user permissions
3. Verify event allows check-out

---

## Notes

### API Versioning

Current version: v1 (implicit)

Future versions will use explicit versioning:
- `/api/v2/hello`
- `/api/v2/user/current-event`

### Rate Limiting

Recommended limits:
- `/api/hello`: No limit (health check)
- `/api/hello/info`: 60 requests/minute
- `/api/user/current-event`: 30 requests/minute

### Response Times

Target response times:
- `/api/hello`: < 50ms
- `/api/hello/info`: < 200ms
- `/api/user/current-event`: < 300ms
