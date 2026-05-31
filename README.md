# Manager Daily - Backend API

Daily Life Management System backend built with Node.js, TypeScript, Express, and PostgreSQL.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT (access + refresh tokens)
- **File Storage**: Cloudinary (payment slip images)
- **Deployment**: Render

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Cloudinary account (for file uploads)

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your values in .env

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

Server runs at `http://localhost:8000`

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (default: `7d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `PORT` | Server port (default: `8000`) |

## API Endpoints

All protected endpoints require header: `Authorization: Bearer <accessToken>`

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/refresh-token` | No | Refresh access token |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/auth/forgot-password` | No | Send OTP to email |
| POST | `/api/auth/verify-otp` | No | Verify OTP |
| POST | `/api/auth/reset-password` | No | Reset password |

### Accounts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/accounts` | List all accounts |
| POST | `/api/accounts` | Create account |
| GET | `/api/accounts/:id` | Get account |
| PUT | `/api/accounts/:id` | Update account |
| DELETE | `/api/accounts/:id` | Delete account |

**Account types:** `CASH`, `BANK`, `MOBILE_WALLET`, `CREDIT_CARD`, `SAVINGS`, `BUSINESS`

### Categories
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

**Category types:** `INCOME`, `EXPENSE`

### Transactions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transactions` | List transactions (supports filters) |
| POST | `/api/transactions` | Create transaction |
| GET | `/api/transactions/:id` | Get transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| POST | `/api/transactions/expense-with-slip` | Create expense + upload slip |
| POST | `/api/transactions/:id/slip` | Upload payment slip |
| DELETE | `/api/transactions/:id/slip` | Delete payment slip |

**Transaction types:** `INCOME`, `EXPENSE`, `TRANSFER`

**Query filters:** `type`, `categoryId`, `accountId`, `startDate`, `endDate`, `status`, `page`, `limit`

### Budgets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/budgets` | List budgets |
| GET | `/api/budgets/monthly` | Get current month budget |
| POST | `/api/budgets` | Create budget |
| PUT | `/api/budgets/:id` | Update budget |
| DELETE | `/api/budgets/:id` | Delete budget |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/monthly` | Monthly income/expense report |
| GET | `/api/reports/summary` | Financial summary |
| GET | `/api/reports/overspending` | Overspending analysis |
| GET | `/api/reports/recommendations` | Spending recommendations |

### Schedules
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/schedules` | List schedules |
| GET | `/api/schedules/upcoming` | Upcoming schedules |
| POST | `/api/schedules` | Create schedule |
| PUT | `/api/schedules/:id` | Update schedule |
| PATCH | `/api/schedules/:id/complete` | Mark as complete |
| DELETE | `/api/schedules/:id` | Delete schedule |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |

## Production

Deployed on Render at: `https://manager-daily-13.onrender.com`

```bash
# Build
npm run build

# Run migrations then start
npm run migrate:deploy && npm start
```
