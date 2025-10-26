# FAITH CommUNITY Frontend Documentation

## 📚 Documentation Index

Welcome to the FAITH CommUNITY frontend documentation. This comprehensive guide covers all aspects of the volunteer management platform that connects volunteers with organizations for meaningful community service.

## 🏗️ 01-Architecture
- [Centralized Page Loader System](./01-architecture/CENTRALIZED_PAGE_LOADER_SYSTEM.md) - Unified loading system for public pages
- [Virtualization Guide](./01-architecture/VIRTUALIZATION_GUIDE.md) - Performance optimization for large datasets

## 🎨 02-Frontend
- [CSS Optimization Guide](./02-frontend/CSS_OPTIMIZATION_GUIDE.md) - Performance and styling best practices
- [Performance Optimization Guide](./02-frontend/PERFORMANCE_OPTIMIZATION_GUIDE.md) - Frontend performance improvements

## 🔐 03-Security
- [Email Change Analysis](./03-security/EMAIL_CHANGE_ANALYSIS.md) - Secure email change implementation

## 📧 04-Features
- [Newsletter Implementation](./04-features/NEWSLETTER_IMPLEMENTATION_GUIDE.md) - Newsletter subscription system

## 🛠️ 05-Development
- [Logging System](./05-development/LOGGING_README.md) - Production-ready logging implementation

## 🎯 Project Overview

**FAITH CommUNITY** is a comprehensive volunteer management platform that serves as a bridge between volunteers and organizations. The platform facilitates community service programs, volunteer applications, and organizational management within the FAITH Colleges community.

### Key Features
- **Public Portal**: Volunteer registration, program browsing, and application system
- **Admin Portal**: Organization management, program creation, and volunteer coordination
- **Superadmin Portal**: System administration and user management
- **Newsletter System**: Automated communication with subscribers
- **Secure Authentication**: Multi-level authentication with email verification
- **File Management**: Cloudinary integration for scalable file storage

### Technology Stack
- **Frontend**: Next.js 14, React, Redux Toolkit, SWR
- **Backend**: Node.js, Express.js, MySQL
- **Authentication**: JWT with 2FA support
- **File Storage**: Cloudinary integration
- **Email**: SMTP with professional templates

## 🚀 Quick Start

### Development Setup
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
npm install
npm run dev
```

### Environment Variables

#### Required Environment Variables
Create a `.env.local` file in the frontend root directory with the following variables:

```env
# Backend API URL (Required)
NEXT_PUBLIC_API_URL=http://localhost:8080

# Backend URL for file uploads (Required)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

# Cloudinary Configuration (Required for image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

#### Production Environment Variables
For production deployment, update the URLs to your production backend:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-production-cloud-name
```

#### Environment Template
Use `env.example` as a template for your environment configuration.

## 📖 Documentation Standards

When adding new documentation:
1. Place files in the appropriate numbered category folder
2. Use descriptive, clear titles
3. Include code examples where applicable
4. Update this README index when adding new files
5. Follow the existing markdown formatting standards

## 🔄 Recent Updates

- ✅ Centralized page loader system implemented
- ✅ Profile page photo upload system fixed
- ✅ Email change security implementation completed
- ✅ Newsletter subscription system deployed
- ✅ Admin invitation system enhanced
- ✅ Performance optimizations applied

---

*Last updated: December 2024*
*For technical support, refer to the specific documentation files or contact the development team.*