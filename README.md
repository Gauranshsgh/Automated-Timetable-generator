# Automated Timetable Generator

> **Matrix-Based Constraint Validation Engine** — Generate conflict-free academic timetables with a MERN stack application featuring drag-and-drop editing, slot locking, and PDF/PNG export.

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Setup   │  │Generation│  │Timetable │  │  Export   │   │
│  │  Wizard  │→ │ Progress │→ │Grid View │→ │ PNG/PDF  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       │              ↑ SSE         │ DnD/Edit               │
│       ↓              │             ↓                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            React Query + Zustand State              │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API + SSE
┌──────────────────────────┴──────────────────────────────────┐
│                    EXPRESS.JS BACKEND                        │
│  ┌──────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Auth   │  │   CRUD Routes    │  │  Timetable API   │  │
│  │  (JWT)   │  │ (Institution,    │  │  (Generate, Edit, │  │
│  │          │  │  Faculty, Room,  │  │   Lock, Export)   │  │
│  │          │  │  Subject, etc.)  │  │                   │  │
│  └──────────┘  └──────────────────┘  └────────┬──────────┘  │
│                                                │             │
│  ┌─────────────────────────────────────────────┴──────────┐ │
│  │              MATRIX VALIDATION ENGINE                   │ │
│  │  ┌──────────────┐  ┌─────────────────┐  ┌──────────┐  │ │
│  │  │ Availability │  │   Constraint    │  │  Score   │  │ │
│  │  │   Matrix     │  │   Validator     │  │Calculator│  │ │
│  │  │  (3D O(1))   │  │  (Data-Driven)  │  │          │  │ │
│  │  └──────────────┘  └─────────────────┘  └──────────┘  │ │
│  │                                                        │ │
│  │  ┌────────────────────────────────────────────────────┐│ │
│  │  │         CSP Backtracking Solver (MRV)              ││ │
│  │  │  Fixed slots → MRV ordering → Backtrack → Score    ││ │
│  │  └────────────────────────────────────────────────────┘│ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ Mongoose ODM
┌──────────────────────────┴──────────────────────────────────┐
│                      MONGODB                                │
│  Collections: Institution, Faculty, Subject, Section,       │
│  Room, Constraint, TimetableSlot, TimetableVersion, User    │
│  Compound Indexes: faculty+day+band, room+day+band,         │
│                    section+day+band (unique)                 │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- MongoDB (local or Atlas)

### Local Development

```bash
# 1. Clone and install
git clone <repo-url>
cd timetable-generator
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI

# 3. Build shared types
npm run build --workspace=types

# 4. Seed database (optional — creates reference data)
npm run seed

# 5. Start dev servers (backend + frontend)
npm run dev
```

### Docker (Self-Hosted)

```bash
docker-compose up --build
```

Frontend: http://localhost:5173 | Backend: http://localhost:5000

### Default Credentials
- **Email**: admin@timetable.edu
- **Password**: admin123

## 📁 Project Structure

```
timetable-generator/
├── client/                  # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── features/        # Pages (auth, wizard, generation, timetable)
│   │   ├── components/      # Shared UI components
│   │   ├── lib/             # API client, utilities
│   │   └── stores/          # Zustand state management
├── server/                  # Express.js + TypeScript
│   ├── src/
│   │   ├── models/          # Mongoose schemas (8 collections)
│   │   ├── routes/          # 30+ REST API endpoints
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── services/engine/ # Matrix validation + CSP solver
│   │   └── scripts/         # Seed + benchmark
├── types/                   # Shared TypeScript interfaces
├── docker-compose.yml       # Self-hosted deployment
├── Dockerfile               # Backend container
└── .github/workflows/       # CI pipeline
```

## 🧠 Matrix Validation Engine

The core of the system uses a **3D Availability Matrix** for O(1) conflict detection:

- **Dimensions**: `[day][timeBand][resource]` where resources are Faculty, Room, and Section
- **Algorithm**: Constraint-Satisfaction Problem (CSP) with backtracking
- **Heuristic**: MRV (Minimum Remaining Values) — most constrained slots placed first
- **Output**: 50+ distinct valid variations, scored by load balance, gap minimization, and faculty distribution
- **Constraints**: Faculty unavailability, room capacity, max daily load, fixed slots, preferred time bands

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, TailwindCSS v4, Zustand, React Query |
| Backend | Node.js 22, Express 5, TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT with role-based access |
| Export | html2canvas + jsPDF (client), Puppeteer (Docker) |
| Testing | Vitest |
| CI/CD | GitHub Actions |
| Deploy | Vercel (frontend), Render (backend), Docker (self-hosted) |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run engine tests only (with verbose output)
npm run test:engine --workspace=server

# Run benchmarks
npm run benchmark
```

## 📊 Benchmarks

See [BENCHMARKS.md](./BENCHMARKS.md) for query performance metrics with and without compound indexes.

## 📜 License

MIT
