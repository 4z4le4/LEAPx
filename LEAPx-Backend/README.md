# LEAP Backend

ระบบ Backend สำหรับโปรเจค LEAP (Learning Enhancement through Activity Participation) - แพลตฟอร์มจัดการกิจกรรมและพัฒนาทักษะนักศึกษาผ่านแนวคิด Gamification

## ที่มาของโปรเจค

นักศึกษายังคงมีทักษะหลายด้านที่ไม่สอดคล้องกับความต้องการของตลาดแรงงาน ระบบนี้ถูกพัฒนาขึ้นเพื่อส่งเสริมและพัฒนาทักษะสำคัญของผู้เรียน เช่น ทักษะการสื่อสาร การทำงานเป็นทีม ความรู้วิชาชีพ และการพัฒนาตนเองอย่างต่อเนื่อง ผ่านการเข้าร่วมกิจกรรมต่างๆ ในรายวิชา 259191 และ 259192

โดยนำแนวคิด Gamification มาประยุกต์ใช้ เช่น การสะสมประสบการณ์ (EXP) การปลดล็อกระดับ (Level) และการแสดงผลพัฒนาการแบบ Dashboard ซึ่งช่วยสร้างแรงจูงใจและทำให้ผู้เรียนเห็นความคืบหน้าของตนเองอย่างชัดเจน

## คุณสมบัติหลัก

### 1. ระบบจัดการกิจกรรม
- สร้างและจัดการกิจกรรมได้หลายรูปแบบ (ออนไลน์/ออนไซต์)
- กำหนดทักษะที่ได้รับจากการเข้าร่วม
- จัดการจำนวนผู้เข้าร่วมและคุณสมบัติ
- รองรับกิจกรรมหลายช่วงเวลา (Multi-slot)
- ระบบเชิญผู้เข้าร่วมพิเศษ

### 2. ระบบทักษะและประสบการณ์
- ทักษะ 4 ระดับ (Level I, II, III, IV)
- ระบบปลดล็อคแบบลำดับขั้น
- การเก็บ EXP สะสมแม้ยังไม่ปลดล็อค
- ระบบดาว (8/16/32/64 EXP ต่อ 1 ดาว)
- Special Skills สำหรับทักษะพิเศษ (Soft Skills)
- EXP Import System - นำเข้า EXP แบบ bulk ผ่าน Excel

### 3. ระบบเช็คอิน/เช็คเอาท์
- QR Code แบบเข้ารหัส (มีอายุ 1-60 นาที)
- รองรับการเช็คอินหลายครั้ง (Multiple Check-ins)
- Walk-in Registration (ลงทะเบียนอัตโนมัติเมื่อเช็คอิน)
- ระบบคะแนนเข้าสาย (Late Penalty)
- Auto-detect mode (ระบบตัดสินใจเช็คอิน/เอาท์อัตโนมัติ)

### 4. ระบบประเมินผล
- แบบประเมินหลายรูปแบบ (Text, Multiple Choice, Rating)
- คำนวณคะแนนอัตโนมัติ
- Dashboard สำหรับวิเคราะห์ผล

### 5. ระบบจัดการและรายงาน
- Dashboard สำหรับผู้ดูแล
- Export ข้อมูลเป็น Excel
- ระบบอนุมัติอัตโนมัติ (Auto-approval)
- การแจ้งเตือนผ่าน Firebase Cloud Messaging

## เทคโนโลยีที่ใช้

### Backend
- **Next.js 15** - API Routes
- **Node.js 22** - Runtime environment
- **TypeScript** - Type-safe development
- **Prisma ORM** - Database management
- **PostgreSQL** - Main database

### Authentication & Security
- **JWT** - JSON Web Tokens
- **Encryption** - QR Code encryption (AES-256)

### Queue & Background Jobs
- **BullMQ** - Queue management
- **Redis (ioredis)** - Queue storage
- **Cron** - Scheduled jobs

### File Processing
- **ExcelJS** - Excel file generation
- **XLSX** - Excel parsing

### Cloud Services
- **Cloudinary** - Image storage
- **Firebase Admin SDK** - Push notifications

### API Integration
- **Axios** - HTTP client
- **CMU EntraID OAuth** - CMU authentication

## โครงสร้างโปรเจค

```
LEAP-Backend/
├── src/
│   ├── app/
│   │   ├── api/              # API Routes (61 endpoints)
│   │   │   ├── auth/         # Authentication
│   │   │   ├── events/       # Event management
│   │   │   ├── exp/          # Experience system
│   │   │   ├── skills/       # Skills management
│   │   │   ├── invitations/  # Invitation system
│   │   │   ├── notifications/# Push notifications
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/                  # Utilities & helpers
│   │   ├── prisma.ts
│   │   ├── cloudinary.ts
│   │   ├── fcm.ts
│   │   ├── redis.ts
│   │   └── ...
│   ├── middleware/           # Auth middleware
│   ├── types/                # TypeScript types
│   ├── utils/                # Constants
│   └── workers/              # Background workers
│       ├── approvalWorker.ts
│       ├── notificationWorker.ts
│       └── scheduler.ts
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.ts               # Database seeding
│   └── migrations/           # Migration history
├── docs/                     # API Documentation
│   ├── API_COMPLETE_REFERENCE.md
│   ├── API_AUTH.md
│   ├── API_EVENTS.md
│   ├── API_SKILLS_EXP.md
│   └── ...
└── docker-compose.yml        # Docker configuration
```

## การติดตั้ง

### Requirements
- Node.js 22.x หรือสูงกว่า
- PostgreSQL 14+
- Redis 7+
- npm หรือ yarn

### 1. Clone repository

```bash
git clone <repository-url>
cd LEAP-Backend
```

### 2. ติดตั้ง dependencies

```bash
npm install
```

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` และกำหนดค่าต่อไปนี้:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# JWT Secret
JWT_SECRET="your-secret-key"

# CMU EntraID OAuth
CMU_ENTRAID_CLIENT_ID="your-client-id"
CMU_ENTRAID_CLIENT_SECRET="your-client-secret"
CMU_ENTRAID_REDIRECT_URL="http://localhost:3000/callback"
CMU_ENTRAID_GET_TOKEN_URL="https://oauth.cmu.ac.th/v1/GetToken.aspx"
CMU_ENTRAID_GET_BASIC_INFO="https://misapi.cmu.ac.th/cmuitaccount/v1/api/cmuitaccount/basicinfo"
SCOPE="cmuitaccount.basicinfo"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="" # ถ้ามี

# Firebase (FCM)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email"

# API Keys
NEXT_PUBLIC_API_URL="http://localhost:3000"
INTERNAL_API_KEY="your-internal-key"
```

### 4. ตั้งค่า Database

```bash
# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### 5. เริ่มต้น Development Server

```bash
npm run dev
```

Server จะทำงานที่ `http://localhost:3000`

คำสั่งนี้จะรัน:
- Next.js development server (port 3000)
- Background workers (BullMQ + Cron jobs)

## คำสั่งที่ใช้บ่อย

### Development
```bash
# Development mode (Next.js + Workers)
npm run dev

# Development แบบง่าย (ไม่มี prefix/timestamp)
npm run dev:simple

# รัน workers อย่างเดียว
npm run dev:workers
```

### Production
```bash
# Build project
npm run build

# Start production server (Next.js + Workers)
npm start

# Start production แบบง่าย (Next.js only)
npm run start:simple

# รัน workers อย่างเดียว
npm run start:workers
```

### Database
```bash
# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Run migration
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Seed database
npx prisma db seed

# Reset database
npx prisma migrate reset
```

### Linting
```bash
npm run lint
```

## Docker Deployment

ใช้ Docker Compose สำหรับ development:

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

## API Documentation

เอกสาร API ครบถ้วน 61 endpoints แบ่งเป็น 16 หมวดหมู่ อยู่ในโฟลเดอร์ `docs/`:

- [API Complete Reference](docs/API_COMPLETE_REFERENCE.md) - ภาพรวมและ introduction
- [Authentication & Authorization](docs/API_AUTH.md) - Login, JWT, Role management
- [Events Management](docs/API_EVENTS.md) - การจัดการกิจกรรม
- [Check-in/Check-out System](docs/API_CHECKIN.md) - QR Code, Multi-slot
- [Registration](docs/API_REGISTRATION.md) - ลงทะเบียนเข้าร่วม
- [Experience & Skills](docs/API_SKILLS_EXP.md) - ระดับและประสบการณ์
- [EXP Import System](docs/API_EXP_IMPORT.md) - นำเข้า EXP แบบ bulk ผ่าน Excel
- [Invitations](docs/API_INVITATIONS.md) - ระบบเชิญ
- [Evaluations](docs/API_EVALUATIONS.md) - แบบประเมิน
- [Notifications](docs/API_NOTIFICATIONS.md) - Push notifications
- [Media & Assets](docs/API_MEDIA.md) - รูปภาพและ banners
- [QR Code](docs/API_QR.md) - QR generation
- [Major Management](docs/API_MAJOR.md) - การจัดการสาขา
- [Daily Activities](docs/API_DAILY.md) - Approval workflows
- [Cron Jobs](docs/API_CRON.md) - Background tasks
- [User & Utilities](docs/API_USER.md) - User endpoints
- [System Analysis](docs/API_ANALYSIS.md) - การวิเคราะห์ความครบถ้วน

## User Roles

ระบบมี 5 ระดับสิทธิ์:

1. **USER** - นักศึกษาทั่วไป
   - ลงทะเบียนกิจกรรม
   - ดูทักษะและ EXP ของตัวเอง
   - ทำแบบประเมิน

2. **STAFF** - เจ้าหน้าที่กิจกรรม
   - เช็คอิน/เอาท์ผู้เข้าร่วม
   - ดูข้อมูลกิจกรรมที่รับผิดชอบ

3. **ACTIVITY_ADMIN** - ผู้จัดการกิจกรรม
   - สร้างและจัดการกิจกรรม (ในสาขาที่ตัวเอง admin)
   - อนุมัติการลงทะเบียน
   - ดูรายงานและสถิติ

4. **SKILL_ADMIN** - ผู้จัดการทักษะ
   - จัดการหมวดทักษะ
   - เพิ่มและรีเซ็ต EXP
   - แก้ไขเกณฑ์ระดับ

5. **SUPREME** - ผู้ดูแลระบบ
   - สิทธิ์เต็มทุกฟังก์ชัน
   - จัดการ role ของผู้ใช้
   - จัดการสาขาและ admin

## Database Schema

ใช้ PostgreSQL พร้อม Prisma ORM สำหรับจัดการฐานข้อมูล

### Main Models

- **User** - ข้อมูลผู้ใช้
- **Role** - บทบาทและสิทธิ์
- **Event** - กิจกรรม
- **EventRegistration** - การลงทะเบียน
- **EventStaff** - Staff assignments
- **EventInvitation** - คำเชิญ
- **EventEvaluation** - แบบประเมิน
- **CheckInTimeSlot** - ช่วงเวลาเช็คอิน
- **EventSkillReward** - Skill rewards
- **MainSkillCategory** - ทักษะหลัก
- **SubSkillCategory** - ทักษะย่อย
- **UserSubSkillLevel** - ระดับทักษะของผู้ใช้
- **SpecialSkillCategory** - ทักษะพิเศษ
- **MajorCategory** - สาขาวิชา
- **CloudinaryImage** - รูปภาพ
- **FCMToken** - Notification tokens

ดูรายละเอียดเต็มได้ที่ [prisma/schema.prisma](prisma/schema.prisma)

## Background Workers

ระบบใช้ BullMQ และ Redis สำหรับจัดการงานพื้นหลัง:

### Approval Worker
- อนุมัติการลงทะเบียนอัตโนมัติ
- ทำงานตาม schedule หรือ manual trigger
- ป้องกัน race condition

### Notification Worker
- ส่ง push notifications ผ่าน FCM
- รองรับ broadcast และ targeted messages
- Retry mechanism สำหรับข้อความที่ส่งไม่สำเร็จ

### Scheduler
- Cron jobs สำหรับงานที่ซ้ำ
- Auto-approval ตามเวลาที่กำหนด
- Cleanup tasks

## Security Features

- **JWT Authentication** - HttpOnly cookies, 1 day expiry
- **Role-based Authorization** - 5 ระดับสิทธิ์
- **QR Code Encryption** - AES-256 with time-limited validity
- **Input Validation** - ตรวจสอบข้อมูลทุก endpoint
- **CORS Configuration** - กำหนด allowed origins
- **Transaction Safety** - Database locks ป้องกัน race condition
- **Secure Cookies** - SameSite, Secure flags ใน production

## Performance Optimization

- **Pagination** - ทุก API ที่คืนข้อมูลเยอะ
- **Database Indexing** - ปรับแต่ง indexes สำหรับ query ที่ใช้บ่อย
- **Redis Caching** - Cache สำหรับข้อมูลที่เปลี่ยนไม่บ่อย
- **Background Jobs** - งานหนักทำใน queue
- **Transaction Optimization** - ใช้ serializable isolation ตามความจำเป็น

## Troubleshooting

### Database Connection Error
```bash
# ตรวจสอบ PostgreSQL ทำงานหรือไม่
systemctl status postgresql

# ตรวจสอบ connection string ใน .env.local
echo $DATABASE_URL
```

### Redis Connection Error
```bash
# ตรวจสอบ Redis ทำงานหรือไม่
redis-cli ping

# Start Redis
redis-server
```

### Migration Issues
```bash
# Reset database และ run migrations ใหม่
npx prisma migrate reset

# Generate client ใหม่
npx prisma generate
```

### Workers ไม่ทำงาน
```bash
# ตรวจสอบ Redis connection
# ตรวจสอบ logs
npm run dev:workers
```

## Contributing

### Code Style
- ใช้ ESLint configuration ที่กำหนด
- TypeScript strict mode
- ตั้งชื่อตัวแปรให้สื่อความหมาย
- Comment สำหรับ logic ที่ซับซ้อน

### Git Workflow
1. Create feature branch จาก `main`
2. Commit changes พร้อม descriptive message
3. Test ให้ครบก่อน push
4. Create pull request

### Testing
- Test API endpoints ด้วย Postman หรือ curl
- ตรวจสอบ error handling
- Test edge cases

## License

โปรเจคนี้พัฒนาขึ้นเพื่อใช้ในการศึกษา ภายใต้คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเชียงใหม่

## Team

พัฒนาโดยทีมนักศึกษาวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยเชียงใหม่

## Version

- **Current Version**: v1.1.4
- **Node.js**: 22.x
- **Next.js**: 15.5.7
- **Last Updated**: February 27, 2026

