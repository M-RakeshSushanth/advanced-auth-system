# Advanced Authentication and Authorization System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-brightgreen.svg)](https://mongoosejs.com/)
[![Security](https://img.shields.io/badge/Security-Hardened%20%26%20Tested-red.svg)](#security-hardening-and-vulnerability-protection)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-success.svg)](#12-testing-and-validation)

A secure, enterprise-ready authentication and authorization backend service architected as a **Modular Monolith with Layered Design**. Designed to serve as the unified identity, session management, and access-control backbone for modern web and mobile applications.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Module & Layer Organization](#module--layer-organization)
5. [Authentication Workflows & Sequence Diagrams](#authentication-workflows--sequence-diagrams)
6. [Security Hardening & Threat Mitigation](#security-hardening--threat-mitigation)
7. [Environment Configuration](#environment-configuration)
8. [Installation & Local Setup](#installation--local-setup)
9. [Automated Testing](#automated-testing)
10. [RESTful API Reference](#restful-api-reference)
11. [Postman Collection](#postman-collection)
12. [Production Deployment Guidelines](#production-deployment-guidelines)

---

## Architectural Overview

The system adopts a **Modular Monolithic Architecture** combined with a **Strict Layered Pattern** inside each domain module:

```
src/
├── app.ts                                 # Express application setup, security middleware, routing pipeline
├── server.ts                              # HTTP server bootstrap, MongoDB connection, graceful shutdown
├── config/
│   ├── env.config.ts                      # Zod-validated environment schema & type-safe config
│   ├── database.ts                        # Mongoose connection pooling & event listeners
│   └── logger.ts                          # Structured application logging
├── common/                                # Cross-cutting concerns & shared infrastructure
│   ├── constants/                         # Roles, permissions, HTTP status constants
│   ├── errors/                            # Centralized AppError hierarchy (400, 401, 403, 404, 409, 429, 500)
│   ├── middleware/                        # Authenticate, authorize (RBAC), validate (Zod), rateLimiter, errorHandler
│   ├── utils/                             # Crypto (AES-256-GCM, SHA-256), JWT signing, cookie management, ApiResponse
│   └── types/                             # TypeScript ambient declarations & JWT token interfaces
└── modules/                               # Independent Domain Modules
    ├── auth/                              # Registration, password login, token refresh rotation, email verify, reset
    ├── users/                             # User profiles, admin user management, role assignments
    ├── sessions/                          # Session lineage tracking, active device listing, revocation
    ├── twoFactor/                         # TOTP (RFC 6238), QR code setup, hashed single-use backup recovery codes
    ├── oauth/                             # Google OAuth 2.0 authorization code flow & mobile ID token login
    ├── email/                             # Nodemailer integration, Ethereal test account, responsive HTML templates
    └── authorization/                     # RBAC permissions matrix and policy evaluators
```

### Layered Separation of Concerns
Each module is decomposed into clean, decoupled layers:
- **Routes (`*.routes.ts`)**: Route definitions, rate limiting, and middleware chains.
- **Validations (`*.validation.ts`)**: Strict Zod schemas enforcing input boundaries.
- **Controllers (`*.controller.ts`)**: HTTP request handling, parameter extraction, and status code formatting.
- **Services (`*.service.ts`)**: Pure business logic, security policies, token operations, and domain orchestrations.
- **Repositories (`*.repository.ts`)**: Direct database access abstraction over Mongoose models.
- **Models (`*.model.ts`)**: Mongoose schemas, compound indexes, hooks, and instance methods.

---

## Key Features

- **Multi-Mechanism Authentication**:
  - Email & Password with bcrypt hashing (salt rounds: 12).
  - Google OAuth 2.0 (Authorization Code redirect flow & native mobile ID Token exchange).
  - Two-Factor Authentication (TOTP via Google Authenticator, Microsoft Authenticator, Authy, etc.).
- **Bulletproof JWT & Session Management**:
  - Dual-token architecture: Short-lived Access Tokens (15m) + Long-lived Refresh Tokens (7d).
  - Refresh Tokens stored exclusively in signed, `HttpOnly`, `SameSite`, `Secure` cookies.
  - **Refresh Token Rotation**: Every refresh generates a new access token and rotating refresh token.
  - **Refresh Token Reuse Detection**: Presentation of an already-used or revoked refresh token triggers immediate invalidation of the entire session lineage/family and dispatches a security notification.
- **Multi-Device Session Control**:
  - Live session registry with IP address, user agent, and device activity tracking.
  - Granular revocation: logout single device, logout all other devices, or terminate all sessions globally.
- **Role-Based Access Control (RBAC)**:
  - Built-in hierarchical roles: `USER`, `ADMIN`, `SUPER_ADMIN`.
  - Reusable role middleware (`requireRoles`) and granular permission evaluators (`requirePermissions`).
- **Account Verification & Recovery**:
  - Single-use, cryptographically secure email verification tokens (SHA-256 hashes stored with expiration).
  - Secure password reset workflow with session revocation upon password update.
  - Account lockout after 5 consecutive failed login attempts (15-minute lock window).
  - **Anti-Enumeration Protections**: Login, password reset, and verification resend endpoints never leak whether an email exists.
- **Two-Factor Authentication (2FA)**:
  - TOTP standard (RFC 6238) with QR code data URLs.
  - TOTP secrets stored using authenticated **AES-256-GCM encryption**.
  - 10 single-use, hashed backup recovery codes generated at setup time.
  - Two-stage login process: credentials return a short-lived `2fa_pending` token before complete session elevation.

---

## Technology Stack

| Layer / Concern | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js (>= 20.x LTS) | Scalable, event-driven runtime |
| **Language** | TypeScript 5.7+ | Strict type safety, clean OOP architecture |
| **Framework** | Express.js 4.21+ | Fast, minimalist HTTP web framework |
| **Database** | MongoDB & Mongoose 8.x | Document database, schemas, TTL indexes |
| **Authentication** | JWT (`jsonwebtoken`) | Stateless access tokens & secure session identifiers |
| **OAuth 2.0** | `google-auth-library` | Official Google OAuth token exchange & ID token verification |
| **Cryptography** | `bcryptjs` + Node `crypto` | Password hashing (cost 12), SHA-256, AES-256-GCM |
| **2FA / TOTP** | `otplib` & `qrcode` | RFC 6238 TOTP engine & QR code image generation |
| **Email Service** | `nodemailer` | Transactional email delivery with HTML templates & Ethereal test preview |
| **Validation** | `zod` | Declarative, runtime request validation |
| **Security** | `helmet`, `cors`, `express-rate-limit` | HTTP headers, CORS policies, brute-force throttling |
| **Testing** | `jest`, `supertest`, `mongodb-memory-server` | 100% automated integration & unit test suite |

---

## Authentication Workflows & Sequence Diagrams

### 1. Refresh Token Rotation & Reuse Detection

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant API as Auth Controller / Service
    participant DB as MongoDB Session Store

    Note over Client, DB: Step A: Legitimate Token Refresh
    Client->>API: POST /api/v1/auth/refresh-token (with HTTP-only Cookie: Refresh Token 1)
    API->>API: Verify Refresh Token 1 JWT signature
    API->>DB: Query Session by ID (select refreshTokenHash)
    API->>API: Compare SHA256(Refresh Token 1) === session.refreshTokenHash
    Note over API: Hashes match! Token is valid.
    API->>API: Generate Access Token 2 & Refresh Token 2
    API->>DB: Update Session: refreshTokenHash = SHA256(Refresh Token 2)
    API-->>Client: Set-Cookie: Refresh Token 2; Body: Access Token 2

    Note over Client, DB: Step B: Attack Scenario (Replay of Stolen Refresh Token 1)
    Client->>API: POST /api/v1/auth/refresh-token (with Replayed Refresh Token 1)
    API->>API: Verify Refresh Token 1 JWT signature
    API->>DB: Query Session by ID
    API->>API: Compare SHA256(Refresh Token 1) !== session.refreshTokenHash
    Note over API, DB: Token Reuse Detected! Potential Token Theft!
    API->>DB: Invalidate ALL sessions in tokenFamily (isValid = false)
    API->>API: Dispatch Security Alert Email to User
    API-->>Client: 401 Unauthorized (Security alert: Token reuse detected)
```

### 2. Two-Factor Authentication Login Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as Auth System
    participant DB as Database

    User->>API: POST /api/v1/auth/login { email, password }
    API->>DB: Validate user & verify bcrypt password
    API->>API: Check user.isTwoFactorEnabled
    Note over API: 2FA is enabled!
    API->>API: Issue short-lived tempToken (purpose: 2fa_verification, exp: 5m)
    API-->>User: 200 OK { requires2FA: true, tempToken: "..." }

    Note over User: User retrieves code from Authenticator App
    User->>API: POST /api/v1/auth/2fa/verify { tempToken, code: "123456" }
    API->>API: Verify tempToken signature & expiration
    API->>DB: Fetch user (decrypt AES-256-GCM secret)
    API->>API: Verify TOTP code or check/burn single-use backup code
    API->>DB: Establish Session in MongoDB
    API-->>User: 200 OK (Set-Cookie: refreshToken; Body: accessToken, user)
```

---

## Security Hardening & Threat Mitigation

| Vulnerability / Attack Vector | Mitigation Strategy Implemented |
|---|---|
| **Brute-Force & Credential Stuffing** | Strict route-level rate limiting (`express-rate-limit`) on login, registration, and recovery endpoints. Progressive account lockout after 5 consecutive failed attempts (15-minute lock window). |
| **Token Theft & Replay Attacks** | Refresh tokens stored in `HttpOnly`, `SameSite=Lax/Strict`, `Secure` cookies. Refresh token rotation on every call with token reuse detection invalidating entire token family lineages. |
| **User Enumeration** | Timing-consistent responses and uniform generic error messages for registration, login, password reset requests, and email verification resends. |
| **XSS (Cross-Site Scripting)** | Access tokens never stored in localStorage if used via backend-controlled cookies; Refresh tokens unreachable by JavaScript. `Helmet` sets strict HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options). |
| **CSRF (Cross-Site Request Forgery)** | `SameSite` cookie protections, strict CORS origin whitelisting, and authorization header requirement for API-driven actions. |
| **2FA Secret Compromise** | TOTP secrets are encrypted at rest in MongoDB using **AES-256-GCM** with unique initialization vectors (IV) and authentication tags. |
| **Backup Code Replay** | Backup recovery codes are hashed using SHA-256 before storage and are permanently deleted from the array upon first successful use (single-use semantics). |
| **Privilege Escalation** | Role management is strictly guarded: only `SUPER_ADMIN` can modify user roles, and self-demotion or self-elevation is blocked. |
| **Session Invalidation on Password Change** | Updating or resetting an account password immediately revokes all active sessions across all devices. |

---

## Environment Configuration

Create a `.env` file in the project root by copying the template:

```bash
cp .env.example .env
```

### Configuration Variables Reference

```env
# Application Environment
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
APP_NAME="Advanced Auth System"
CLIENT_URL=http://localhost:3000

# Database Connection
MONGODB_URI=mongodb://localhost:27017/advanced-auth-db

# JWT Secrets & Expirations (Must be at least 32 characters in production)
JWT_ACCESS_SECRET=your_super_secret_access_token_key_change_in_production_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_super_secret_refresh_token_key_change_in_production_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d
JWT_2FA_SECRET=your_super_secret_2fa_temp_token_key_change_in_production_min_32_chars
JWT_2FA_EXPIRES_IN=5m

# Cookie Settings
COOKIE_SECRET=your_cookie_signing_secret_min_32_chars
REFRESH_COOKIE_NAME=refreshToken

# Two-Factor Authentication (AES-256-GCM 32-byte key)
TOTP_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
TOTP_APP_NAME="AdvancedAuth"

# Nodemailer / Email Service
# 'ethereal' automatically creates a test inbox in development
EMAIL_SERVICE_MODE=ethereal
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Advanced Auth <no-reply@authsystem.local>"

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/oauth/google/callback

# Security & Rate Limiting Controls
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=10
PASSWORD_RESET_TOKEN_EXPIRES_MINUTES=15
EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS=24
```

---

## Installation & Local Setup

### Prerequisites
- Node.js version 20.x or higher
- npm version 10.x or higher
- MongoDB instance (local or MongoDB Atlas connection string)

### Steps

1. **Clone the repository & install dependencies**:
   ```bash
   git clone <repository-url>
   cd "advanced authentication and authorization"
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

3. **Build TypeScript source**:
   ```bash
   npm run build
   ```

4. **Start the development server with live reload**:
   ```bash
   npm run dev
   ```

5. **Start the compiled production server**:
   ```bash
   npm start
   ```

The server will initialize on `http://localhost:5000`. You can test health at `http://localhost:5000/health`.

---

## Automated Testing

The system comes with a comprehensive automated test suite powered by **Jest**, **Supertest**, and **`mongodb-memory-server`**. No external MongoDB instance or email credentials are required to run tests.

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Test Coverage Highlights
- **`tests/unit/crypto.spec.ts`**: Verifies SHA-256 token hashing, AES-256-GCM encryption/decryption, and single-use backup code format.
- **`tests/unit/jwt.spec.ts`**: Verifies token signing, verification, audience/issuer checks, and expired token rejection.
- **`tests/integration/auth.spec.ts`**: Complete tests for registration, login, lockout after 5 failures, refresh token rotation, **token reuse replay attack detection**, email verification, and password reset.
- **`tests/integration/rbac.spec.ts`**: Role checks: USER denied admin resources, ADMIN allowed user listings, SUPER_ADMIN permitted role modifications, immediate lockout of deactivated users.
- **`tests/integration/twoFactor.spec.ts`**: TOTP QR generation, setup verification, 2FA challenge login, backup code login, and single-use backup code consumption.
- **`tests/integration/sessions.spec.ts`**: Session registry, device listing, current session identification, and remote session revocation.

---

## RESTful API Reference

Base URL prefix: `/api/v1`

### 1. Authentication Endpoints (`/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user account | No |
| `POST` | `/auth/login` | Authenticate user credentials & issue tokens | No |
| `POST` | `/auth/2fa/verify` | Complete 2FA login challenge with TOTP/backup code | No (Temp Token) |
| `POST` | `/auth/refresh-token` | Rotate refresh token & issue new access token | Cookie / Body |
| `POST` | `/auth/logout` | Revoke current session & clear cookies | Bearer Token |
| `GET` | `/auth/verify-email?token=` | Activate user account via email verification link | No |
| `POST` | `/auth/resend-verification` | Request a new email verification link | No |
| `POST` | `/auth/forgot-password` | Request password reset link | No |
| `POST` | `/auth/reset-password` | Set new password and invalidate all active sessions | No |

### 2. Two-Factor Authentication Endpoints (`/2fa`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/2fa/setup` | Generate TOTP secret and QR code data URL | Bearer Token |
| `POST` | `/2fa/enable` | Verify initial code, enable 2FA, receive backup codes | Bearer Token |
| `POST` | `/2fa/disable` | Disable 2FA using password or valid TOTP code | Bearer Token |
| `POST` | `/2fa/regenerate-backup-codes` | Regenerate 10 new single-use backup codes | Bearer Token |

### 3. User & Profile Management (`/users`)

| Method | Endpoint | Description | Access Control |
|---|---|---|---|
| `GET` | `/users/me` | Fetch authenticated user's profile | Any User |
| `PUT` | `/users/me` | Update current user's profile information | Any User |
| `POST` | `/users/me/change-password`| Change password (revokes all other sessions) | Any User |
| `GET` | `/users` | Paginated listing of users with filters | `ADMIN`, `SUPER_ADMIN` |
| `GET` | `/users/:id` | Get specific user by identifier | `ADMIN`, `SUPER_ADMIN` |
| `PATCH` | `/users/:id/role` | Update user role (`USER`, `ADMIN`, `SUPER_ADMIN`) | `SUPER_ADMIN` Only |
| `PATCH` | `/users/:id/status` | Activate or deactivate account | `ADMIN`, `SUPER_ADMIN` |

### 4. Session Management (`/sessions`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/sessions` | List all active sessions for current user | Bearer Token |
| `DELETE`| `/sessions/others` | Revoke all sessions except the current one | Bearer Token |
| `DELETE`| `/sessions/all` | Revoke all active sessions (global logout) | Bearer Token |
| `DELETE`| `/sessions/:sessionId` | Revoke specific session by ID | Bearer Token |

### 5. Authorization & RBAC Inspection (`/authorization`)

| Method | Endpoint | Description | Access Control |
|---|---|---|---|
| `GET` | `/authorization/my-permissions` | Get permissions for current user's role | Any User |
| `GET` | `/authorization/roles-matrix` | View system-wide role-permission matrix | `ADMIN`, `SUPER_ADMIN` |
| `GET` | `/authorization/admin-only` | Access admin-protected resource | `ADMIN`, `SUPER_ADMIN` |
| `GET` | `/authorization/super-admin-only` | Access super-admin protected resource | `SUPER_ADMIN` Only |

### 6. Google OAuth 2.0 (`/oauth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/oauth/google` | Get Google consent URL | No |
| `GET` | `/oauth/google/callback` | Callback endpoint for Google OAuth authorization code | No |
| `POST` | `/oauth/google/token` | Exchange Google ID token directly (SPA/Mobile) | No |

---

## Postman Collection

A complete Postman collection is included in the root directory: [`postman_collection.json`](file:///d:/advanced%20authentication%20and%20authorization/postman_collection.json).

### How to Import and Use
1. Open Postman.
2. Click **Import** and select `postman_collection.json`.
3. The collection includes pre-configured environment variables (`baseUrl`, `accessToken`, `temp2FAToken`, `userId`, `sessionId`).
4. Logging in automatically extracts and stores the `accessToken` and `userId` into collection variables for subsequent authenticated calls.

---

## Production Deployment Guidelines

1. **Environment Secrets**: Generate strong, unique cryptographic keys (minimum 32 characters) for:
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `JWT_2FA_SECRET`
   - `COOKIE_SECRET`
   - `TOTP_ENCRYPTION_KEY` (64-character hex string recommended)
2. **HTTPS & Cookie Security**: In production (`NODE_ENV=production`), cookies automatically enforce `Secure=true` and `SameSite=Strict`. Ensure SSL/TLS termination at your reverse proxy (e.g. Nginx, Cloudflare, AWS ALB).
3. **Database Indexing**: The application includes auto-indexing and TTL indexes. Ensure production MongoDB user has index creation permissions on startup.
4. **Process Supervision**: Run the application under a production process manager such as `pm2` or in a containerized environment (Docker / Kubernetes):
   ```bash
   npm run build
   pm2 start dist/server.js --name "auth-backend" -i max
   ```

---

## License

ISC License.
