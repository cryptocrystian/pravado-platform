# @pravado/shared-types - DEPRECATED

**⚠️ This package is deprecated and has been split into two new packages:**

- **[@pravado/types](../types)** - Pure TypeScript type definitions (no runtime dependencies)
- **[@pravado/validators](../validators)** - Zod validation schemas (imports from @pravado/types)

## Migration Guide

### For Type Imports Only

If you were importing types from `@pravado/shared-types`:

```typescript
// BEFORE
import { User, Campaign, Contact } from '@pravado/shared-types';

// AFTER
import { User, Campaign, Contact } from '@pravado/types';
```

### For Zod Schema Imports

If you were importing Zod schemas:

```typescript
// BEFORE
import { UserSchema, CampaignSchema } from '@pravado/shared-types';

// AFTER
import { UserSchema, CampaignSchema } from '@pravado/validators';
```

### For Mixed Imports

If you need both types and validators:

```typescript
// BEFORE
import { User, UserSchema, Campaign } from '@pravado/shared-types';

// AFTER
import { User, Campaign } from '@pravado/types';
import { UserSchema } from '@pravado/validators';
```

## Why the Split?

The original `@pravado/shared-types` package mixed pure TypeScript types with Zod validation schemas, which:

1. **Created unnecessary dependencies** - Frontend code importing types didn't need the Zod runtime dependency
2. **Caused duplicate export errors** - Multiple type definitions with the same name across different contexts
3. **Violated separation of concerns** - Compile-time types and runtime validation should be separate

## New Package Structure

### @pravado/types
- **Purpose:** Pure TypeScript type definitions
- **Dependencies:** None (no Zod, no runtime deps)
- **Exports:** 71 type files covering all domain entities
- **Usage:** Import from dashboard, API, and anywhere types are needed

### @pravado/validators
- **Purpose:** Zod validation schemas for runtime validation
- **Dependencies:** `@pravado/types` (for type definitions), `zod` (for schemas)
- **Exports:** 17 schema files for API validation
- **Usage:** Import from API routes, server-side validation logic

## Timeline

- **Deprecated:** November 6, 2025
- **Replacement:** Commit 2dbe1f3 (Package Separation Refactor)
- **Removal:** This package will be removed from the monorepo after confirmation that all imports have been migrated

## Build Status

This package is now excluded from the workspace and will not be built by Turborepo. All build scripts are no-ops that exit with success and print deprecation warnings.

## Need Help?

Refer to the [Truth Verification Report v12](../../truth_verification_report_v12.json) for complete details on:
- All 30+ duplicate types that were fixed
- Strategic renaming decisions
- Import migration patterns
- Full verification checklist
