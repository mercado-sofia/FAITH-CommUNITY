# Railway Environment Variables Checklist

Use this checklist to ensure all required environment variables are set before deploying to Railway.

## ✅ Required Environment Variables

### Database Configuration
- [ ] `MYSQL_HOST` - Database host (use `${{MySQL.MYSQLHOST}}` from Railway)
- [ ] `MYSQL_PORT` - Database port (use `${{MySQL.MYSQLPORT}}` from Railway, usually 3306)
- [ ] `MYSQL_USER` - Database user (use `${{MySQL.MYSQLUSER}}` from Railway)
- [ ] `MYSQL_PASSWORD` - Database password (use `${{MySQL.MYSQLPASSWORD}}` from Railway)
- [ ] `MYSQL_DATABASE` - Database name (use `${{MySQL.MYSQLDATABASE}}` from Railway)
- [ ] `MYSQL_SSL` - Set to `true` for Railway MySQL (SSL required)
- [ ] `MYSQL_SSL_REJECT_UNAUTHORIZED` - Set to `false` for Railway MySQL

### Security (CRITICAL)
- [ ] `JWT_SECRET` - Strong secret (minimum 32 characters) - **DO NOT use default**
- [ ] `JWT_ISS` - JWT issuer (default: `faith-community-api`)
- [ ] `JWT_AUD` - JWT audience (default: `faith-community-client`)
- [ ] `CSRF_SECRET` - Strong secret (minimum 32 characters) - **DO NOT use default**

### Frontend Configuration
- [ ] `FRONTEND_URL` - Your frontend deployment URL (e.g., `https://yourdomain.com`)

### Production Settings
- [ ] `NODE_ENV` - Set to `production`
- [ ] `PORT` - Railway sets this automatically (default: 8080)
- [ ] `LOG_LEVEL` - Set to `warn` for production
- [ ] `ENABLE_HSTS` - Set to `true` for production (HTTPS required)
- [ ] `ALLOWED_ORIGINS` - Comma-separated list of allowed frontend URLs

## ⚠️ Recommended Environment Variables

### SMTP Configuration (Required for Email Features)
- [ ] `SMTP_HOST` - SMTP server host (e.g., `smtp.gmail.com`)
- [ ] `SMTP_PORT` - SMTP port (usually `587` or `465`)
- [ ] `SMTP_USER` - SMTP username/email
- [ ] `SMTP_PASS` - SMTP password/app password
- [ ] `MAIL_FROM` - Email sender address (e.g., `FAITH CommUNITY <noreply@yourdomain.com>`)

### Cloudinary Configuration (Required for File Uploads)
- [ ] `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- [ ] `CLOUDINARY_API_KEY` - Your Cloudinary API key
- [ ] `CLOUDINARY_API_SECRET` - Your Cloudinary API secret

### AWS S3 Configuration (Optional - for Post Act Reports)
- [ ] `AWS_REGION` - AWS region (e.g., `ap-northeast-1`)
- [ ] `AWS_ACCESS_KEY_ID` - AWS access key ID
- [ ] `AWS_SECRET_ACCESS_KEY` - AWS secret access key
- [ ] `AWS_S3_BUCKET_NAME` - S3 bucket name

### Rate Limiting (Optional - Production Values)
- [ ] `RATE_LIMIT_GLOBAL_MAX` - Global rate limit (default: 500)
- [ ] `RATE_LIMIT_AUTH_MAX` - Auth endpoint rate limit (default: 10)
- [ ] `RATE_LIMIT_PUBLIC_MAX` - Public endpoint rate limit (default: 1000)
- [ ] `SLOWDOWN_GLOBAL_AFTER` - Global slowdown threshold (default: 200)
- [ ] `SLOWDOWN_AUTH_AFTER` - Auth slowdown threshold (default: 5)

## 🔒 Security Checklist

Before deploying, ensure:

- [ ] `JWT_SECRET` is **NOT** the default value (`change-me-in-env`)
- [ ] `JWT_SECRET` is at least 32 characters long
- [ ] `CSRF_SECRET` is **NOT** the default value (`change-me`)
- [ ] `CSRF_SECRET` is at least 32 characters long
- [ ] All database credentials are secure
- [ ] All API keys and secrets are secure
- [ ] `NODE_ENV=production` is set
- [ ] `ALLOWED_ORIGINS` only includes your production frontend URLs
- [ ] `ENABLE_HSTS=true` is set (only if using HTTPS)

## 📝 Quick Setup Commands

### Generate Strong Secrets

```bash
# Generate JWT_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate CSRF_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Verify Environment Variables

After setting all variables in Railway, the application will automatically validate them on startup. Check the logs for:

- ✅ `Environment variables validated successfully` - All good!
- ❌ `Missing required environment variables` - Fix missing variables
- ⚠️ `Environment variable warnings` - Review warnings

## 🚨 Common Issues

### Issue: "Missing required environment variables"
**Solution**: Ensure all required variables are set in Railway dashboard

### Issue: "JWT_SECRET is using the default weak value"
**Solution**: Generate a strong secret and set `JWT_SECRET` in Railway

### Issue: "Database connection failed"
**Solution**: 
- Verify MySQL service is running in Railway
- Check `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD` are correct
- Ensure `MYSQL_SSL=true` is set

### Issue: "SSL connection required"
**Solution**: Set `MYSQL_SSL=true` in environment variables

## 📚 Additional Resources

- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Deployment Readiness Report](./DEPLOYMENT_READINESS.md)
- [Backend README](../../README.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

