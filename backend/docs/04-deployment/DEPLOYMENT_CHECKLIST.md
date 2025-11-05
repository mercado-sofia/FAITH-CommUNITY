# 🚀 Deployment Checklist - FAITH CommUNITY

**Last Updated:** December 2024  
**Status:** ✅ SMTP & Cloudinary Configured

---

## ✅ **Already Completed**

- [x] **SMTP Configuration** - Email service set up in `/backend/.env`
- [x] **Cloudinary Configuration** - File storage set up in `/backend/.env`
- [x] **Code Review** - All issues fixed
- [x] **Security Review** - All security measures in place
- [x] **Error Handling** - Comprehensive error handling implemented
- [x] **Memory Leaks** - All fixed
- [x] **SSR Safety** - All components SSR-compatible

---

## ⏳ **Still Needed for Deployment**

### 🔴 **Critical (Required Before Deployment)**

#### 1. **Generate Security Secrets** (5 minutes)
```bash
# Generate JWT Secret (minimum 32 characters)
openssl rand -base64 32

# Generate CSRF Secret (different from JWT, minimum 32 characters)
openssl rand -base64 32
```

**Add to `/backend/.env`:**
```env
JWT_SECRET=<paste-generated-jwt-secret-here>
JWT_ISS=faith-community-api
JWT_AUD=faith-community-client
CSRF_SECRET=<paste-generated-csrf-secret-here>
```

#### 2. **Database Setup** (30-60 minutes)

**Option A: Local Development Database**
- MySQL running locally
- Already configured in `.env` (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD)

**Option B: Production Database (For Deployment)**
- Set up MySQL database on hosting platform:
  - **Railway** (recommended): Add MySQL service
  - **PlanetScale** (serverless): Free tier available
  - **Supabase** (PostgreSQL): Free tier available
  - **AWS RDS**: Pay-as-you-go
  - **DigitalOcean Managed Database**: $15/month

**Required in `/backend/.env`:**
```env
MYSQL_HOST=your-database-host
MYSQL_USER=your-database-user
MYSQL_PASSWORD=your-database-password
MYSQL_DATABASE=db_community
```

#### 3. **Frontend Environment Variables** (5 minutes)

**Create `/frontend/.env.local`:**
```env
# Backend API URL (will be your backend deployment URL)
NEXT_PUBLIC_API_URL=http://localhost:8080  # For local dev
# NEXT_PUBLIC_API_URL=https://your-backend.railway.app  # For production

# Backend URL for file uploads (same as API URL)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080  # For local dev
# NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app  # For production

# Cloudinary (use same values from backend .env)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name

# Production mode
NODE_ENV=production  # Set to 'production' when deploying
```

#### 4. **Backend Environment Variables** (Complete Setup)

**Verify `/backend/.env` has all required variables:**

```env
# ✅ Database (already configured or needs setup)
MYSQL_HOST=localhost  # or your production DB host
MYSQL_USER=root  # or your production DB user
MYSQL_PASSWORD=your_password  # or your production DB password
MYSQL_DATABASE=db_community

# ✅ SMTP (already configured)
SMTP_HOST=smtp.gmail.com  # or your SMTP provider
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=FAITH CommUNITY <your-email@gmail.com>

# ✅ Cloudinary (already configured)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ⚠️ Security Secrets (NEED TO GENERATE)
JWT_SECRET=<generate-this-32-chars-minimum>
JWT_ISS=faith-community-api
JWT_AUD=faith-community-client
CSRF_SECRET=<generate-this-32-chars-minimum>

# 🔄 Frontend URL (for password reset links, etc.)
FRONTEND_URL=http://localhost:3000  # For local dev
# FRONTEND_URL=https://your-frontend.vercel.app  # For production

# 🔄 App Base URL (alternative to FRONTEND_URL in some places)
APP_BASE_URL=http://localhost:3000  # For local dev
# APP_BASE_URL=https://your-frontend.vercel.app  # For production

# 🔄 CORS Allowed Origins (for production)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002  # For local dev
# ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-backend.railway.app  # For production

# ⚙️ Production Settings
NODE_ENV=development  # Change to 'production' when deploying
PORT=8080
LOG_LEVEL=debug  # Change to 'warn' for production
ENABLE_HSTS=true  # Only enable in production with HTTPS

# ⚙️ Rate Limiting (optional - defaults are fine)
RATE_LIMIT_GLOBAL_MAX=500
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_PUBLIC_MAX=1000
SLOWDOWN_GLOBAL_AFTER=200
SLOWDOWN_AUTH_AFTER=5

# 🗄️ AWS S3 (optional - only if using for file storage)
# AWS_REGION=ap-northeast-1
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret
# AWS_S3_BUCKET_NAME=faith-community-files
```

---

### 🟡 **For Production Deployment**

#### 5. **Choose Hosting Platforms** (15 minutes to set up)

**Recommended Setup:**
- **Frontend:** Vercel (free tier, easy setup)
- **Backend:** Railway (free tier, easy setup)
- **Database:** Railway MySQL (included) or separate service

**Alternative Options:**
- **Frontend:** Netlify, AWS Amplify, Render
- **Backend:** Render, Heroku, DigitalOcean, AWS
- **Database:** PlanetScale, Supabase, AWS RDS

#### 6. **Deploy Backend** (15-30 minutes)

**Steps:**
1. Push code to GitHub
2. Connect Railway/Render to GitHub repo
3. Set root directory to `backend`
4. Add all environment variables from `.env`
5. Deploy
6. Get backend URL (e.g., `https://your-app.railway.app`)

#### 7. **Deploy Frontend** (15-30 minutes)

**Steps:**
1. Push code to GitHub
2. Connect Vercel/Netlify to GitHub repo
3. Set root directory to `frontend`
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = your backend URL
   - `NEXT_PUBLIC_BACKEND_URL` = your backend URL
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` = from backend
5. Deploy
6. Get frontend URL (e.g., `https://your-app.vercel.app`)

#### 8. **Update CORS After Deployment** (5 minutes)

**Update `/backend/.env` on hosting platform:**
```env
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-backend.railway.app
FRONTEND_URL=https://your-frontend.vercel.app
APP_BASE_URL=https://your-frontend.vercel.app
```

#### 9. **Initialize Database** (5 minutes)

**After backend is deployed:**
1. Database will auto-initialize on first startup
2. Or use Railway console/SSH to run:
   ```bash
   cd backend
   node app.js  # Database will auto-initialize
   ```

#### 10. **Create Superadmin** (5 minutes)

**After database is initialized:**
```bash
# Via Railway console or SSH
cd backend
node scripts/utilities.js create-superadmin
```

**Or via API (if you have a superadmin route set up)**

---

## 📋 **Quick Deployment Checklist**

### **Before Deployment**
- [ ] Generate JWT_SECRET
- [ ] Generate CSRF_SECRET
- [ ] Add secrets to `/backend/.env`
- [ ] Set up production database
- [ ] Create `/frontend/.env.local` with backend URL
- [ ] Test locally with production-like settings

### **Deployment**
- [ ] Deploy backend to Railway/Render
- [ ] Add all environment variables to hosting platform
- [ ] Verify backend health check works
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Add frontend environment variables
- [ ] Update CORS with production URLs
- [ ] Initialize database
- [ ] Create superadmin account

### **Post-Deployment**
- [ ] Test login functionality
- [ ] Test email sending (password reset, etc.)
- [ ] Test file uploads (Cloudinary)
- [ ] Test all major features
- [ ] Verify HTTPS is working
- [ ] Check error logs

---

## 🎯 **Current Status**

### ✅ **Completed (50%)**
- [x] SMTP configuration
- [x] Cloudinary configuration
- [x] Code review and fixes
- [x] Security measures
- [x] Error handling

### ⏳ **Remaining (50%)**
- [ ] Generate security secrets
- [ ] Set up production database
- [ ] Configure frontend environment variables
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Initialize database
- [ ] Create superadmin

---

## 💡 **Quick Tips**

1. **Use Platform URLs** - No custom domain needed initially
   - Frontend: `https://your-app.vercel.app`
   - Backend: `https://your-app.railway.app`

2. **Test Locally First** - Use production-like `.env` values locally before deploying

3. **Keep Secrets Safe** - Never commit `.env` files to Git (already in `.gitignore`)

4. **Database Migration** - Database will auto-initialize on first deployment

5. **Environment Variables** - Set them in hosting platform's dashboard, not in code

---

**Estimated Time to Complete Remaining Tasks: 2-3 hours**

**You're about 50% done!** Just need to:
1. Generate secrets (5 min)
2. Set up database (30-60 min)
3. Configure frontend env (5 min)
4. Deploy both (30-60 min)
5. Initialize & test (15 min)

**Total: ~2 hours** 🚀

