# Security Architecture - SwiftLMS

## Critical Security Improvement (2025-01)

This document describes the security architecture implemented to eliminate XSS-based authentication token theft.

---

## The Problem

Previously, the application used `@supabase/ssr` with default configuration:
- `persistSession: true` - Tokens stored in JavaScript-accessible cookies
- `autoRefreshToken: true` - Automatic token refresh on client-side
- **RISK:** Any XSS vulnerability could steal authentication tokens from cookies

---

## The Solution

### 1. Zero Client-Side Token Storage

**File:** `lib/supabase/client.ts`

```typescript
createBrowserClient({
  auth: {
    persistSession: false,      // CRITICAL: Don't persist in cookies
    autoRefreshToken: false,    // CRITICAL: Don't auto-refresh
    storage: undefined,         // No storage - memory only
  }
})
```

**Result:** Client-side Supabase instance has **ZERO access to authentication tokens**.

---

### 2. Server-Side Authentication Management

**File:** `lib/actions/auth.ts`

All authentication operations are server actions:

```typescript
// ✅ Reads tokens from httpOnly cookies (JS cannot access)
export async function getSessionStatus() {
  const supabase = await createClient() // server.ts, not client.ts!
  const { session } = await supabase.auth.getSession()
  return { isAuthenticated: !!session, user: session?.user }
}

export async function refreshSessionAction() { ... }
export async function signOutAction() { ... }
```

---

### 3. Updated AuthProvider

**File:** `app/providers/AuthProvider.tsx`

```typescript
// ❌ BEFORE (VULNERABLE):
const supabase = createClient() // client-side
const { session } = await supabase.auth.getSession()

// ✅ AFTER (SECURE):
import { getSessionStatus } from '@/lib/actions/auth'
const status = await getSessionStatus() // server action
```

All auth operations now use server actions:
- Session checking: `getSessionStatus()`
- Session refresh: `refreshSessionAction()`
- Logout: `signOutAction()`

---

## Authentication Flow

### Login

```
1. User submits credentials to /api/auth/login
2. Server validates credentials
3. Server sets httpOnly cookies (JS cannot read)
4. Client receives success response
5. Client redirects to dashboard
```

### Session Management

```
1. AuthProvider polls getSessionStatus() every 30s
2. Server reads httpOnly cookies
3. Server returns session status (WITHOUT tokens)
4. Client updates UI state
5. Tokens NEVER touch JavaScript
```

### API/Database Calls

```
// Server Components/Actions:
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient() // reads httpOnly cookies
const { data } = await supabase.from('table').select()

// Client Components:
import { getMyData } from '@/lib/actions/data'
const result = await getMyData() // server action
```

---

## Security Guarantees

### ✅ What's Protected

1. **Authentication Tokens:**
   - Stored ONLY in httpOnly cookies
   - JavaScript has ZERO access
   - XSS attacks CANNOT steal tokens

2. **Session Refresh:**
   - Happens server-side only
   - Client never sees new tokens
   - Automatic refresh via server actions

3. **Logout:**
   - Server-side session termination
   - httpOnly cookies cleared
   - No client-side token cleanup needed

### ⚠️ What's Still Required

1. **CSP Headers:** Block inline scripts and eval() (already implemented in middleware)
2. **Input Validation:** Prevent XSS injection (use Zod validation)
3. **HTTPS:** Secure flag on all cookies (enforced in production)
4. **SameSite:** CSRF protection (set to Lax)

---

## Attack Scenarios

### XSS Attack (Token Theft) - MITIGATED ✅

**Before:**
```javascript
// Malicious XSS payload
document.cookie // Could read auth tokens
localStorage.getItem('supabase.auth.token') // Could read tokens
```

**After:**
```javascript
// Malicious XSS payload
document.cookie // Returns cookies, but auth tokens are httpOnly (hidden)
localStorage.getItem('supabase.auth.token') // Returns null (no storage)
// ✅ ATTACK FAILS: No tokens accessible to JavaScript
```

### Session Hijacking - MITIGATED ✅

- httpOnly cookies prevent theft
- SameSite=Lax prevents CSRF
- Secure flag enforces HTTPS
- Short session lifetime with auto-refresh

---

## Code Examples

### ❌ INSECURE (Old Pattern)

```typescript
// DON'T DO THIS:
'use client'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data } = await supabase.from('users').select() // ❌ Tokens in JS
```

### ✅ SECURE (New Pattern)

```typescript
// Server Action:
'use server'
import { createClient } from '@/lib/supabase/server'

export async function getUsers() {
  const supabase = await createClient() // ✅ httpOnly cookies
  const { data } = await supabase.from('users').select()
  return { success: true, data }
}

// Client Component:
'use client'
import { getUsers } from '@/lib/actions/users'

const users = await getUsers() // ✅ No token exposure
```

---

## Testing Security

### Manual Testing

1. **Inspect Cookies:**
   ```bash
   # In browser DevTools > Application > Cookies
   # Verify auth cookies have HttpOnly flag checked
   ```

2. **Try to Access Tokens:**
   ```javascript
   // In browser console
   document.cookie // Should NOT show Supabase auth tokens
   localStorage // Should NOT have supabase.auth.token
   ```

3. **Test Session Refresh:**
   - Wait for session to expire
   - Verify automatic refresh works
   - Verify tokens never appear in JS

### Automated Testing

```bash
npm test # All 859 tests should pass
npm run build # Should compile successfully
```

---

## Migration Checklist

If you're implementing this pattern in another project:

- [ ] Set `persistSession: false` in client configuration
- [ ] Set `autoRefreshToken: false` in client configuration
- [ ] Set `storage: undefined` in client configuration
- [ ] Create server actions for auth operations (getSession, refresh, signOut)
- [ ] Update AuthProvider to use server actions
- [ ] Migrate all data fetching to server actions/components
- [ ] Test token inaccessibility in browser console
- [ ] Verify httpOnly flags on auth cookies
- [ ] Confirm all tests pass
- [ ] Deploy and monitor

---

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js 15 Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [httpOnly Cookie Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies)

---

## Contact

For security concerns or questions, please contact the development team.

**Last Updated:** January 2025
**Version:** 2.0
**Status:** ✅ Production Ready
