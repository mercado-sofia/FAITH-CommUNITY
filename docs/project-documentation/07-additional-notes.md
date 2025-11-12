# Additional Notes

## Environment Variables

### Backend Required Variables
- `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `JWT_SECRET` (32+ character random string)
- `FRONTEND_URL` (for CORS and email links)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (or `SENDGRID_API_KEY`)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

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

---

**Back to [Main Documentation](../PROJECT_DOCUMENTATION.md)**

