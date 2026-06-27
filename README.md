# CivicPulse AI

An AI-powered civic crisis reporting and resolution platform that connects citizens with municipal governments. Built with Next.js, Firebase, and Google Gemini AI.

## What It Does

Citizens report local hazards (potholes, water leaks, fires, gas leaks, etc.) with photos and GPS coordinates. Google Gemini AI automatically categorizes, summarizes, prioritizes, detects duplicates, and routes reports to the correct municipal departments. Moderators and admins review, verify, merge, and resolve reports. Crisis alerts can be broadcast system-wide.

## Key Features

- **AI-Powered Report Analysis** — Gemini 2.5 Flash auto-categorizes reports, assigns severity, priority scores, and routes to the right department
- **Smart Duplicate Detection** — AI semantic comparison + proximity-based detection to merge duplicate reports
- **Interactive Crisis Map** — Full-screen Leaflet map with severity-colored pins and satellite imagery
- **Role-Based Access Control** — Citizen, Moderator, and Admin roles with granular permissions
- **Crisis Alert Broadcasting** — System-wide emergency alerts with severity levels and safety instructions
- **Community Validation** — Upvotes, confirmations, and comment threads on reports
- **Admin Console** — Verification queue, alert management, system metrics, and audit logs
- **Gamified Badges** — XP points and civic achievement badges to incentivize participation
- **Offline Mock Mode** — Full functionality without Firebase/Gemini using localStorage fallback

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, static export) |
| UI | React 19, Tailwind CSS v4, Lucide Icons |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Database | Firebase Firestore (with localStorage mock) |
| Auth | Firebase Auth (Email/Password, Google OAuth) |
| Maps | Leaflet + react-leaflet with Google satellite tiles |
| Deploy | Firebase Hosting, Docker |

## Getting Started

### Prerequisites

- Node.js 24+
- A Google Gemini API key (for AI features)
- A Firebase project (optional — runs in mock mode without it)

### Setup

```bash
npm install
```

Create `.env.local`:

```
GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Roles

| Role | How to Access |
|------|--------------|
| Admin | Email containing "admin" (e.g., `admin@civicpulse.gov`) |
| Moderator | Email containing "mod" (e.g., `mod@civicpulse.gov`) |
| Citizen | Any other email |

### Build & Deploy

```bash
npm run build          # Static export to /out
firebase deploy        # Deploy to Firebase Hosting
```

### Docker

```bash
docker build -t civicpulse-ai .
docker run -p 8080:8080 civicpulse-ai
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── dashboard/page.tsx    # Community issues dashboard
│   ├── map/page.tsx          # Full-screen crisis map
│   ├── alerts/page.tsx       # Emergency broadcast center
│   ├── admin/page.tsx        # Admin console
│   ├── auth/page.tsx         # Authentication
│   ├── profile/page.tsx      # User profile & badges
│   └── report/
│       ├── page.tsx          # Report detail view
│       └── new/page.tsx      # Report submission wizard
├── components/
│   ├── Navbar.tsx            # Navigation bar
│   ├── FullscreenMap.tsx     # Full-screen map
│   ├── MapSelector.tsx       # Location picker
│   └── MapViewer.tsx         # Embedded map
├── context/
│   └── AuthContext.tsx       # Auth state management
└── lib/
    ├── dbService.ts          # Database CRUD operations
    ├── firebase.ts           # Firebase client init
    ├── firebaseAdmin.ts      # Firebase admin init
    └── gemini.ts             # Gemini AI integration
```

## How It Works

1. **Citizen submits a report** — Title, description, photos, GPS location
2. **Gemini AI analyzes it** — Generates summary, category, severity, priority, department assignment, safety instructions
3. **Duplicate check** — AI compares against nearby reports to detect duplicates
4. **Admin/Moderator reviews** — Verifies, marks in-progress, resolves, rejects, or merges duplicates
5. **Crisis alerts** — Admins broadcast emergency alerts with safety instructions to all users
6. **Community engagement** — Citizens upvote, confirm, and comment on reports

## License

MIT
