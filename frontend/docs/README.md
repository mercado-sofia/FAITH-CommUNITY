# FAITH CommUNITY Frontend Documentation

## 📚 Documentation Index

Welcome to the FAITH CommUNITY frontend documentation. This comprehensive guide covers all aspects of the volunteer management platform that connects volunteers with organizations for meaningful community service.

## 🏗️ 01-Architecture
- [Centralized Page Loader System](./01-architecture/CENTRALIZED_PAGE_LOADER_SYSTEM.md) - Unified loading system for public pages
- [Virtualization Guide](./01-architecture/VIRTUALIZATION_GUIDE.md) - Performance optimization for large datasets

## 🎨 02-Frontend
- [Performance Optimization Guide](./02-frontend/PERFORMANCE_OPTIMIZATION_GUIDE.md) - Comprehensive frontend performance optimizations including CSS, rendering, and user experience

## 🔐 03-Security
- [Email Change Analysis](./03-security/EMAIL_CHANGE_ANALYSIS.md) - Secure email change implementation

## 📧 04-Features
- [Collaboration Workflow Implementation](./04-features/COLLABORATION_WORKFLOW_IMPLEMENTATION_SUMMARY.md) - Collaborative program approval workflow
- [Dynamic Logo Implementation](./04-features/DYNAMIC_LOGO_IMPLEMENTATION.md) - Dynamic branding system
- [Newsletter Implementation](./04-features/NEWSLETTER_IMPLEMENTATION_GUIDE.md) - Newsletter subscription system

## 🛠️ 05-Development
- [Logging System](./05-development/LOGGING_README.md) - Production-ready logging implementation
- [Session Persistence Implementation](./05-development/SESSION_PERSISTENCE_IMPLEMENTATION.md) - Session management and security
- [Vercel Deployment](./05-development/VERCEL_DEPLOYMENT.md) - Frontend deployment guide
- [Error Handling Guide](./05-development/ERROR_HANDLING_GUIDE.md) - Comprehensive error handling flow and implementation guide

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
- **Deployment**: Vercel (Frontend), Railway (Backend)

## 🚀 Quick Start

### Development Setup
```bash
# Frontend
cd frontend
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

## 📖 Documentation Standards

When adding new documentation:
1. Place files in the appropriate numbered category folder
2. Use descriptive, clear titles
3. Include code examples where applicable
4. Update this README index when adding new files
5. Follow the existing markdown formatting standards

## 🔄 Current Status

**✅ System Status: Deployed and Operational**

The FAITH CommUNITY platform is currently deployed and working in production:
- ✅ Frontend deployed on Vercel
- ✅ Backend deployed on Railway
- ✅ Database configured and operational
- ✅ Email services configured
- ✅ File uploads working
- ✅ All core features implemented and tested

### Recent Updates
- ✅ Centralized page loader system implemented
- ✅ Profile page photo upload system fixed
- ✅ Email change security implementation completed
- ✅ Newsletter subscription system deployed
- ✅ Admin invitation system enhanced
- ✅ Performance optimizations applied
- ✅ Collaboration workflow implemented
- ✅ Dynamic logo system implemented

## 📚 Additional Resources

- [Backend Documentation](../backend/docs/README.md) - Backend setup and deployment
- [Deployment Guide](./05-development/VERCEL_DEPLOYMENT.md) - Frontend deployment instructions
- [Performance Guide](./02-frontend/PERFORMANCE_OPTIMIZATION_GUIDE.md) - Performance optimization strategies

---

*Last updated: December 2024*
*For technical support, refer to the specific documentation files or contact the development team.*
