# FAITH CommUNITY Backend

This is the backend API server for the FAITH CommUNITY platform, built with Node.js and Express.

## 📁 Directory Structure

```
backend/
├── app.js                 # Main application entry point
├── package.json           # Dependencies and scripts
├── package-lock.json      # Locked dependency versions
├── docs/                  # Documentation
│   ├── 01-setup/         # Setup guides
│   ├── 02-security/      # Security documentation
│   └── 03-file-management/ # File management guides
├── scripts/              # Utility scripts
│   ├── utilities.js      # Consolidated utility functions
│   └── README.md         # Scripts documentation
└── src/                  # Source code
    ├── (public)/         # Public API routes and controllers
    ├── admin/            # Admin-specific routes and controllers
    ├── superadmin/       # Superadmin-specific routes and controllers
    ├── database.js       # Database configuration and initialization
    └── utils/            # Utility functions and helpers
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MySQL database
- Environment variables configured

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env` file in the backend root directory with the following variables:

#### Database Configuration
```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=db_community
```

#### SMTP Configuration (Required for Email Features)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
MAIL_FROM=FAITH CommUNITY <your-email@gmail.com>
```

#### Frontend URL (Required for Password Reset Links)
```env
FRONTEND_URL=http://localhost:3000
```

#### Cloudinary Configuration (Required for File Uploads)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### JWT Configuration (Required for Authentication)
```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_ISS=faith-community-api
JWT_AUD=faith-community-client
```

#### CSRF Configuration (Required for Security)
```env
CSRF_SECRET=your-csrf-secret-key-minimum-32-characters
```

#### Server Configuration
```env
PORT=8080
NODE_ENV=development
LOG_LEVEL=debug
```

#### Production Security Configuration
```env
# Enable HSTS in production (only when behind HTTPS)
ENABLE_HSTS=true

# CORS allowed origins (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate limiting configuration
RATE_LIMIT_GLOBAL_MAX=1000
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_PUBLIC_MAX=2000
SLOWDOWN_GLOBAL_AFTER=200
SLOWDOWN_AUTH_AFTER=5
```

#### Important Notes
- **SMTP Setup**: For Gmail, enable 2FA and generate an App Password
- **Cloudinary**: Sign up at [cloudinary.com](https://cloudinary.com) for file storage
- **Frontend URL**: Must match your frontend application URL
- **JWT Secret**: Use a strong, random secret (minimum 32 characters)
- **CSRF Secret**: Use a different strong secret for CSRF protection
- **Production**: Set `NODE_ENV=production` and `LOG_LEVEL=warn` for production

### Running the Application
```bash
# Development mode with auto-reload
npm run dev

# Production mode
node app.js
```

## 🚀 Production Deployment

### Environment Variables for Production
```env
# Database
MYSQL_HOST=your-production-db-host
MYSQL_USER=your-production-db-user
MYSQL_PASSWORD=your-production-db-password
MYSQL_DATABASE=db_community

# SMTP (Production Email Service)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-production-email@yourdomain.com
SMTP_PASS=your-production-app-password
MAIL_FROM=FAITH CommUNITY <noreply@yourdomain.com>

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Cloudinary (for images - automatic optimization)
CLOUDINARY_CLOUD_NAME=your-production-cloud-name
CLOUDINARY_API_KEY=your-production-api-key
CLOUDINARY_API_SECRET=your-production-api-secret

# AWS S3 (for Post Act Reports/documents)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-production-access-key-id
AWS_SECRET_ACCESS_KEY=your-production-secret-access-key
AWS_S3_BUCKET_NAME=faith-community-files

# Security (CRITICAL - Generate strong secrets)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-chars
JWT_ISS=faith-community-api
JWT_AUD=faith-community-client
CSRF_SECRET=your-super-secure-csrf-secret-minimum-32-chars

# Production Settings
NODE_ENV=production
PORT=8080
LOG_LEVEL=warn
ENABLE_HSTS=true
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting (Production Values)
RATE_LIMIT_GLOBAL_MAX=1000
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_PUBLIC_MAX=2000
SLOWDOWN_GLOBAL_AFTER=200
SLOWDOWN_AUTH_AFTER=5
```

### Production Setup Steps
1. **Set Environment Variables**: Configure all production environment variables
2. **Create Superadmin**: Run `node scripts/utilities.js create-superadmin`
3. **Health Check**: Run `node scripts/utilities.js production-health-check`
4. **Start Application**: Use `node app.js` or PM2 for process management

### Process Management (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start app.js --name "faith-community-api"

# Monitor application
pm2 monit

# View logs
pm2 logs faith-community-api
```

## 🗄️ Database

The application uses MySQL with automatic database initialization. The database schema is defined in `src/database.js` and includes:

- **Core Tables**: users, organizations, admins, programs_projects, news
- **Workflow Tables**: submissions, notifications, invitations
- **Feature Tables**: volunteers, messages, subscribers, collaborations
- **Content Tables**: advocacies, competencies, organization_heads
- **UI Tables**: branding, site_name, footer_content, hero_section
- **Security Tables**: superadmin, login_attempts, security_logs, audit_logs

### Utility Scripts
- `scripts/utilities.js` - Consolidated utility functions

## 🔧 Scripts

### Utility Scripts
```bash
# Show available commands
node scripts/utilities.js help

# Create superadmin account
node scripts/utilities.js create-superadmin

# Check all database data
node scripts/utilities.js check-data

# Fix missing tables and data
node scripts/utilities.js fix-missing-data

# Debug collaboration data
node scripts/utilities.js debug-collaborations
```

## 🔐 Authentication

The application supports three types of users:
- **Users**: Regular community members
- **Admins**: Organization administrators
- **Superadmin**: System administrators

### Default Superadmin Account
- **Email**: `superadmin@faith-community.com`
- **Password**: `admin123`
- **Login URL**: `http://localhost:3000/superadmin/login`

⚠️ **Important**: Change the superadmin password after first login!

## 📚 API Documentation

### Public Routes
- `/api/organizations` - Organization information
- `/api/news` - News and announcements
- `/api/users` - User registration and authentication
- `/api/subscription` - Newsletter subscription

### Admin Routes
- `/api/advocacies` - Organization advocacies
- `/api/competencies` - Organization competencies
- `/api/programs` - Program management
- `/api/volunteers` - Volunteer management
- `/api/collaborations` - Program collaborations

### Superadmin Routes
- `/api/approvals` - System approvals
- `/api/admins` - Admin management
- `/api/superadmin/branding` - Site branding
- `/api/superadmin/hero-section` - Hero section management

## 🛡️ Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **CORS Protection**: Configurable allowed origins
- **CSRF Protection**: Double-submit cookie pattern
- **Security Headers**: Helmet.js for security headers
- **Audit Logging**: Comprehensive activity logging with structured logging
- **Login Attempt Tracking**: Brute force protection (5 attempts = 5-minute lockout)
- **Session Security**: Secure session management with JWT tokens
- **Two-Factor Authentication (2FA)**: TOTP-based 2FA for superadmin accounts
- **Secure Email Change**: Multi-step verification with OTP codes
- **Password Security**: Bcrypt hashing with salt rounds
- **Email Verification**: OTP-based email verification system

### Security Best Practices

#### Environment Variables Security
- **Never commit** `.env` files to version control
- **Use strong secrets** (minimum 32 characters) for JWT and CSRF
- **Rotate secrets** regularly in production
- **Use different secrets** for different environments

#### Production Security Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure `ENABLE_HSTS=true` (only behind HTTPS)
- [ ] Set restrictive `ALLOWED_ORIGINS`
- [ ] Use strong, unique secrets for JWT and CSRF
- [ ] Enable audit logging
- [ ] Configure rate limiting appropriately
- [ ] Use HTTPS in production
- [ ] Regular security updates
- [ ] Monitor failed login attempts

## 📝 Logging

The application uses structured logging with Pino:
- **Development**: Pretty-printed colored output
- **Production**: JSON structured logs
- **Sensitive Data**: Automatically redacted

## 🔄 Development

### Code Structure
- **Controllers**: Handle business logic
- **Routes**: Define API endpoints
- **Middleware**: Authentication, validation, security
- **Utils**: Reusable utility functions

### Adding New Features
1. Create controller in appropriate directory
2. Define routes
3. Add middleware if needed
4. Update documentation

## 📖 Documentation

Detailed documentation is available in the `docs/` directory:

### Setup Guides (`docs/01-setup/`)
- **Environment Setup**: Complete environment variable configuration
- **SMTP Setup Guide**: Email configuration for password reset and notifications
- **Superadmin Setup**: Initial superadmin account creation

### Security Documentation (`docs/02-security/`)
- **Audit Logging Improvements**: Enhanced security logging system
- **Secure Email Change**: Multi-step email verification implementation
- **Superadmin Security Review**: Comprehensive security audit results
- **Program Submission Security**: Approval workflow security fixes
- **Collaboration Workflow**: Secure collaboration system implementation

### File Management (`docs/03-file-management/`)
- **Cloudinary Integration**: Cloud file storage setup and configuration
- **Profile Photo Upload**: User profile photo management system

## 🤝 Contributing

1. Follow the existing code structure
2. Add appropriate error handling
3. Include security considerations
4. Update documentation
5. Test thoroughly

## 📄 License

This project is part of the FAITH CommUNITY platform.
