# FAITH CommUNITY Frontend Documentation

## 📚 Documentation Index

Welcome to the FAITH CommUNITY frontend documentation. This comprehensive guide covers all aspects of the volunteer management platform that connects volunteers with organizations for meaningful community service.

## 🏗️ 01-Architecture
- [Centralized Page Loader System](./01-architecture/CENTRALIZED_PAGE_LOADER_SYSTEM.md) - Unified loading system for public pages
- [Virtualization Guide](./01-architecture/VIRTUALIZATION_GUIDE.md) - Performance optimization for large datasets

## 🎨 02-Frontend
- [CSS Optimization Guide](./02-frontend/CSS_OPTIMIZATION_GUIDE.md) - Performance and styling best practices
- [Performance Optimization Guide](./02-frontend/PERFORMANCE_OPTIMIZATION_GUIDE.md) - Frontend performance improvements
- [Profile Page Documentation](./02-frontend/profile-page/) - Complete profile management system

## 🔐 03-Security
- [Email Change Analysis](./03-security/EMAIL_CHANGE_ANALYSIS.md) - Secure email change implementation
- [Admin Invitation Fixes](./03-security/ADMIN_INVITATION_FIXES.md) - Admin invitation system security

## 📧 04-Features
- [Newsletter Implementation](./04-features/NEWSLETTER_IMPLEMENTATION_GUIDE.md) - Newsletter subscription system

## 🧪 05-Testing
- [Form Persistence Tests](./05-testing/FORM_PERSISTENCE_TEST.md) - Volunteer application form testing
- [Program Preview Tests](./05-testing/PROGRAM_PREVIEW_PERSISTENCE_TEST.md) - Program selection testing
- [Admin Invitation Tests](./05-testing/test_invitation_flow.md) - Admin invitation flow testing
- [Password Reset Tests](./05-testing/test_reset_password.md) - Password reset functionality testing

## 🛠️ 06-Development
- [Logging System](./06-development/LOGGING_README.md) - Production-ready logging implementation

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
See individual documentation files for specific environment variable requirements.

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