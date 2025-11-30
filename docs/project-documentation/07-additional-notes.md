# Additional Notes

## Environment Variables

### Backend Required Variables
- `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `MYSQL_PORT` (optional, defaults to 3306)
- `MYSQL_SSL` (optional, set to 'true' for Railway MySQL)
- `JWT_SECRET` (32+ character random string)
- `JWT_ISS`, `JWT_AUD` (JWT issuer and audience)
- `CSRF_SECRET` (32+ character random string)
- `FRONTEND_URL` (for CORS and email links)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (or `SENDGRID_API_KEY` for SendGrid API)
- `USE_SENDGRID_API` (set to 'true' to use SendGrid API instead of SMTP)
- `MAIL_FROM` (email sender address)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME` (for Post Act Reports)
- `PORT` (optional, defaults to 8080)
- `NODE_ENV` (development or production)
- `LOG_LEVEL` (debug, info, warn, error)
- `ENABLE_HSTS` (optional, set to 'true' for HTTPS in production)
- `ALLOWED_ORIGINS` (comma-separated list of allowed CORS origins)
- `RATE_LIMIT_GLOBAL_MAX`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_PUBLIC_MAX` (rate limiting)
- `SLOWDOWN_GLOBAL_AFTER`, `SLOWDOWN_AUTH_AFTER` (slowdown thresholds)
- `TRUST_PROXY` (optional, set to 'true' or 'false' for reverse proxy)
- `TRUST_PROXY_COUNT` (optional, number of proxies to trust)

### Frontend Required Variables
- `NEXT_PUBLIC_API_URL` (backend API URL)
- `NEXT_PUBLIC_BACKEND_URL` (backend URL for file uploads)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`

## Deployment

### Backend (Railway)
- Containerized Node.js application
- MySQL service (separate or managed)
- Environment variables configured in Railway dashboard
- Automatic deployments from Git

### Frontend (Vercel)
- Next.js serverless deployment
- Automatic deployments from Git
- Environment variables in Vercel dashboard
- Edge network for global CDN

## Performance Optimizations

1. **Database Indexing**: Strategic indexes on frequently queried columns
2. **Connection Pooling**: Efficient database connection reuse
3. **Query Optimization**: Optimized queries with proper JOINs
4. **Caching**: RTK Query and SWR caching reduce API calls
5. **Lazy Loading**: Components and data loaded on demand
6. **Pagination**: Large datasets paginated to reduce memory usage

## Scheduled Tasks & Background Jobs

### News Auto-Publishing
- **Frequency**: Runs every 1 minute
- **Function**: Automatically publishes scheduled news items when their `published_at` time arrives
- **Location**: `backend/src/admin/controllers/newsController.js` - `autoUpdateScheduledNews()`
- **Timezone Handling**: All scheduled times are stored in UTC and compared using `UTC_TIMESTAMP()`
- **Documentation**: See [Scheduling & Timezone Guide](./SCHEDULING_TIMEZONE_GUIDE.md) for detailed timezone handling
- **Note**: Only runs in traditional server environments (not serverless)

### Deleted News Cleanup
- **Frequency**: Runs every 24 hours
- **Function**: Permanently deletes news items that have been soft-deleted for more than 30 days
- **Location**: `backend/src/utils/cleanupDeletedNews.js`
- **Note**: Only runs in traditional server environments (not serverless)

### Serverless Considerations
For serverless deployments (Vercel, AWS Lambda), scheduled tasks should be handled via:
- External cron services (e.g., Vercel Cron Jobs, AWS EventBridge)
- API endpoints triggered by external schedulers
- Platform-specific scheduled functions

---

**Back to [Main Documentation](../PROJECT_DOCUMENTATION.md)**

