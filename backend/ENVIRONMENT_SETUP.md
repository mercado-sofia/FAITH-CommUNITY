# Environment Setup for Backend

## Required Environment Variables

Create a `.env` file in the backend directory with the following variables:

### Database Configuration
```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=db_community
```

### SMTP Configuration for Email (Required for Forgot Password)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
MAIL_FROM=FAITH CommUNITY <your-email@gmail.com>
```

### Frontend URL for Password Reset Links
```
FRONTEND_URL=http://localhost:3000
```

### Server Configuration
```
PORT=8080
NODE_ENV=development
```

## Important Notes

1. **SMTP Setup**: For Gmail, you need to:
   - Enable 2-factor authentication
   - Generate an App Password (16 characters)
   - Use the App Password in SMTP_PASS

2. **Frontend URL**: This should match your frontend application URL where users will be redirected after clicking the password reset link in their email.

3. **Database**: Make sure the `password_reset_tokens` table is created (this happens automatically when the server starts).

## Testing the Forgot Password Feature

1. Start the backend server
2. Navigate to the login page
3. Click "Forgot Password?"
4. Enter a valid admin email
5. Check the email for the reset link
6. Click the link to go to the reset password page
7. Enter a new password and confirm it
