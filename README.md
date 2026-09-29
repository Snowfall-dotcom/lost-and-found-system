# Lost & Found System - Backend

Node.js/Express + MongoDB (Mongoose) API for the NU Manila Lost & Found System. Implements every core feature (section 5) from the team's feature guide: item reporting, search/browse, claim verification, notifications, the admin system, profiles, and messaging.

## Setup

```bash
npm install
cp .env.example .env
# edit .env — set MONGO_URI to your local Mongo or an Atlas connection string
npm run seed   # optional: creates sample users, reports, and one pending claim
npm run dev    # starts on http://localhost:5000 (or PORT from .env)
```

Sample logins after seeding:
| Role | Email | Password |
|---|---|---|
| Admin | admin@nu.edu.ph | admin123 |
| Student | juan.delacruz@nu.edu.ph | password123 |
| Student | maria.santos@nu.edu.ph | password123 |

## Project structure

```
src/
  config/db.js            MongoDB connection
  models/                 Mongoose schemas (User, Report, Claim, Conversation, Message, Notification, AdminLog)
  middleware/             auth (JWT + admin guard), upload (multer), errorHandler
  controllers/            business logic, one file per resource
  routes/                 route definitions, one file per resource
  seed/seed.js            sample data for local dev
  uploads/                uploaded item photos (gitignored, kept via .gitkeep)
app.js                    Express app: middleware + route mounting
server.js                 entry point
```

Auth: JWT, sent as `Authorization: Bearer <token>`. Roles: `student`, `admin`.

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create a student account |
| POST | `/api/auth/login` | — | Log in, returns a JWT |
| GET | `/api/auth/me` | ✓ | Current user's profile |

### Users / Profiles (5.7, 5.8)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/:id` | — | Public profile + report history |
| PATCH | `/api/users/me` | ✓ | Update own profile |

### Reports (5.1, 5.2)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reports` | — | Browse/search/filter (`q`, `type`, `category`, `location`, `status`, `page`, `limit`) |
| POST | `/api/reports` | ✓ | Create a lost/found report (multipart, field `photos`, up to 5) |
| GET | `/api/reports/:id` | — | View a single report |
| PATCH | `/api/reports/:id` | ✓ (owner/admin) | Edit a report |
| DELETE | `/api/reports/:id` | ✓ (owner/admin) | Delete a report |

### Claims (5.3)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/claims` | ✓ | Submit a claim (`reportId`, `answers: [{question, answer}]`) |
| GET | `/api/claims/mine` | ✓ | Current user's claims |
| GET | `/api/claims/:id` | ✓ (claimant/finder/admin) | View a claim |
| PATCH | `/api/claims/:id/verify` | ✓ (finder/admin) | Approve/reject (`decision`, `reason`) |

### Messaging (5.7)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/conversations` | ✓ | Start a chat (`recipientId`, `text`, optional `reportId`) |
| GET | `/api/conversations` | ✓ | List current user's conversations |
| GET | `/api/conversations/:id/messages` | ✓ | Get a thread |
| POST | `/api/conversations/:id/messages` | ✓ | Reply in a thread |

### Notifications (5.4)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | ✓ | List + unread count |
| PATCH | `/api/notifications/:id/read` | ✓ | Mark one as read |
| PATCH | `/api/notifications/read-all` | ✓ | Mark all as read |

### Admin (5.5) — all routes require `role: admin`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | Overview stats + queues (5.5.1) |
| GET | `/api/admin/reports` | Moderation list (`status`, `category`) (5.5.3) |
| PATCH | `/api/admin/reports/:id` | `action`: publish / flag / remove / edit |
| GET | `/api/admin/claims` | Claim approval queue (5.5.2) |
| PATCH | `/api/admin/claims/:id` | `decision`: approved / rejected |
| GET | `/api/admin/users` | User list (`q`, `status`, `role`) (5.5.4) |
| PATCH | `/api/admin/users/:id` | `action`: suspend / activate / promote |
| GET | `/api/admin/logs` | Audit log (`from`, `to`) (5.5.5) |

## Notes for the team

- **Report status vs. moderation status** are tracked separately on `Report`: `moderationStatus` (`pending_review`/`published`/`flagged`/`removed`) is the admin-moderation lifecycle from 5.5.3; `status` (`open`/`pending_claim`/`resolved`/`closed`) is the item's claim workflow from 5.1. Browse/search only returns `published` reports.
- **Conversations** carry an optional `claimId` — null for an early profile-initiated "is this yours?" message, set once a formal claim exists on that thread, matching 5.7/5.8 in the guide.
- Approving a claim auto-rejects any other pending claims on the same report and bumps the finder's `returnedCount` (used for the "12 items returned" stat on the profile page).
- Photo uploads are stored locally under `src/uploads/` for development. Swap `middleware/upload.js` for a Cloudinary/S3 driver before deploying if local disk storage won't work for your host.
- Every admin action (approve/reject a claim, moderate a report, suspend/promote a user) writes an `AdminLog` entry automatically — no separate step needed to keep the audit log accurate.
