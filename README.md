# NearBy 🏘️

> **Your City. Your Community. One Platform.**
> A full-stack hyperlocal services marketplace that connects customers with trusted local service providers — plumbers, electricians, tutors, salons, tiffin services and more.

**Tech stack:** Angular 17 · Node.js · Express · MongoDB · Socket.IO · JWT Auth · Cloudinary · Firebase · Deployed on Render

---

## 👋 For Reviewers / Recruiters

This is a production-grade, end-to-end web application I built solo, covering the full lifecycle: data modelling, REST API design, real-time messaging, authentication & authorization, an admin moderation system, SEO, E2E tests, and cloud deployment. Highlights worth a look:

| Area | Where to look |
|------|---------------|
| **REST API design** | [server/src/routes/](server/src/routes/) — auth, providers, leads, chats, categories, uploads, ads |
| **Data modelling** | [server/src/models/index.js](server/src/models/index.js) — Users, Providers, Leads, Chats, Categories with geospatial (`2dsphere`) indexes |
| **Real-time chat** | [server/src/socket/handler.js](server/src/socket/handler.js) + [dev/src/app/core/services/chat.service.ts](dev/src/app/core/services/chat.service.ts) (Socket.IO) |
| **Auth & route guards** | [dev/src/app/core/auth/](dev/src/app/core/auth/) — JWT access/refresh tokens, role-based guards (customer/provider/admin) |
| **Lazy-loaded Angular** | [dev/src/app/app.routes.ts](dev/src/app/app.routes.ts) — standalone components, `loadComponent` code-splitting |
| **Admin moderation** | [dev/src/app/features/admin/](dev/src/app/features/admin/) — provider approval, category management, complaints |
| **SEO & content** | [dev/src/app/services/seo.service.ts](dev/src/app/services/seo.service.ts), blog articles, sitemap, robots.txt |
| **E2E tests** | [tests/](tests/) — Playwright |

---

## ✨ Key Features

- 🔎 **Discover local providers** by category and district/area (geospatial matching)
- 💬 **Real-time chat** between customers and providers via Socket.IO
- 📩 **Lead generation** — customers request services; providers receive and respond to leads
- 👤 **Role-based experiences** — separate dashboards for customers, providers, and admins
- 🔐 **Secure auth** — bcrypt password hashing, JWT access + refresh tokens, role guards
- 🖼️ **Image uploads** to Cloudinary (provider profiles, galleries)
- 🛡️ **Admin panel** — approve providers, manage service categories, handle complaints
- 📱 **Mobile-ready** — Capacitor integration + AdMob, responsive Bootstrap 5 UI
- 🚀 **SEO-optimised** — clean routes, sitemap, blog content, meta management

---

## 🏗️ Architecture

```
NearBy/
├── dev/        # Angular 17 frontend (standalone components, lazy routes)
├── server/     # Node.js + Express REST API + Socket.IO
│   └── src/
│       ├── models/      # Mongoose schemas (User, Provider, Lead, Chat, Category)
│       ├── routes/      # REST endpoints
│       ├── socket/      # Real-time chat handler
│       ├── middleware/  # Auth, rate limiting, uploads
│       └── seeds/       # Environment-specific demo data
├── tests/      # Playwright E2E tests
├── docs/       # Setup & deployment guides
└── render.yaml # Cloud deployment config (Render)
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** 18+
- **MongoDB** running locally (or a MongoDB Atlas connection string)

### 1. Install dependencies (root + server + frontend)
```bash
npm run install:all
```

### 2. Configure environment
```bash
cd server
cp .env.example .env     # defaults work for local dev; set MONGO_URI / JWT secrets
cd ..
```

### 3. Seed demo data
```bash
npm run seed
```

### 4. Run both frontend and backend
```bash
npm run dev
```

- Frontend → **http://localhost:4200**
- API → **http://localhost:5000**

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@test.com` | `Test@1234` |
| Provider | `provider@test.com` | `Test@1234` |
| Admin | `admin@test.com` | `Admin@1234` |

> Seeded by `npm run seed`. Additional demo providers (`priya@`, `amma@`, `karthik@`, `sunita@`, `vikram@test.com`) are available with `Test@1234`.

---

## 🧪 Testing

```bash
npm run test:e2e        # Playwright end-to-end tests
cd server && npm test   # Jest + Supertest API tests
```

---

## 🚀 Deployment

Configured for **Render** via [render.yaml](render.yaml) with separate **staging** and **production** Angular SPA deployments. The SPA fallback is handled by Render's `routes` rewrite block (`/* → /index.html`). See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

---

## 📚 Documentation

- [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) — detailed local setup
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — cloud deployment
- [docs/ADMOB_SETUP.md](docs/ADMOB_SETUP.md) — mobile/AdMob configuration

---

## 🛠️ Tech Stack Detail

**Frontend:** Angular 17 (standalone components, lazy loading), RxJS, Bootstrap 5, Socket.IO client, Firebase, Capacitor (mobile)

**Backend:** Node.js, Express, MongoDB + Mongoose, Socket.IO, JWT (`jsonwebtoken`), bcrypt, Multer + Cloudinary, express-rate-limit, Firebase Admin

**Tooling:** Playwright (E2E), Jest + Supertest (API), Nodemon, concurrently
