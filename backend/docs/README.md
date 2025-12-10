# FAITH CommUNITY Backend Documentation

## 📚 Documentation Index

Welcome to the FAITH CommUNITY backend documentation. This guide covers setup, security, deployment, and maintenance of the backend API.

## 🚀 01-Setup
- [Setup Guide](./01-setup/SETUP_GUIDE.md) - Complete setup guide for development and production, including environment variables, superadmin setup, and configuration

## 🔒 02-Security
- [Security Guide](./02-security/SECURITY_GUIDE.md) - Comprehensive security documentation covering authentication, authorization, audit logging, and security best practices

## 📁 03-File Management
- [Cloudinary Integration Guide](./03-file-management/CLOUDINARY_INTEGRATION_GUIDE.md) - Image upload and storage setup (profiles, branding, news, programs)
- [AWS S3 Integration Guide](./03-file-management/AWS_S3_INTEGRATION_GUIDE.md) - Document storage setup (Post-Act Reports)
- [Profile Photo Upload](./03-file-management/PROFILE_PHOTO_UPLOAD.md) - Profile photo upload implementation

## 🚢 04-Deployment
- [Railway Deployment Guide](./04-deployment/RAILWAY_DEPLOYMENT.md) - Complete Railway deployment guide including setup, SendGrid configuration, troubleshooting, and crash recovery
- [Deployment Guide](./04-deployment/DEPLOYMENT_GUIDE.md) - General deployment guide for multiple platforms

## 🎯 Project Overview

**FAITH CommUNITY Backend** is a Node.js/Express.js REST API that powers the volunteer management platform. It provides authentication, data management, file uploads, and email services.

### Key Features
- **Multi-role Authentication**: Unified user system with role-based access (user, admin, superadmin) using JWT tokens
- **Secure Email System**: SMTP/SendGrid integration for transactional emails
- **File Management**: Cloudinary for images, AWS S3 for documents (Post-Act Reports)
- **Audit Logging**: Comprehensive security event logging
- **Rate Limiting**: Protection against abuse and DDoS
- **Database Management**: MySQL with automatic migrations

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **Authentication**: JWT with CSRF protection
- **File Storage**: Cloudinary, AWS S3 (optional)
- **Email**: SendGrid API, SMTP
- **Logging**: Pino (structured logging)
- **Deployment**: Railway (recommended)

## 🚀 Quick Start

### Development Setup

```bash
# Install dependencies
cd backend
npm install

# Create .env file (see Setup Guide)
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

See [Setup Guide](./01-setup/SETUP_GUIDE.md) for complete environment variable configuration.

**Required for Development:**
```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=db_community
JWT_SECRET=your-secret-32-chars-minimum
CSRF_SECRET=your-secret-32-chars-minimum
FRONTEND_URL=http://localhost:3000
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

The FAITH CommUNITY backend is currently deployed and working in production:
- ✅ Backend deployed on Railway
- ✅ Database configured and operational (MySQL)
- ✅ Email services configured (SendGrid)
- ✅ File uploads working (Cloudinary for images, AWS S3 for documents)
- ✅ Authentication system operational
- ✅ All API endpoints tested and working
- ✅ Security features implemented and active

### Recent Updates
- ✅ Security improvements (audit logging, email change)
- ✅ Performance optimizations
- ✅ Database initialization improvements
- ✅ Error handling enhancements
- ✅ Rate limiting implemented
- ✅ Comprehensive security review completed

## 🔒 Security

The backend implements multiple security layers:

- **Authentication**: JWT tokens with secure storage
- **Authorization**: Role-based access control (User, Admin, Superadmin)
- **Rate Limiting**: Protection against brute force and DDoS
- **Audit Logging**: Comprehensive security event tracking
- **Input Validation**: All inputs validated and sanitized
- **SQL Injection Protection**: Parameterized queries
- **CSRF Protection**: Token-based CSRF protection
- **Security Headers**: Helmet.js for security headers

See [Security Guide](./02-security/SECURITY_GUIDE.md) for detailed information.

## 🚢 Deployment

### Production Deployment

The backend is deployed on Railway. See [Railway Deployment Guide](./04-deployment/RAILWAY_DEPLOYMENT.md) for complete instructions.

**Quick Deployment Steps:**
1. Create Railway project
2. Add MySQL database service
3. Set root directory to `backend`
4. Configure environment variables
5. Deploy

### Environment Variables for Production

See [Railway Deployment Guide](./04-deployment/RAILWAY_DEPLOYMENT.md) for complete environment variable configuration.

## 📚 Additional Resources

- [Frontend Documentation](../frontend/docs/README.md) - Frontend setup and deployment
- [Setup Guide](./01-setup/SETUP_GUIDE.md) - Initial setup and configuration
- [Security Guide](./02-security/SECURITY_GUIDE.md) - Security best practices
- [Deployment Guide](./04-deployment/RAILWAY_DEPLOYMENT.md) - Production deployment

## 🆘 Troubleshooting

### Common Issues

- **Database Connection**: See [Setup Guide](./01-setup/SETUP_GUIDE.md#troubleshooting)
- **Deployment Issues**: See [Railway Deployment Guide](./04-deployment/RAILWAY_DEPLOYMENT.md#troubleshooting)
- **Backend Crashes**: See [Railway Deployment Guide](./04-deployment/RAILWAY_DEPLOYMENT.md#when-backend-crashes)
- **Email Issues**: See [Railway Deployment Guide](./04-deployment/RAILWAY_DEPLOYMENT.md#sendgrid-email-configuration)

---

*Last updated: December 2024*
*For technical support, refer to the specific documentation files or contact the development team.*

