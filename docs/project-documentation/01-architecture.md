# Architecture

## Overview
FAITH CommUNITY is a full-stack volunteer management platform built with a modern, scalable architecture that separates concerns between frontend, backend, and database layers.

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.4 (React 19.0.0)
- **State Management**: Redux Toolkit (RTK Query) for server state, React Context for client state
- **Data Fetching**: SWR for real-time data synchronization
- **Styling**: CSS Modules with custom styling
- **3D Graphics**: Three.js with React Three Fiber for interactive 3D elements
- **Deployment**: Vercel (serverless)

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.1.0
- **Database**: MySQL 8.0+ with connection pooling
- **Authentication**: JWT (JSON Web Tokens) with refresh token rotation
- **File Storage**: Cloudinary (primary), AWS S3 (optional)
- **Email**: SendGrid API or SMTP (Nodemailer)
- **Security**: Helmet.js, CORS, CSRF protection, rate limiting
- **Logging**: Pino (structured logging)
- **Deployment**: Railway (containerized)

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Public Pages │  │ Admin Portal │  │Superadmin    │     │
│  │ (Next.js)    │  │ (Next.js)    │  │ Portal       │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│  ┌──────┴─────────────────┴──────────────────┴──────┐     │
│  │         Redux Toolkit (RTK Query) + SWR           │     │
│  │         API Client with Token Refresh             │     │
│  └──────────────────────┬───────────────────────────┘     │
└──────────────────────────┼─────────────────────────────────┘
                            │ HTTPS/REST API
┌───────────────────────────┼─────────────────────────────────┐
│                    Backend Layer (Express.js)               │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Middleware Stack                                   │   │
│  │  - Helmet (Security Headers)                        │   │
│  │  - CORS (Cross-Origin Resource Sharing)             │   │
│  │  - Rate Limiting                                    │   │
│  │  - CSRF Protection                                  │   │
│  │  - Request Parsing (JSON, URL-encoded)            │   │
│  └────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Public Routes │  │ Admin Routes │  │Superadmin    │     │
│  │ Controllers   │  │ Controllers   │  │ Controllers  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│  ┌──────┴─────────────────┴──────────────────┴──────┐     │
│  │         Utility Layer                              │     │
│  │  - JWT Management                                  │     │
│  │  - Session Security                                │     │
│  │  - Login Attempt Tracking                          │     │
│  │  - Email Services                                 │     │
│  │  - File Upload (Cloudinary/S3)                   │     │
│  │  - Audit Logging                                  │     │
│  └──────────────────────┬───────────────────────────┘     │
└──────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                    Database Layer (MySQL)                   │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Core Tables                                         │   │
│  │  - users (unified: user, admin, superadmin roles)   │   │
│  │  - user_profiles (public user profile data)         │   │
│  │  - organizations, programs_projects                 │   │
│  │  - submissions, admin_notifications                 │   │
│  │  - volunteers, messages, subscribers               │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Security Tables                                     │   │
│  │  - refresh_tokens, login_attempts                   │   │
│  │  - admin_sessions, security_logs                    │   │
│  │  - password_reset_tokens, email_change_otps         │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

### Backend Structure
```
backend/
├── app.js                    # Main application entry point
├── src/
│   ├── (public)/             # Public API routes & controllers
│   │   ├── controllers/      # User, organization, application controllers
│   │   └── routes/           # Public API routes
│   ├── admin/                # Admin-specific functionality
│   │   ├── controllers/      # Admin business logic
│   │   ├── routes/           # Admin API routes
│   │   └── middleware/       # Admin authentication middleware
│   ├── superadmin/           # Superadmin-specific functionality
│   │   ├── controllers/      # Superadmin business logic
│   │   ├── routes/           # Superadmin API routes
│   │   └── middleware/       # Superadmin authentication middleware
│   ├── database.js           # Database connection & initialization
│   └── utils/                # Shared utilities
│       ├── jwt.js            # JWT token management
│       ├── sessionSecurity.js # Session security
│       ├── loginAttemptTracker.js # Login attempt tracking
│       ├── mailer.js          # Email service
│       ├── audit.js           # Audit logging
│       └── ...
└── docs/                      # Backend documentation
```

### Frontend Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (public)/          # Public-facing pages
│   │   ├── admin/             # Admin portal pages
│   │   └── superadmin/       # Superadmin portal pages
│   ├── components/            # Reusable React components
│   ├── rtk/                   # Redux Toolkit API slices
│   ├── utils/                  # Utility functions
│   │   ├── apiClient.js       # API client with token refresh
│   │   └── tokenRefresh.js    # Token refresh logic
│   ├── config/                 # Configuration files
│   └── middleware.js          # Next.js middleware (route protection)
└── docs/                       # Frontend documentation
```

## Key Architectural Patterns

1. **Layered Architecture**: Clear separation between presentation, business logic, and data layers
2. **RESTful API Design**: Standard HTTP methods and status codes
3. **Token-Based Authentication**: Stateless JWT authentication with refresh token rotation
4. **Role-Based Access Control (RBAC)**: Three distinct roles (user, admin, superadmin)
5. **Modular Routing**: Route organization by user type and functionality
6. **Connection Pooling**: Efficient database connection management
7. **Middleware Pipeline**: Request processing through security and validation layers

---

**Back to [Main Documentation](../PROJECT_DOCUMENTATION.md)**