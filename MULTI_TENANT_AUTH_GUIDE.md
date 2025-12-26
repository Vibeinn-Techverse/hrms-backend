# Multi-Tenant HRMS Authentication Guide

## 🏢 Overview

This is a **multi-tenant HRMS system** where each organization is completely isolated. Users belong to a specific organization and can only access data within their organization.

---

## 🔐 Authentication Flow

### **Step 1: Organization Setup (Admin/System)**

Before users can sign up, organizations must exist in the database:

```sql
-- Example: Create an organization
INSERT INTO "Organization" (id, name, displayName, email, isActive)
VALUES ('org_abc123', 'Acme Corp', 'Acme Corporation', 'admin@acme.com', true);
```

### **Step 2: User Signup with Clerk**

When a user signs up through Clerk, you **MUST** set the `organizationId` in Clerk's `publicMetadata`:

```typescript
// Frontend: During signup or after organization selection
await clerk.user.update({
  publicMetadata: {
    organizationId: 'org_abc123' // The organization this user belongs to
  }
});
```

**CRITICAL:** Without `organizationId` in Clerk metadata, the webhook will **reject** user creation.

### **Step 3: Webhook Syncs User to Database**

1. User signs up in Clerk
2. Clerk sends `user.created` webhook to your backend
3. Webhook extracts `organizationId` from `publicMetadata`
4. Validates organization exists and is active
5. Creates user in database with proper tenant isolation

```
POST /api/v1/webhooks/clerk
↓
Verify webhook signature (Svix)
↓
Extract organizationId from clerkUser.publicMetadata
↓
Validate organization exists and isActive
↓
Create user in database with organizationId
↓
Auto-assign default "employee" role
↓
Generate unique employeeCode
```

### **Step 4: User Login & JWT Token**

After Clerk authentication, exchange Clerk token for your JWT:

```typescript
// Frontend: After Clerk login
const response = await fetch('/api/v1/auth/exchange-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`
  }
});

const { token, user } = await response.json();
// token includes: id, clerkUid, organizationId, email, role
```

**JWT Payload includes:**
- `id` - User ID in your database
- `clerkUid` - Clerk user ID
- **`organizationId`** - Critical for tenant isolation
- `email`, `firstName`, `lastName`, `role`

---

## 🛡️ Tenant Isolation

### **Middleware Usage**

Protect your routes with tenant validation middleware:

```typescript
import { validateTenantAccess, ensureResourceBelongsToTenant } from './middlewares/tenant.middleware';

// Basic tenant validation (checks JWT has valid organizationId)
router.get('/employees', validateTenantAccess, getEmployees);

// Resource-level validation (ensures resource belongs to user's org)
router.get('/employees/:id', 
  validateTenantAccess,
  ensureResourceBelongsToTenant('organizationId'),
  getEmployeeById
);
```

### **Service Layer - Always Filter by Organization**

**CRITICAL:** Every database query MUST filter by `organizationId`:

```typescript
// ❌ WRONG - No tenant isolation
const users = await prisma.user.findMany();

// ✅ CORRECT - Tenant isolated
const users = await prisma.user.findMany({
  where: { organizationId: req.user.organizationId }
});
```

Use the helper function:

```typescript
import { getTenantFilter } from './middlewares/tenant.middleware';

const users = await prisma.user.findMany({
  where: {
    ...getTenantFilter(req.user.organizationId),
    status: 'ACTIVE'
  }
});
```

---

## 🚨 Security Checklist

### **Before Going to Production:**

- [ ] **Never auto-create organizations** - Organizations must be created explicitly
- [ ] **Always require organizationId in Clerk metadata** before user creation
- [ ] **All Prisma queries filter by organizationId** (except Organization model itself)
- [ ] **JWT tokens include organizationId** for every request
- [ ] **Middleware validates organizationId** on protected routes
- [ ] **API responses never leak data from other organizations**
- [ ] **Audit logs include organizationId** for tracking
- [ ] **File uploads are scoped to organization** (S3 prefixes: `org_id/...`)
- [ ] **Background jobs filter by organizationId**
- [ ] **Reports and exports are tenant-scoped**

---

## 📋 Common Patterns

### **Pattern 1: Creating Resources**

```typescript
// Always include organizationId from authenticated user
const department = await prisma.department.create({
  data: {
    organizationId: req.user.organizationId, // From JWT
    name: 'Engineering',
    code: 'ENG'
  }
});
```

### **Pattern 2: Querying Resources**

```typescript
// Always filter by organizationId
const departments = await prisma.department.findMany({
  where: {
    organizationId: req.user.organizationId,
    isActive: true
  }
});
```

### **Pattern 3: Updating Resources**

```typescript
// Verify resource belongs to user's organization before updating
const department = await prisma.department.findFirst({
  where: {
    id: departmentId,
    organizationId: req.user.organizationId // Tenant check
  }
});

if (!department) {
  throw new Error('Department not found or access denied');
}

await prisma.department.update({
  where: { id: departmentId },
  data: { name: 'New Name' }
});
```

---

## 🔧 Setup Instructions

### **1. Environment Variables**

```env
# Clerk
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key

# Database
DATABASE_URL=postgresql://user:pass@host:5432/hrms_db
```

### **2. Clerk Webhook Configuration**

1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/v1/webhooks/clerk`
3. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy webhook secret to `CLERK_WEBHOOK_SECRET`

### **3. Frontend Integration**

```typescript
// After organization selection or during signup
const updateUserMetadata = async (organizationId: string) => {
  await clerk.user.update({
    publicMetadata: {
      organizationId: organizationId
    }
  });
};

// Then trigger Clerk signup
await clerk.signUp.create({
  emailAddress: email,
  password: password
});
```

---

## 🐛 Troubleshooting

### **Error: "Organization context is required"**

**Cause:** User's Clerk account doesn't have `organizationId` in `publicMetadata`

**Solution:** Update Clerk user metadata before signup:
```typescript
await clerk.user.update({
  publicMetadata: { organizationId: 'org_xxx' }
});
```

### **Error: "Organization not found or is inactive"**

**Cause:** The `organizationId` in Clerk metadata doesn't exist in database or is inactive

**Solution:** 
1. Verify organization exists: `SELECT * FROM "Organization" WHERE id = 'org_xxx'`
2. Check `isActive = true`
3. Create organization if missing

### **Error: "Access denied: resource belongs to different organization"**

**Cause:** User trying to access resource from another organization

**Solution:** This is **correct behavior** - tenant isolation is working. User should only access their organization's data.

---

## 📊 Database Schema Notes

### **Organization Model**

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  displayName String
  email       String   @unique
  isActive    Boolean  @default(true)
  
  // Relations - all scoped to this organization
  users       User[]
  departments Department[]
  roles       Role[]
  // ... other relations
}
```

### **User Model**

```prisma
model User {
  id             String   @id @default(cuid())
  clerkId        String   @unique
  organizationId String   // CRITICAL: Tenant isolation
  roleId         String
  employeeCode   String   @unique
  email          String   @unique
  // ...
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  @@unique([organizationId, employeeCode])
  @@unique([organizationId, email])
  @@index([organizationId]) // Performance
}
```

---

## ✅ Summary

**Multi-tenant authentication requires:**

1. ✅ Organizations created in database first
2. ✅ `organizationId` set in Clerk `publicMetadata` before signup
3. ✅ Webhook validates and syncs user with proper tenant context
4. ✅ JWT includes `organizationId` for every request
5. ✅ All queries filtered by `organizationId`
6. ✅ Middleware enforces tenant isolation
7. ✅ No data leakage between organizations

**Your authentication flow is now properly configured for multi-tenancy! 🎉**
