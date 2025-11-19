# Algorithms Overview - Final Defense Presentation

## Quick Reference Guide

This document provides a high-level overview of all algorithms implemented in the FAITH CommUNITY platform, designed for quick reference during the Final Defense Presentation.

---

## Algorithm Categories

### 1. Authentication & Token Management
### 2. Security & Protection
### 3. Multi-Factor Authentication

---

## 1. Authentication & Token Management Algorithms

### 1.1 JWT Access Token Generation
**Purpose:** Generate short-lived access tokens for API authentication  
**Complexity:** O(1) time, O(1) space  
**Key Features:**
- 15-minute expiration
- HMAC-SHA256 signature
- Role-based payload
- Standard JWT claims (iat, iss, aud)

**Documentation:** [08-algorithms-jwt-token-management.md](./08-algorithms-jwt-token-management.md#1-jwt-access-token-generation-algorithm)

---

### 1.2 Refresh Token Rotation
**Purpose:** Securely rotate refresh tokens to prevent reuse attacks  
**Complexity:** O(1) time, O(1) space  
**Key Features:**
- Atomic transaction-based rotation
- Immediate revocation of old tokens
- 7-day expiration
- IP and User-Agent tracking

**Documentation:** [08-algorithms-jwt-token-management.md](./08-algorithms-jwt-token-management.md#2-refresh-token-rotation-algorithm)

---

### 1.3 Token Refresh Flow
**Purpose:** Automatically refresh expired access tokens  
**Complexity:** O(1) time, O(1) space  
**Key Features:**
- Proactive refresh (60-second buffer)
- Automatic retry on 401 errors
- Seamless user experience
- Frontend and backend coordination

**Documentation:** [08-algorithms-jwt-token-management.md](./08-algorithms-jwt-token-management.md#3-token-refresh-flow-algorithm)

---

### 1.4 Token Verification
**Purpose:** Verify JWT tokens and extract user information  
**Complexity:** O(1) time, O(1) space  
**Key Features:**
- Signature verification
- Expiration checking
- Issuer and audience validation
- Role extraction

**Documentation:** [08-algorithms-jwt-token-management.md](./08-algorithms-jwt-token-management.md#4-token-verification-algorithm)

---

### 1.5 Cookie Domain Resolution
**Purpose:** Intelligently determine cookie settings for cross-domain scenarios  
**Complexity:** O(1) time, O(1) space  
**Key Features:**
- Cross-domain detection
- Platform-specific handling (Vercel, Railway)
- SameSite policy determination
- Secure flag management

**Documentation:** [08-algorithms-jwt-token-management.md](./08-algorithms-jwt-token-management.md#5-cookie-domain-resolution-algorithm)

---

## 2. Security & Protection Algorithms

### 2.1 Login Attempt Tracking & Brute Force Prevention
**Purpose:** Prevent brute force attacks through attempt tracking and account lockout  
**Complexity:** O(1) time, O(n) space (n = attempts in window)  
**Key Features:**
- 10 failed attempts threshold
- 5-minute lockout window
- Warning appears at 7 attempts (3 remaining)
- Automatic cleanup of old attempts
- Unified tracking across all roles
- Atomic transaction-based operations

**Documentation:** [09-algorithms-security.md](./09-algorithms-security.md#1-login-attempt-tracking--brute-force-prevention-algorithm)

---

### 2.2 Session Security & Fingerprinting
**Purpose:** Bind sessions to IP and User-Agent to prevent session hijacking  
**Complexity:** O(1) time, O(1) space  
**Key Features:**
- SHA-256 fingerprinting (IP + User-Agent)
- Token hashing (SHA-256)
- Automatic session revocation on mismatch
- 30-minute session expiration
- Database-backed session storage

**Documentation:** [09-algorithms-security.md](./09-algorithms-security.md#2-session-security--fingerprinting-algorithm)

---

### 2.3 CSRF Protection (Double-Submit Cookie)
**Purpose:** Prevent Cross-Site Request Forgery attacks  
**Complexity:** O(1) time, O(1) space  
**Key Features:**
- Double-submit cookie pattern
- Token in both cookie and header
- Cryptographically secure token generation
- Automatic validation middleware

**Documentation:** [09-algorithms-security.md](./09-algorithms-security.md#3-csrf-protection-algorithm-double-submit-cookie-pattern)

---

### 2.4 Password Hashing (bcrypt)
**Purpose:** Securely hash passwords with salt to prevent rainbow table attacks  
**Complexity:** O(2^saltRounds) time, O(1) space  
**Key Features:**
- bcrypt with 10-12 salt rounds
- Unique salt per password
- Adaptive hashing (can increase rounds)
- One-way function (cannot reverse)

**Documentation:** [09-algorithms-security.md](./09-algorithms-security.md#4-password-hashing-algorithm-bcrypt)

---

### 2.5 Rate Limiting
**Purpose:** Prevent abuse and DDoS attacks through request frequency limiting  
**Complexity:** O(1) time, O(n) space (n = unique IPs)  
**Key Features:**
- Tiered limits (Global: 500, Auth: 10, Public: 1000)
- 15-minute sliding window
- Progressive delays (slow down)
- IP-based tracking
- RFC-compliant headers

**Documentation:** [09-algorithms-security.md](./09-algorithms-security.md#5-rate-limiting-algorithm)

---

## 3. Multi-Factor Authentication Algorithms

### 3.1 Two-Factor Authentication (TOTP)
**Purpose:** Implement Time-based One-Time Password authentication  
**Complexity:** O(1) time, O(1) space  
**Key Features:**
- RFC 6238 compliant
- 6-digit codes, 30-second time steps
- HMAC-SHA1 based
- QR code generation for setup
- ±30 second time window

**Documentation:** [10-algorithms-authentication.md](./10-algorithms-authentication.md#1-two-factor-authentication-totp-algorithm)

---

### 3.2 Email Change OTP Generation
**Purpose:** Generate and verify OTPs for secure email address changes  
**Complexity:** O(1) time, O(1) space  
**Key Features:**
- 6-digit cryptographically secure OTP
- 15-minute expiration
- One-time use enforcement
- Dual email notification
- Token-based lookup

**Documentation:** [10-algorithms-authentication.md](./10-algorithms-authentication.md#2-email-change-otp-generation-algorithm)

---

### 3.3 Backup Code Generation
**Purpose:** Generate secure backup codes for MFA recovery  
**Complexity:** O(n) time, O(n) space (n = number of codes)  
**Key Features:**
- 8-character alphanumeric codes
- bcrypt hashed storage
- One-time use
- Default 8 codes per user
- Case-insensitive verification

**Documentation:** [10-algorithms-authentication.md](./10-algorithms-authentication.md#3-backup-code-generation-algorithm)

---

### 3.4 Password Verification
**Purpose:** Securely verify user passwords during login  
**Complexity:** O(2^saltRounds) time, O(1) space  
**Key Features:**
- bcrypt comparison
- Constant-time comparison (prevents timing attacks)
- Automatic salt extraction
- Failed attempt tracking integration

**Documentation:** [10-algorithms-authentication.md](./10-algorithms-authentication.md#4-password-verification-algorithm)

---

## Algorithm Performance Summary

| Algorithm | Time Complexity | Space Complexity | Typical Latency |
|-----------|----------------|------------------|-----------------|
| JWT Generation | O(1) | O(1) | < 1ms |
| Token Refresh | O(1) | O(1) | 5-15ms |
| Login Attempt Tracking | O(1) | O(n) | 5-10ms |
| Session Verification | O(1) | O(1) | 2-5ms |
| CSRF Protection | O(1) | O(1) | < 1ms |
| Password Hashing | O(2^10) | O(1) | 50-100ms |
| TOTP Verification | O(1) | O(1) | < 5ms |
| Email OTP Generation | O(1) | O(1) | < 1ms |
| Backup Code Verification | O(n) | O(n) | 50-100ms |
| Rate Limiting | O(1) | O(n) | < 1ms |

---

## Security Standards Compliance

### Industry Standards
- **JWT**: RFC 7519 compliant
- **TOTP**: RFC 6238 compliant
- **CSRF**: OWASP recommended pattern
- **Password Hashing**: NIST/OWASP guidelines
- **Rate Limiting**: RFC 6585 compliant headers

### Security Best Practices
- ✅ Defense in depth (multiple security layers)
- ✅ Fail secure (default deny)
- ✅ Least privilege principle
- ✅ Audit logging
- ✅ Regular security updates

---

## Key Algorithm Highlights for Defense

### Most Critical Algorithms

1. **Refresh Token Rotation** - Prevents token reuse attacks
2. **Login Attempt Tracking** - Prevents brute force attacks
3. **Session Fingerprinting** - Prevents session hijacking
4. **TOTP Authentication** - Industry-standard 2FA
5. **Password Hashing** - Secure password storage

### Innovation Points

1. **Unified User Tracking** - Single tracking system across all roles prevents cross-endpoint brute force
2. **Intelligent Cookie Domain Resolution** - Handles complex deployment scenarios (Vercel + Railway)
3. **Proactive Token Refresh** - Seamless user experience with automatic token management
4. **Atomic Security Operations** - Transaction-based security operations prevent race conditions

---

## Documentation Structure

1. **[JWT Token Management](./08-algorithms-jwt-token-management.md)** - Complete JWT and token algorithms
2. **[Security Algorithms](./09-algorithms-security.md)** - Security and protection algorithms
3. **[Authentication Algorithms](./10-algorithms-authentication.md)** - MFA and authentication algorithms
4. **[This Overview](./11-algorithms-overview.md)** - Quick reference guide

---

## Quick Defense Talking Points

### "What algorithms did you implement?"

**Answer:** We implemented 10+ security and authentication algorithms including:
- JWT token generation and rotation
- Refresh token rotation (prevents token reuse)
- Login attempt tracking with brute force prevention
- Session security with IP/User-Agent fingerprinting
- CSRF protection using double-submit cookie pattern
- TOTP-based two-factor authentication (RFC 6238)
- Email OTP generation and verification
- Backup code generation for MFA recovery
- Password hashing with bcrypt
- Rate limiting with progressive delays

### "How do you prevent brute force attacks?"

**Answer:** We use a multi-layered approach:
1. **Login Attempt Tracking**: Tracks failed attempts by email (unified across all roles)
2. **Account Lockout**: 10 failed attempts within 5 minutes triggers 5-minute lockout
3. **Warning System**: Red warning appears when 3 attempts remain (at 7 failed attempts)
4. **Rate Limiting**: Auth endpoints limited to 10 requests per 15 minutes per IP
5. **Progressive Delays**: Slow down mechanism after threshold
6. **Atomic Operations**: Database transactions prevent race conditions

### "How does your token refresh work?"

**Answer:** We implement secure refresh token rotation:
1. **Short-lived Access Tokens**: 15-minute expiration
2. **Long-lived Refresh Tokens**: 7-day expiration in httpOnly cookies
3. **Token Rotation**: Every refresh generates a new token, old token immediately revoked
4. **Proactive Refresh**: Tokens refreshed 60 seconds before expiration
5. **Automatic Retry**: Failed requests trigger automatic token refresh

### "What security standards do you follow?"

**Answer:** We follow industry standards:
- **JWT**: RFC 7519 compliant
- **TOTP**: RFC 6238 compliant (Google Authenticator compatible)
- **CSRF**: OWASP recommended double-submit cookie pattern
- **Password Security**: NIST/OWASP guidelines (bcrypt with 10-12 rounds)
- **Rate Limiting**: RFC 6585 compliant headers

---

**Back to [Main Documentation](../README.md)**

