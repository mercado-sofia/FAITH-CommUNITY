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
```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=db_community
PORT=8080
NODE_ENV=development
```

### Running the Application
```bash
# Development mode with auto-reload
npm run dev

# Production mode
node app.js
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
- **Audit Logging**: Comprehensive activity logging
- **Login Attempt Tracking**: Brute force protection
- **Session Security**: Secure session management

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
- **Setup Guides**: Environment setup, SMTP configuration
- **Security**: Audit logging, database reorganization
- **File Management**: Cloudinary integration, profile photos

## 🤝 Contributing

1. Follow the existing code structure
2. Add appropriate error handling
3. Include security considerations
4. Update documentation
5. Test thoroughly

## 📄 License

This project is part of the FAITH CommUNITY platform.
