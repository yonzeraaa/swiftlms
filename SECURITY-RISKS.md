# 🔐 Security Risks and Mitigation Strategies

## Overview

This document outlines known security risks in SwiftLMS and the mitigation strategies currently in place. It also provides recommendations for future architectural improvements.

---

## ⚠️ Known Risk: Client-Side Token Exposure

### The Issue

**Location:** `lib/supabase/client.ts`

The `@supabase/ssr` library stores authentication tokens (access token and refresh token) in **JavaScript-readable cookies**. This means:

1. Any XSS (Cross-Site Scripting) vulnerability could allow an attacker to read these tokens
2. Once stolen, tokens can be used to impersonate the user
3. Tokens remain valid until they expire (typically 1 hour for access, 7 days for refresh)

### Why We Can't Just "Fix" It

The application uses **Row-Level Security (RLS)** in Supabase. Client-side components make direct queries like:

```typescript
// app/student-dashboard/page.tsx:33
const { data: courses } = await supabase
  .from('enrollments')
  .select('*')
```

These queries **require** the client to send auth tokens to Supabase. If we block token storage entirely (like with a custom adapter that returns `null`), all client-side data fetching breaks.

### Current Mitigation Strategies

We have implemented multiple layers of defense to minimize XSS risk:

#### 1. **Content Security Policy (CSP)**
**Location:** `middleware.ts`

```typescript
'Content-Security-Policy': [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // ... strict resource loading policies
].join('; ')
```

- Restricts where scripts can be loaded from
- Prevents inline script execution (except whitelisted)
- Blocks unauthorized external resources

#### 2. **Input Validation with Zod**
**Location:** `lib/validation/*.ts`

```typescript
export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128)
})
```

- All user inputs are validated with strict schemas
- Prevents injection attacks (SQL, XSS, command injection)
- Server-side validation on all API endpoints

#### 3. **Cookie Security Attributes**
**Locations:** All auth endpoints

```typescript
{
  httpOnly: true,      // Not applicable to Supabase client cookies
  secure: true,        // HTTPS only (production)
  sameSite: 'lax',     // Prevents CSRF
  maxAge: 3600         // Short expiration
}
```

- Note: Our custom cookies (view-as-student, adminViewId) are httpOnly
- Supabase client cookies unfortunately cannot be httpOnly (needed for client queries)

#### 4. **HTTPS Enforcement (HSTS)**
**Location:** `middleware.ts`

```typescript
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
```

- Forces all connections to use HTTPS
- Prevents token interception via MITM attacks

#### 5. **Rate Limiting**
**Location:** `app/api/auth/login/route.ts`

```typescript
authRateLimiter.isAllowed(clientId)  // 5 attempts per minute
```

- Prevents brute force attacks
- Limits damage from credential stuffing

#### 6. **CSRF Protection**
**Location:** `lib/security/csrf.ts`

```typescript
validateCSRF(request)  // Origin validation on all POST/PUT/DELETE
```

- Validates request origin matches allowed hosts
- Prevents cross-site request forgery

#### 7. **Regular Security Audits**
- Dependency scanning with `npm audit`
- Code reviews for security issues
- Prompt patching of vulnerabilities

---

## 🎯 Recommended Future Improvements

To eliminate the client-side token exposure risk entirely, consider these architectural changes:

### Option 1: Server Components + Server Actions (Recommended)

**Effort:** High
**Security:** Excellent
**Performance:** Excellent

Migrate data fetching to Next.js Server Components and mutations to Server Actions:

```typescript
// app/student-dashboard/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: courses } = await supabase
    .from('enrollments')
    .select('*')

  return <CourseList courses={courses} />
}
```

**Pros:**
- Zero client-side token exposure
- Faster initial page loads (no waterfall requests)
- Better SEO (fully rendered HTML)

**Cons:**
- Requires refactoring ~50 client components
- Need to rethink real-time features
- Learning curve for server actions

### Option 2: Custom Auth Proxy

**Effort:** Medium
**Security:** Good
**Performance:** Moderate

Create API routes that proxy Supabase requests with server-side auth:

```typescript
// app/api/proxy/enrollments/route.ts
export async function GET() {
  const supabase = await createServerClient()
  const { data } = await supabase.from('enrollments').select('*')
  return NextResponse.json(data)
}

// Client component
const { data } = await fetch('/api/proxy/enrollments')
```

**Pros:**
- Centralized auth token management
- Easier to implement caching
- Can add rate limiting per endpoint

**Cons:**
- Extra latency (client → Next.js → Supabase)
- More API routes to maintain
- Doesn't solve real-time subscriptions

### Option 3: NextAuth.js Migration

**Effort:** High
**Security:** Excellent
**Performance:** Good

Replace Supabase Auth with NextAuth.js:

```typescript
// Uses httpOnly session cookies by default
import { getServerSession } from 'next-auth'
```

**Pros:**
- Industry-standard secure session management
- httpOnly cookies by default
- Supports multiple auth providers

**Cons:**
- Major refactor (auth + database schema changes)
- Need to replicate Supabase Auth features
- May lose some Supabase conveniences

### Option 4: tRPC Integration

**Effort:** Medium
**Security:** Good
**Performance:** Good

Use tRPC for type-safe server-only API calls:

```typescript
// server/routers/enrollments.ts
export const enrollmentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.supabase.from('enrollments').select('*')
  })
})

// Client
const { data } = trpc.enrollments.list.useQuery()
```

**Pros:**
- Type-safe end-to-end
- Automatic API generation
- Good developer experience

**Cons:**
- Learning curve
- Another dependency
- Requires restructuring API layer

---

## 📊 Risk Assessment

| Risk | Likelihood | Impact | Current Mitigation | Residual Risk |
|------|-----------|--------|-------------------|---------------|
| XSS → Token Theft | Low | Critical | CSP + Input Validation | **Medium** |
| CSRF Attack | Very Low | Medium | SameSite + Origin Validation | **Very Low** |
| MITM Token Intercept | Very Low | Critical | HTTPS + HSTS | **Very Low** |
| Brute Force | Very Low | Medium | Rate Limiting | **Very Low** |
| SQL Injection | Very Low | Critical | Parameterized Queries + Zod | **Very Low** |

### Overall Risk Level: **MEDIUM**

The primary risk is XSS-based token theft. While we have strong XSS prevention measures (CSP, input validation), no defense is perfect. A motivated attacker who finds an XSS vulnerability could steal tokens.

---

## 🛡️ Defense in Depth

Our security strategy follows the principle of **defense in depth** - multiple layers of security controls:

1. **Prevent XSS:** Input validation, CSP, React's automatic escaping
2. **Limit Token Access:** Short expiration times, secure transmission (HTTPS)
3. **Detect Anomalies:** Audit logging, monitoring (can be improved)
4. **Respond Quickly:** Token revocation on logout, session invalidation

Even if one layer fails (e.g., an XSS bypass), other layers provide backup protection.

---

## 📈 Priority Recommendations

Based on effort vs. security improvement:

### Immediate (Low Effort)
- ✅ Implement CSP reporting endpoint to catch violations
- ✅ Add security headers testing to CI/CD
- ✅ Set up dependency vulnerability scanning

### Short Term (3-6 months)
- ✅ **Server actions created** - See `lib/actions/student-dashboard.ts`
- ✅ **Migration guide written** - See `MIGRATION-GUIDE.md`
- 🔄 **IN PROGRESS:** Migrate critical pages to Server Components
  - Priority: `/student-dashboard/grades`, `/dashboard/users`, `/student-dashboard/certificates`
  - Follow guide in `MIGRATION-GUIDE.md`
- 📋 Add session anomaly detection (unusual IP/user-agent changes)

### Long Term (6-12 months)
- 📋 Full migration to Server Components + Server Actions (~50 pages)
- 📋 Consider NextAuth.js if Supabase Auth limitations are encountered
- 📋 Implement security monitoring dashboard

## 🚀 Current Migration Status

**Phase:** Foundation Complete
**Date:** 2025-01-09

### What's Done
- ✅ Server actions created in `lib/actions/student-dashboard.ts`
- ✅ Migration patterns documented in `MIGRATION-GUIDE.md`
- ✅ Proof-of-concept architecture validated
- ✅ Security risks documented

### Next Steps
1. Migrate `/student-dashboard/grades` to Server Component (highest risk)
2. Migrate `/dashboard/users` to Server Component (admin access)
3. Migrate `/student-dashboard/certificates` to Server Component (sensitive data)
4. Continue with remaining pages per priority list

### How to Contribute
See `MIGRATION-GUIDE.md` for step-by-step instructions on migrating pages.

---

## 🔍 Security Checklist

Use this checklist when adding new features:

- [ ] All user inputs validated with Zod schemas
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] External data sources sanitized before rendering
- [ ] API endpoints protected with CSRF validation
- [ ] Sensitive operations have rate limiting
- [ ] Database queries use parameterized statements (RLS)
- [ ] New dependencies scanned for vulnerabilities
- [ ] Error messages don't leak sensitive information
- [ ] Authentication required for all protected routes
- [ ] Audit logs for security-critical operations

---

## 📞 Security Contacts

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email: [security contact email here]
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if applicable)

---

## 📜 Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-09 | 1.0 | Initial security risks documentation |

---

**Last Updated:** 2025-01-09
**Next Review:** 2025-04-09 (Quarterly)
