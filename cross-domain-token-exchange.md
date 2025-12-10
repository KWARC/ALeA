# Cross-Domain Token Exchange

## Overview

This document describes the cross-domain authentication mechanism that allows users to authenticate on `alea.education` (non-FAU domain) using the same authentication system as `courses.voll-ki.fau.de` (FAU domain). The system uses a one-time password (OTP) token exchange mechanism to transfer authentication credentials across domains.

## Why This Solution?

**Note**: The ideal solution would have been to configure a separate Identity Provider (IdP) for `alea.education` that integrates with the same Shibboleth federation. However, due to bureaucratic and human-resource limitations, we implemented this custom SSO-like flow instead. This solution allows us to serve the application on both domains while maintaining a single authentication source (`lms.voll-ki.fau.de`) without requiring additional IdP configuration or administrative overhead.

## Problem Statement

### The Cookie Domain Limitation

Browsers enforce strict security policies that prevent cookies from being shared across different domains. This is a fundamental security feature of the web platform:

- **Cookies set for `fau.de`** can only be read by domains ending in `.fau.de` (e.g., `courses.voll-ki.fau.de`) and hence not by `alea.education`.
- **Cross-domain cookie sharing is not possible** due to browser security restrictions

### The Challenge

We need to serve the same Next.js application on two different domains:
- **FAU Domain**: `courses.voll-ki.fau.de` (existing)
- **Non-FAU Domain**: `alea.education` (new)

Users should be able to authenticate on either domain and have their session work seamlessly. However, since cookies cannot be shared across domains, we need a mechanism to transfer authentication credentials.

## Architecture

### Components

1. **`lms.voll-ki.fau.de`** - Shibboleth Identity Provider (IdP) server
   - Handles user authentication via Shibboleth
   - Creates JWT tokens after successful authentication
   - Sets JWT as an httpOnly (TODO) cookie with domain `fau.de`
   - Redirects authenticated users back to the application

2. **`courses.voll-ki.fau.de`** - FAU domain application server
   - Main application instance
   - Can read cookies set for `fau.de` domain
   - Generates OTP tokens for cross-domain authentication

3. **`alea.education`** - Non-FAU domain application server
   - Same application instance (served via Traefik)
   - Cannot read cookies from `fau.de` domain
   - Exchanges OTP tokens for JWT cookies

## Authentication Flow

### Scenario: User logs in on `alea.education`

```
1. User visits alea.education and clicks "Login"
   ↓
2. Application detects non-FAU domain and redirects to:
   courses.voll-ki.fau.de/cross-domain-auth/init?target=<original_url>
   ↓
3. courses.voll-ki.fau.de checks if user is logged in
   - If NOT logged in:
     a. Redirects to lms.voll-ki.fau.de/login (Shibboleth protected)
     b. User authenticates via Shibboleth
     c. lms.voll-ki.fau.de creates JWT and sets cookie for fau.de domain
     d. Redirects back to courses.voll-ki.fau.de/cross-domain-auth/init
   - If already logged in (has fau.de cookie):
     Proceeds to step 4
   ↓
4. courses.voll-ki.fau.de generates OTP token
   - Creates secure UUID token
   - Stores (otpToken, jwtToken) in database
   - OTP expires after 30 seconds (configurable via CROSS_DOMAIN_AUTH_EXPIRATION_SECONDS)
   ↓
5. Redirects to:
   alea.education/auth-callback?otp=<otp_token>&target=<original_url>
   ↓
6. alea.education exchanges OTP for JWT
   - Validates OTP token (not expired, not used)
   - Retrieves JWT from database
   - Sets JWT as cookie for alea.education domain
   - Deletes OTP token from database (single-use)
   ↓
7. Redirects user to original target URL
   - User is now authenticated on alea.education
```

### Scenario: User logs in on `courses.voll-ki.fau.de`

The standard flow applies:
1. User clicks "Login"
2. Redirects to `lms.voll-ki.fau.de/login` (Shibboleth)
3. After authentication, JWT cookie is set for `fau.de` domain
4. User is redirected back to `courses.voll-ki.fau.de`
5. No cross-domain exchange needed

## Implementation Details

The application maintains a database table (CrossDomainAuthTokens) for contains the OTP and JWT tokens for cross-domain token exchange. 

- **otpToken**: Unique identifier (UUID) used as primary key
- **jwtToken**: The JWT token to be transferred
- **createdAt**: Timestamp for expiration checking
- **used**: Flag to prevent token reuse (currently unused)

### API Endpoints

#### `/api/cross-domain-auth/generate-otp` (FAU domain only)

**Purpose**: Generate an OTP token from an existing JWT session

**Access**: Only accessible from `courses.voll-ki.fau.de`

**Process**:
1. Validates request is from FAU domain
2. Extracts JWT from Authorization header or cookie
3. Generates secure UUID as OTP token
4. Stores (otpToken, jwtToken) in database
5. Returns OTP token

**Response**: `{ "otpToken": "uuid-string" }`

#### `/api/cross-domain-auth/exchange-otp` (Non-FAU domain only)

**Purpose**: Exchange OTP token for JWT cookie

**Access**: Only accessible from `alea.education`

**Process**:
1. Validates request is from non-FAU domain
2. Looks up OTP token in database
3. Validates token (not expired, not used)
4. Sets JWT as httpOnly (TODO) cookie for current domain
5. Deletes OTP token (single-use)

**Response**: `"Authentication successful"`

### Pages

#### `/cross-domain-auth/init` (FAU domain only)

**Purpose**: Initiate cross-domain authentication flow

**Access**: Only accessible from `courses.voll-ki.fau.de`

**Process**:
1. Validates domain
2. Checks if user is logged in
3. If not logged in, redirects to Shibboleth login
4. If logged in, generates OTP and redirects to non-FAU domain

#### `/auth-callback` (Non-FAU domain only)

**Purpose**: Handle OTP token exchange and complete authentication

**Access**: Only accessible from `alea.education`

**Process**:
1. Validates domain
2. Extracts OTP token from query parameters
3. Calls exchange-otp API
4. Redirects to target URL

## Security Considerations

- **Domain Validation**: Both API endpoints validate the request origin domain
- **Token Expiration**: OTP tokens expire after 30 seconds (configurable)
- **Single-Use Tokens**: Tokens are deleted immediately after use
- **Secure Storage**: JWT tokens are stored in database only temporarily
- **HttpOnly Cookies (TODO)**: JWT cookies are set as httpOnly (TODO) to prevent XSS attacks

## Configuration

### Environment Variables (production)

```bash
# Domain configuration
NEXT_PUBLIC_FAU_DOMAIN=courses.voll-ki.fau.de
NEXT_PUBLIC_NON_FAU_DOMAIN=alea.education

# OTP expiration (in seconds)
CROSS_DOMAIN_AUTH_EXPIRATION_SECONDS=30

# Authentication server
NEXT_PUBLIC_AUTH_SERVER_URL=https://lms.voll-ki.fau.de
```

### Production reverse proxy (cortana + eliza)

- **cortana**: runs the Next.js app on port **3300**.
- **eliza**: Traefik terminates TLS and routes both `courses.voll-ki.fau.de` and `alea.education` to `cortana:3300`.

### Local debugging (macOS)

Use `fau.local` and `non-fau.local` with Caddy as a reverse proxy.

1) `/etc/hosts` entries (add with `sudo`):
```
127.0.0.1 fau.local
127.0.0.1 non-fau.local
```

2) Caddyfile (example):
```
fau.local {
    reverse_proxy localhost:4200
}

non-fau.local {
    reverse_proxy localhost:4200
}
```
Start Caddy: `caddy run --config <path to Caddyfile>`

3) Env vars for local debugging:
```bash
NEXT_PUBLIC_FAU_DOMAIN=fau.local
NEXT_PUBLIC_NON_FAU_DOMAIN=non-fau.local
NEXT_PUBLIC_AUTH_SERVER_URL=https://lms.voll-ki.fau.de   # still uses the real IdP
CROSS_DOMAIN_AUTH_EXPIRATION_SECONDS=30
```

4) Run the Next.js app (served on the port Caddy proxies to, e.g. 4200).

## Future Improvements

- [ ] Add httpOnly cookie support (currently commented out). Need to do this even for `courses/lmp.voll-ki.fau.de`.
- [ ] Implement token cleanup job for tokens that that were left unused
- [ ] Logging out scenarios 
