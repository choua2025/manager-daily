# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Start with ts-node-dev (hot reload)

# Build & Production
npm run build         # prisma generate + tsc
npm start             # node dist/server.js

# Database
npm run prisma:migrate   # Create and apply a new migration (dev)
npm run migrate:deploy   # Apply migrations in production
npm run prisma:generate  # Regenerate Prisma Client after schema changes
npm run prisma:studio    # Open Prisma Studio GUI
npm run prisma:seed      # Seed the database
```

There are no tests in this project.

## Architecture

Express + TypeScript backend using a **module-based** structure. Each domain (accounts, transactions, budgets, etc.) is a self-contained folder under `src/modules/` containing `.routes.ts`, `.controller.ts`, and `.service.ts`.

### Request lifecycle

```
Request → auth.middleware (JWT verify) → router → controller → service → Prisma → DB
```

- **Routes** (`*.routes.ts`): wire middleware + controller functions, `router.use(authenticate)` at the top protects all routes in that module
- **Controllers** (`*.controller.ts`): extract and validate request data, call service, return response using helpers from `src/utils/response.ts`
- **Services** (`*.service.ts`): all business logic and Prisma queries live here

### Key patterns

**AuthRequest** — controllers that need the logged-in user use `AuthRequest` from `src/middlewares/auth.middleware.ts` instead of `Request`. It extends `Request` with `user?: JwtPayload` (userId, email, role) populated by the `authenticate` middleware.

**Response helpers** — always use `sendSuccess`, `sendError`, `sendCreated` from `src/utils/response.ts`. Never call `res.json()` directly.

**Error handling** — throw `AppError` from `src/middlewares/error.middleware.ts` for known errors (e.g. `throw new AppError('Not found', 404)`). The global `errorHandler` in `app.ts` catches it and also handles Prisma error codes (`P2002` → 409, `P2025` → 404).

**Environment** — all env vars are accessed via `src/config/env.ts`, never via `process.env` directly in feature code.

### Database

Prisma with PostgreSQL. Schema at `prisma/schema.prisma`. All models use UUID primary keys. After any schema change: run `npm run prisma:migrate` then `npm run prisma:generate`. The Prisma client singleton is at `src/config/prisma.ts`.

### File uploads

Multer handles multipart uploads (payment slip images). Files land in local `uploads/` then are immediately uploaded to Cloudinary via `src/config/cloudinary.ts` and the local file is deleted. The `upload` middleware from `src/middlewares/upload.middleware.ts` must be cast `as unknown as RequestHandler` when used in routes due to a type conflict between `@types/multer` and `@types/express`.

### Auth flow

- Register/Login → returns `accessToken` (15m) + `refreshToken` (7d)
- Access token verified in `authenticate` middleware via `verifyAccessToken` from `src/utils/jwt.ts`
- Refresh tokens stored in `RefreshToken` DB table and revoked on logout
- Password reset uses OTP sent via nodemailer (`src/utils/email.ts`)

## Deployment (Render)

- Build command: `npm install --include=dev && npm run build` — `--include=dev` is required because `NODE_ENV=production` skips devDependencies which includes TypeScript and all `@types/*`
- Start command: `npm run migrate:deploy && npm start`
- Config: `render.yaml` at project root
