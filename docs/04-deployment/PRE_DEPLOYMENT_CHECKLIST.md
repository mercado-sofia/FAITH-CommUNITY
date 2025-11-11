# Pre-Deployment Checklist

Use this checklist before deploying to Railway or any production environment.

## ✅ Code & Configuration

### Files & Structure
- [x] All documentation organized in `docs/` directory
- [x] `env.example` file created with all required variables
- [x] `railway.json` configured for Railway deployment
- [x] `Procfile` created for process management
- [x] `package.json` has proper metadata and scripts
- [x] `.gitignore` properly configured (excludes `.env` files)

### Database Configuration
- [x] Database connection supports Railway MySQL
- [x] SSL/TLS configuration for production databases
- [x] Configurable port support (`MYSQL_PORT`)
- [x] Connection pooling configured
- [x] SSL automatically enabled in production mode

### Environment Variables
- [x] Environment variable validation implemented
- [x] Production validation fails fast if required vars missing
- [x] All required variables documented
- [x] Security secrets validation (JWT_SECRET, CSRF_SECRET)
- [x] Weak defaults detected and warned

### Application Configuration
- [x] PORT uses `process.env.PORT` (Railway compatible)
- [x] CORS configured for production
- [x] Rate limiting configured
- [x] Security headers configured (Helmet)
- [x] Error handling for production
- [x] Structured logging (Pino) configured

## 🔒 Security

### Secrets & Credentials
- [ ] `JWT_SECRET` is set and strong (32+ characters)
- [ ] `JWT_SECRET` is NOT the default value (`change-me-in-env`)
- [ ] `CSRF_SECRET` is set and strong (32+ characters)
- [ ] `CSRF_SECRET` is NOT the default value (`change-me`)
- [ ] All database credentials are secure
- [ ] All API keys and secrets are secure
- [ ] `.env` file is NOT committed to version control

### Production Settings
- [ ] `NODE_ENV=production` is set
- [ ] `LOG_LEVEL=warn` is set (reduces log verbosity)
- [ ] `ENABLE_HSTS=true` is set (only if using HTTPS)
- [ ] `ALLOWED_ORIGINS` only includes production frontend URLs
- [ ] CORS is configured with production frontend URL

### Security Features
- [x] Rate limiting implemented
- [x] CSRF protection implemented
- [x] Security headers via Helmet
- [x] Audit logging configured
- [x] Login attempt tracking
- [x] Session security
- [x] Password hashing (bcrypt)

## 📋 Environment Variables

### Required (Application won't start without these)
- [ ] `MYSQL_HOST` - Database host
- [ ] `MYSQL_PORT` - Database port (usually 3306)
- [ ] `MYSQL_USER` - Database user
- [ ] `MYSQL_PASSWORD` - Database password
- [ ] `MYSQL_DATABASE` - Database name
- [ ] `JWT_SECRET` - Strong secret (32+ characters)
- [ ] `CSRF_SECRET` - Strong secret (32+ characters)
- [ ] `FRONTEND_URL` - Frontend deployment URL
- [ ] `NODE_ENV` - Set to `production`

### Recommended (Features won't work without these)
- [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - For email features
- [ ] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - For file uploads
- [ ] `ALLOWED_ORIGINS` - CORS configuration
- [ ] `MYSQL_SSL=true` - For Railway MySQL
- [ ] `MYSQL_SSL_REJECT_UNAUTHORIZED=false` - For Railway MySQL

## 🚀 Railway-Specific

### Railway Configuration
- [x] `railway.json` created
- [x] `Procfile` created
- [x] Build configuration compatible
- [x] Start command configured

### Railway MySQL
- [ ] MySQL service added to Railway project
- [ ] Using Railway variable references (`${{MySQL.MYSQLHOST}}`, etc.)
- [ ] `MYSQL_SSL=true` is set
- [ ] `MYSQL_SSL_REJECT_UNAUTHORIZED=false` is set

### Railway Deployment
- [ ] Project created in Railway
- [ ] GitHub repository connected
- [ ] Backend directory set as root
- [ ] All environment variables set in Railway dashboard
- [ ] Deployment successful (check logs)

## 🧪 Testing

### Before Deployment
- [ ] Application starts successfully locally
- [ ] Database connection works
- [ ] Environment validation passes
- [ ] Health endpoint responds (`/api/health`)
- [ ] No console errors in logs

### After Deployment
- [ ] Health endpoint accessible: `https://your-backend.railway.app/api/health`
- [ ] Database connection successful (check logs)
- [ ] Environment variables validated (check logs)
- [ ] No errors in Railway logs
- [ ] Superadmin account can be created

## 📚 Documentation

### Documentation Updated
- [x] README.md updated with deployment section
- [x] Railway deployment guide created
- [x] Environment variable checklist created
- [x] Deployment readiness report created
- [x] All documentation organized in `docs/` directory

## 🔍 Final Verification

### Code Quality
- [x] No hardcoded secrets or passwords
- [x] No hardcoded URLs (uses environment variables)
- [x] Error handling implemented
- [x] Logging configured properly
- [x] Security best practices followed

### Production Readiness
- [x] Database migrations handled automatically
- [x] Graceful shutdown implemented
- [x] Error handling for production
- [x] Environment variable validation
- [x] Security configurations in place

## 📝 Post-Deployment

### After Successful Deployment
- [ ] Create superadmin account: `node scripts/utilities.js create-superadmin`
- [ ] Test API endpoints
- [ ] Verify email functionality (if SMTP configured)
- [ ] Verify file uploads (if Cloudinary configured)
- [ ] Monitor logs for errors
- [ ] Set up monitoring/alerts (if available)

## 🆘 Troubleshooting

If deployment fails:
1. Check Railway logs for errors
2. Verify all required environment variables are set
3. Check database connection (verify MySQL service is running)
4. Verify SSL configuration for Railway MySQL
5. Check environment variable validation logs
6. Review deployment documentation

## 📚 Resources

- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Railway Environment Checklist](./RAILWAY_ENV_CHECKLIST.md)
- [Deployment Readiness Report](./DEPLOYMENT_READINESS.md)
- [Backend README](../../README.md)

