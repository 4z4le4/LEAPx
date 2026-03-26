# LEAPx Monorepo

ภาพรวมโปรเจกต์ LEAPx (Learning Enhancement through Activity Participation)

README นี้เป็นคู่มือระดับบนสุดของทั้งระบบ เพื่อเริ่มต้นใช้งานก่อนแยกไปอ่านรายละเอียดในฝั่ง Frontend และ Backend

## โครงสร้างโปรเจกต์

```text
LEAPx/
├── LEAPx-Frontend/   # เว็บแอปฝั่งผู้ใช้ (React + Vite)
└── LEAPx-Backend/    # API และ Worker (Next.js + Prisma + Redis)
```

## Tech Stack โดยรวม

- Frontend: React 19, Vite, TypeScript, Tailwind CSS
- Backend: Next.js 15, TypeScript, Prisma ORM, PostgreSQL
- Queue/Worker: BullMQ + Redis
- Cloud/Integration: Firebase, Cloudinary, OAuth (CMU EntraID)

## เริ่มต้นแบบเร็ว (Local Development)

### 1) เตรียมเครื่องมือ

- Node.js 22+
- npm
- PostgreSQL
- Redis

### 2) ติดตั้ง dependencies ทั้งสองฝั่ง

```bash
cd LEAPx-Backend && npm install
cd ../LEAPx-Frontend && npm install
```

### 3) ตั้งค่า Environment Variables

- ฝั่ง Backend: สร้างไฟล์ `.env.local` ใน `LEAPx-Backend/`
- ฝั่ง Frontend: สร้างไฟล์ `.env` ใน `LEAPx-Frontend/`

หมายเหตุ: ตัวแปรสำคัญของ Backend เช่น Database, JWT, Redis, Firebase, Cloudinary และ OAuth ให้ดูตัวอย่างและรายละเอียดใน README ฝั่ง Backend

### 4) เตรียมฐานข้อมูล (Backend)

```bash
cd LEAPx-Backend
npx prisma migrate dev
npx prisma db seed
```

### 5) รันระบบ (เปิด 2 terminal)

Terminal 1 (Backend):

```bash
cd LEAPx-Backend
npm run dev
```

Terminal 2 (Frontend):

```bash
cd LEAPx-Frontend
npm run dev
```

## พอร์ตที่ใช้งานโดยทั่วไป

- Backend API: http://localhost:3000
- Frontend Web: http://localhost:5173

## Docker (แยกรายโปรเจกต์)

ทั้ง `LEAPx-Frontend/` และ `LEAPx-Backend/` มี `docker-compose.yml` ของตัวเอง

ตัวอย่าง:

```bash
cd LEAPx-Backend
docker compose up --build
```

และ

```bash
cd LEAPx-Frontend
docker compose up --build
```

## เอกสารแยกรายฝั่ง

- Frontend: [LEAPx-Frontend/README.md](LEAPx-Frontend/README.md)
- Backend: [LEAPx-Backend/README.md](LEAPx-Backend/README.md)

## เอกสาร API

- เอกสาร API ทั้งหมดอยู่ใน `LEAPx-Backend/docs/`

## Workflow แนะนำสำหรับทีมที่จะพัฒนาต่อ

1. เริ่มจาก README นี้เพื่อเข้าใจภาพรวมระบบ
2. เข้าไปอ่าน README ของฝั่งที่กำลังพัฒนา
3. หากทำงานกับ API ให้ยึดเอกสารใน `LEAPx-Backend/docs/` เป็นหลัก
4. แยก commit ระหว่าง Frontend และ Backend ให้ชัดเจน

## หมายเหตุ

- สคริปต์ `npm run dev` ของ Backend จะรันทั้ง Next.js และ Worker พร้อมกัน
- ถ้าเปิดระบบครั้งแรก แนะนำให้เช็กการเชื่อมต่อ PostgreSQL และ Redis ก่อน
