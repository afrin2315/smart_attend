# SmartAttend

SmartAttend is a full-stack QR-based attendance system built with FastAPI, React, and PostgreSQL on Supabase. It supports both college and industry use cases with role-aware dashboards for admins, teachers, HR teams, students, and employees.

## Quick access

- Live app: https://smart-attend-beryl.vercel.app
- Backend API: https://smartattend-api-production-9bd4.up.railway.app/
- API docs: https://smartattend-api-production-9bd4.up.railway.app/docs

## Why the dual-QR flow matters

SmartAttend reduces proxy attendance by validating two things at the same time:

1. Every user has a permanent personal QR identity generated for their account.
2. Every session has a fresh temporary QR with an expiry time.
3. Attendance is marked only when a logged-in user scans a valid live session QR, so identity and session validity are verified together.

In practice, the teacher or HR manager displays the session QR, and the student or employee scans it from the SmartAttend app while already authenticated with JWT.

## Tech Stack

![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-05998b?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-20232a?style=for-the-badge&logo=react&logoColor=61dafb)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-1f5f8b?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-0f172a?style=for-the-badge&logo=supabase&logoColor=3ecf8e)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-b23b3b?style=for-the-badge)
![Alembic](https://img.shields.io/badge/Alembic-Migrations-374151?style=for-the-badge)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-0f172a?style=for-the-badge&logo=tailwindcss&logoColor=38bdf8)
![WebSockets](https://img.shields.io/badge/WebSockets-Live_Updates-4338ca?style=for-the-badge)

## Feature Highlights

- JWT authentication with bcrypt password hashing
- Permanent personal QR generation for every user
- Expiring session QR generation for teachers and HR teams
- Role-aware dashboards for admin, teacher, HR, student, and employee users
- Real-time live attendance feed over WebSockets
- Attendance status logic for `present`, `late`, and `rejected`
- CSV exports for sessions and user attendance history
- Supabase-backed PostgreSQL persistence
- Demo seed data for realistic local testing

## Roles and onboarding

- `admin`: can sign up directly and manage any account type
- `teacher`: can sign up directly, create sessions, and create student accounts
- `hr`: can sign up directly, create workplace sessions, and create employee accounts
- `student`: created inside the app by teachers
- `employee`: created inside the app by HR

Current signup behavior:

- Public signup is available only for `admin`, `teacher`, and `hr`
- On the signup page:
  - `Teacher` automatically maps to `College`
  - `HR` automatically maps to `Industry`
  - `Admin` can choose the organization type manually

## Main workflows

### Staff session flow

1. Teacher or HR creates a session.
2. SmartAttend generates a unique session QR and expiry window.
3. Staff can open the live session page to monitor attendance in real time.

### Student or employee attendance flow

1. User logs in to SmartAttend.
2. User opens the `Scan QR` page.
3. User scans the live session QR shown by staff.
4. Backend verifies the JWT-authenticated user, session validity, and duplicate attendance rules.
5. Attendance is saved and immediately pushed to the live dashboard.

## Source structure

Generated folders like `frontend/node_modules`, `frontend/dist`, `__pycache__`, and local log files are omitted below.

```text
smartattend/
|-- backend/
|   |-- alembic/
|   |   |-- env.py
|   |   `-- versions/
|   |       `-- 0001_create_smartattend_schema.py
|   |-- routers/
|   |   |-- admin.py
|   |   |-- attendance.py
|   |   |-- auth.py
|   |   |-- reports.py
|   |   `-- sessions.py
|   |-- utils/
|   |   `-- qr_generator.py
|   |-- auth.py
|   |-- database.py
|   |-- main.py
|   |-- models.py
|   |-- schemas.py
|   |-- seed_data.py
|   |-- requirements.txt
|   |-- alembic.ini
|   |-- .env.example
|   `-- .env
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |   `-- client.js
|   |   |-- components/
|   |   |   |-- AttendanceTable.jsx
|   |   |   |-- ProtectedRoute.jsx
|   |   |   |-- QRDisplay.jsx
|   |   |   |-- Sidebar.jsx
|   |   |   `-- StatsCard.jsx
|   |   |-- context/
|   |   |   `-- AuthContext.jsx
|   |   |-- pages/
|   |   |   |-- CreateSession.jsx
|   |   |   |-- Dashboard.jsx
|   |   |   |-- LiveSession.jsx
|   |   |   |-- Login.jsx
teacher@smartattend.com|   |   |   |-- Profile.jsx
|   |   |   |-- Reports.jsx
|   |   |   |-- Scan.jsx
|   |   |   `-- Signup.jsx
|   |   |-- App.jsx
|   |   |-- index.css
|   |   `-- main.jsx
|   |-- package.json
|   |-- vercel.json
|   |-- tailwind.config.js
|   |-- postcss.config.js
|   |-- vite.config.js
|   |-- .env.example
|   `-- .env
|-- render.yaml
`-- README.md
```

## Backend API overview

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Account management

- `GET /admin/users`
- `POST /admin/users`
- `DELETE /admin/users/{id}`

### Sessions

- `POST /sessions/create`
- `GET /sessions/active`
- `PATCH /sessions/{id}/close`
- `GET /sessions/{id}/attendance`
- `WS /sessions/{id}/live`

### Attendance

- `POST /attendance/scan`
- `GET /attendance/me`

### Reports

- `GET /reports/session/{id}/csv`
- `GET /reports/user/{id}/csv`

## Local setup

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create or update `backend/.env`:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres
SECRET_KEY=your-super-secret-jwt-key
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Notes:

- Use the `Session pooler` connection string from `Supabase > Connect`
- If your database password contains special characters, use the exact URI copied from Supabase so it stays URL-encoded correctly
- This project is now documented and configured for Supabase/PostgreSQL, not SQLite

Run migrations, seed data, and start the API:

```bash
alembic upgrade head
python seed_data.py
uvicorn main:app --reload
```

Backend default URL:

```text
http://127.0.0.1:8000
```

### 2. Frontend

```bash
cd frontend
npm install
```

Create or update `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

## Deployment

This repo is set up for a split deployment with `Vercel` for the frontend, `Supabase PostgreSQL` for the database, and either `Render` or `Railway` for the backend.

### 1. Backend on Render

The repo includes `render.yaml` at the project root. In Render, create a new `Blueprint` deploy from this GitHub repo or create a web service manually with:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT`

Set these environment variables in Render:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

Useful backend URLs after deploy:

- `/` returns a basic status payload
- `/health` returns `{ "status": "ok" }`

Notes:

- `alembic upgrade head` runs automatically on startup
- Do not use the local SQLite file in production
- `seed_data.py` is optional and should only be run if you want demo accounts in production

### 1B. Backend on Railway

Railway is also a strong fit for this backend because the app uses FastAPI plus WebSockets for the live attendance feed.

Create a Railway service from this GitHub repo and use these settings:

- Root directory: `/backend`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Pre-deploy command: `alembic upgrade head`
- Healthcheck path: `/health`

Set these environment variables in Railway:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

Then:

1. Generate a public Railway domain for the backend service
2. Copy that Railway backend URL
3. Use it as `VITE_API_BASE_URL` in the Vercel frontend project
4. Keep the Vercel URL in `CORS_ORIGINS`

Useful backend URLs after deploy:

- `/` returns a basic status payload
- `/health` returns `{ "status": "ok" }`

Notes:

- Railway injects the `PORT` variable automatically, and this app is ready for that start command
- `alembic upgrade head` is a good fit for Railway's pre-deploy step
- `seed_data.py` is optional and should only be used if you want demo data in production
- If you keep both Vercel preview and production deployments, add both frontend origins to `CORS_ORIGINS` as a comma-separated list
- The backend pins `bcrypt<5` in `backend/requirements.txt` to avoid production login issues with `passlib[bcrypt]`

### 2. Frontend on Vercel

Deploy the `frontend` folder as the Vercel project root.

Project settings:

- Framework preset: `Vite`
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Set this environment variable in Vercel:

```env
VITE_API_BASE_URL=https://your-backend-domain
```

The file `frontend/vercel.json` is included so React Router routes work correctly on refresh.

### 3. Final wiring

After the frontend is live:

1. Copy the Vercel production URL
2. Add it to the backend `CORS_ORIGINS` value in Render or Railway
3. Redeploy the backend if needed
4. Confirm login, session creation, scan flow, and live updates from the hosted frontend

### 4. Example production env files

Templates are included in `backend/.env.example` and `frontend/.env.example`.

Frontend default URL:

```text
http://127.0.0.1:5173
```

## Demo login credentials

After running `python seed_data.py`, these demo users are available:

- Admin: `admin@smartattend.com` / `Admin@123`
- Teacher: `teacher@smartattend.com` / `Teacher@123`
- HR: `hr@smartattend.com` / `Hr@123456`
- Student: `student@smartattend.com` / `Student@123`
- Employee: `employee@smartattend.com` / `Employee@123`

The seed script also creates additional demo users, sessions, departments, attendance history, and live sessions so the dashboards feel populated.

Important:

- These are demo login credentials for seeded data only
- Do not commit real production passwords, `DATABASE_URL`, or `SECRET_KEY` values into this repository

## Supabase setup

1. Create a new Supabase project.
2. Open `Connect`.
3. Copy the PostgreSQL `Session pooler` connection string.
4. Put that value into `backend/.env` as `DATABASE_URL`.
5. Run:

```bash
alembic upgrade head
python seed_data.py
```

## Author

Afrin Kousar

- GitHub: https://github.com/afrinkousar
- LinkedIn: https://www.linkedin.com/in/afrin-kousar/
