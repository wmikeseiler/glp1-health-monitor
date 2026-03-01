# GLP-1 Health Monitor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a cross-platform personal health monitoring app for GLP-1 medication therapy tracking with injection site rotation, weight/vitals logging, food tracking (photo AI + barcode + manual), curated recipes, and a full analytics dashboard.

**Architecture:** Turborepo monorepo with Expo (mobile) and Next.js (web) apps sharing a Tamagui UI kit, tRPC API layer, and Drizzle ORM + Supabase PostgreSQL database. Auth via Supabase Auth (email/password + Google + Apple).

**Tech Stack:** TypeScript, Turborepo, Expo (React Native), Next.js 14+, Tamagui, tRPC, Drizzle ORM, Supabase (PostgreSQL + Auth + Storage), Zod, Vitest, React Testing Library, Playwright

**Design Doc:** `docs/plans/2026-02-28-glp1-health-monitor-design.md`

---

## Phase 0: Monorepo Scaffold & Tooling

### Task 0.1: Initialize Turborepo monorepo

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `pnpm-workspace.yaml`

**Step 1: Initialize the monorepo root**

```bash
pnpm init
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "cache": false
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Step 4: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "incremental": true
  },
  "exclude": ["node_modules"]
}
```

**Step 5: Create .gitignore**

```
node_modules/
.next/
dist/
.turbo/
.env*.local
.expo/
ios/
android/
*.tsbuildinfo
```

**Step 6: Install root dev dependencies**

```bash
pnpm add -D turbo typescript @types/node prettier eslint
```

**Step 7: Add root package.json scripts**

Update `package.json` scripts:
```json
{
  "name": "glp1-health-monitor",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "clean": "turbo clean"
  }
}
```

**Step 8: Commit**

```bash
git add -A && git commit -m "chore: initialize turborepo monorepo scaffold"
```

---

### Task 0.2: Create shared packages structure

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/index.ts`
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/src/index.ts`
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`

**Step 1: Create packages/shared**

`packages/shared/package.json`:
```json
{
  "name": "@glp1/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

`packages/shared/src/index.ts`:
```ts
export * from "./schemas";
export * from "./constants";
export * from "./types";
```

**Step 2: Create packages/db**

`packages/db/package.json`:
```json
{
  "name": "@glp1/db",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.36.0",
    "postgres": "^3.4.0",
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "typescript": "^5.5.0"
  }
}
```

`packages/db/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

**Step 3: Create packages/api**

`packages/api/package.json`:
```json
{
  "name": "@glp1/api",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@trpc/server": "^11.0.0",
    "superjson": "^2.2.0",
    "zod": "^3.23.0",
    "@glp1/db": "workspace:*",
    "@glp1/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

**Step 4: Create packages/ui**

`packages/ui/package.json`:
```json
{
  "name": "@glp1/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "tamagui": "^1.110.0",
    "@tamagui/core": "^1.110.0",
    "@tamagui/config": "^1.110.0",
    "react": "^18.3.0",
    "react-native": "^0.74.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0"
  }
}
```

**Step 5: Create placeholder index files for db, api, ui**

Each gets a minimal `src/index.ts`:
```ts
// @glp1/<package-name>
export {};
```

**Step 6: Run pnpm install from root**

```bash
pnpm install
```

**Step 7: Commit**

```bash
git add -A && git commit -m "chore: add shared packages structure (shared, db, api, ui)"
```

---

### Task 0.3: Create Next.js web app

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/tamagui.config.ts`

**Step 1: Scaffold the Next.js app**

```bash
cd apps && npx create-next-app@latest web --typescript --tailwind=false --eslint --app --src-dir=false --import-alias="~/*" --use-pnpm
```

**Step 2: Add workspace dependencies**

In `apps/web/package.json`, add:
```json
{
  "dependencies": {
    "@glp1/api": "workspace:*",
    "@glp1/db": "workspace:*",
    "@glp1/shared": "workspace:*",
    "@glp1/ui": "workspace:*",
    "@trpc/client": "^11.0.0",
    "@trpc/server": "^11.0.0",
    "@trpc/tanstack-react-query": "^11.0.0",
    "@tanstack/react-query": "^5.50.0",
    "superjson": "^2.2.0",
    "tamagui": "^1.110.0",
    "@tamagui/core": "^1.110.0",
    "@tamagui/config": "^1.110.0",
    "@tamagui/next-plugin": "^1.110.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0"
  }
}
```

**Step 3: Configure next.config.js with Tamagui plugin**

```javascript
const { withTamagui } = require('@tamagui/next-plugin')

const config = {
  reactStrictMode: true,
  transpilePackages: [
    '@glp1/ui',
    '@glp1/shared',
    'tamagui',
    '@tamagui/core',
    '@tamagui/config',
    'react-native',
    'react-native-web',
  ],
}

module.exports = withTamagui({
  config: './tamagui.config.ts',
  components: ['tamagui', '@glp1/ui'],
  appDir: true,
  outputCSS: process.env.NODE_ENV === 'production' ? './public/tamagui.css' : null,
  disableExtraction: process.env.NODE_ENV === 'development',
})(config)
```

**Step 4: Create tamagui.config.ts**

```ts
import { config } from "@tamagui/config/v3";
import { createTamagui } from "tamagui";

const tamaguiConfig = createTamagui(config);

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends Conf {}
}
```

**Step 5: Create basic app/layout.tsx and app/page.tsx**

`apps/web/app/layout.tsx`:
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GLP-1 Health Monitor",
  description: "Track your GLP-1 therapy, weight, vitals, food, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`apps/web/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main>
      <h1>GLP-1 Health Monitor</h1>
      <p>Welcome. Setup in progress.</p>
    </main>
  );
}
```

**Step 6: Verify it builds**

```bash
cd /path/to/root && pnpm turbo build --filter=web
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add Next.js web app with Tamagui config"
```

---

### Task 0.4: Create Expo mobile app

**Files:**
- Create: `apps/mobile/` (Expo scaffold)
- Modify: `apps/mobile/package.json` (add workspace deps)
- Create: `apps/mobile/tamagui.config.ts`

**Step 1: Scaffold the Expo app**

```bash
cd apps && npx create-expo-app mobile --template blank-typescript
```

**Step 2: Add workspace dependencies to apps/mobile/package.json**

```json
{
  "dependencies": {
    "@glp1/api": "workspace:*",
    "@glp1/shared": "workspace:*",
    "@glp1/ui": "workspace:*",
    "@trpc/client": "^11.0.0",
    "@trpc/tanstack-react-query": "^11.0.0",
    "@tanstack/react-query": "^5.50.0",
    "superjson": "^2.2.0",
    "tamagui": "^1.110.0",
    "@tamagui/core": "^1.110.0",
    "@tamagui/config": "^1.110.0",
    "@supabase/supabase-js": "^2.45.0",
    "expo-router": "~4.0.0",
    "expo-camera": "~16.0.0",
    "expo-notifications": "~0.29.0",
    "expo-barcode-scanner": "~13.0.0",
    "react-native-svg": "^15.0.0"
  }
}
```

**Step 3: Copy tamagui.config.ts** (same as web)

**Step 4: Configure metro.config.js for monorepo**

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.sourceExts.push("mjs");

module.exports = config;
```

**Step 5: Install and verify**

```bash
cd /path/to/root && pnpm install
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Expo mobile app with Tamagui and monorepo metro config"
```

---

### Task 0.5: Set up Vitest for shared packages

**Files:**
- Create: `packages/shared/vitest.config.ts`
- Create: `packages/api/vitest.config.ts`
- Create: `packages/shared/src/__tests__/schemas.test.ts`

**Step 1: Create vitest configs**

`packages/shared/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
```

`packages/api/vitest.config.ts` (same content).

**Step 2: Write a placeholder test**

`packages/shared/src/__tests__/schemas.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("shared package", () => {
  it("loads without error", () => {
    expect(true).toBe(true);
  });
});
```

**Step 3: Run test to verify setup**

```bash
pnpm turbo test --filter=@glp1/shared
```
Expected: PASS

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: configure vitest for shared packages"
```

---

## Phase 1: Database Schema & Shared Types

### Task 1.1: Define Zod schemas and TypeScript types

**Files:**
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/__tests__/schemas.test.ts` (replace placeholder)

**Step 1: Write tests for Zod schemas**

`packages/shared/src/__tests__/schemas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  injectionSiteSchema,
  mealTypeSchema,
  createWeightEntrySchema,
  createVitalsSchema,
  createInjectionSchema,
  createFoodEntrySchema,
  createMedicationSchema,
} from "../schemas";

describe("injectionSiteSchema", () => {
  it("accepts valid injection sites", () => {
    expect(injectionSiteSchema.parse("left_thigh")).toBe("left_thigh");
    expect(injectionSiteSchema.parse("right_abdomen")).toBe("right_abdomen");
  });

  it("rejects invalid injection sites", () => {
    expect(() => injectionSiteSchema.parse("forehead")).toThrow();
  });
});

describe("createWeightEntrySchema", () => {
  it("validates a valid weight entry", () => {
    const result = createWeightEntrySchema.parse({
      weight: 185.5,
      unit: "lbs",
      date: "2026-02-28",
    });
    expect(result.weight).toBe(185.5);
  });

  it("rejects negative weight", () => {
    expect(() =>
      createWeightEntrySchema.parse({ weight: -5, unit: "lbs", date: "2026-02-28" })
    ).toThrow();
  });
});

describe("createVitalsSchema", () => {
  it("validates valid vitals", () => {
    const result = createVitalsSchema.parse({
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
    });
    expect(result.systolic).toBe(120);
  });

  it("rejects out-of-range systolic", () => {
    expect(() =>
      createVitalsSchema.parse({ systolic: 400, diastolic: 80, heartRate: 72 })
    ).toThrow();
  });
});

describe("createInjectionSchema", () => {
  it("validates a valid injection", () => {
    const result = createInjectionSchema.parse({
      medicationId: "123e4567-e89b-12d3-a456-426614174000",
      site: "left_thigh",
      dose: 0.5,
    });
    expect(result.site).toBe("left_thigh");
  });
});

describe("createMedicationSchema", () => {
  it("validates a valid medication", () => {
    const result = createMedicationSchema.parse({
      name: "Ozempic",
      currentDose: 0.5,
      doseUnit: "mg",
      scheduleDays: 7,
    });
    expect(result.name).toBe("Ozempic");
  });
});

describe("createFoodEntrySchema", () => {
  it("validates a valid food entry", () => {
    const result = createFoodEntrySchema.parse({
      mealType: "lunch",
      items: [{ name: "Chicken breast", quantity: "6 oz" }],
      calories: 280,
      protein: 52,
      carbs: 0,
      fat: 6,
    });
    expect(result.mealType).toBe("lunch");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm turbo test --filter=@glp1/shared
```
Expected: FAIL (modules not found)

**Step 3: Implement schemas**

`packages/shared/src/schemas.ts`:
```ts
import { z } from "zod";

// --- Enums ---

export const INJECTION_SITES = [
  "left_thigh",
  "right_thigh",
  "left_abdomen",
  "right_abdomen",
  "left_arm",
  "right_arm",
] as const;

export const injectionSiteSchema = z.enum(INJECTION_SITES);

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export const mealTypeSchema = z.enum(MEAL_TYPES);

export const WEIGHT_UNITS = ["lbs", "kg"] as const;
export const weightUnitSchema = z.enum(WEIGHT_UNITS);

// --- Create Schemas ---

export const createMedicationSchema = z.object({
  name: z.string().min(1).max(100),
  currentDose: z.number().positive().max(100),
  doseUnit: z.string().default("mg"),
  scheduleDays: z.number().int().positive().max(90).default(7),
});

export const createInjectionSchema = z.object({
  medicationId: z.string().uuid(),
  site: injectionSiteSchema,
  dose: z.number().positive().max(100),
  notes: z.string().max(500).optional(),
  date: z.string().datetime().optional(),
});

export const createWeightEntrySchema = z.object({
  weight: z.number().positive().max(1500),
  unit: weightUnitSchema.default("lbs"),
  date: z.string().min(1),
});

export const createVitalsSchema = z.object({
  systolic: z.number().int().min(50).max(300),
  diastolic: z.number().int().min(20).max(200),
  heartRate: z.number().int().min(20).max(300),
  date: z.string().datetime().optional(),
});

export const foodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
});

export const createFoodEntrySchema = z.object({
  mealType: mealTypeSchema,
  items: z.array(foodItemSchema).min(1),
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  photoUrl: z.string().url().optional(),
  date: z.string().datetime().optional(),
});
```

`packages/shared/src/types.ts`:
```ts
import type { z } from "zod";
import type {
  createMedicationSchema,
  createInjectionSchema,
  createWeightEntrySchema,
  createVitalsSchema,
  createFoodEntrySchema,
  injectionSiteSchema,
  mealTypeSchema,
} from "./schemas";

export type InjectionSite = z.infer<typeof injectionSiteSchema>;
export type MealType = z.infer<typeof mealTypeSchema>;

export type CreateMedication = z.infer<typeof createMedicationSchema>;
export type CreateInjection = z.infer<typeof createInjectionSchema>;
export type CreateWeightEntry = z.infer<typeof createWeightEntrySchema>;
export type CreateVitals = z.infer<typeof createVitalsSchema>;
export type CreateFoodEntry = z.infer<typeof createFoodEntrySchema>;
```

`packages/shared/src/constants.ts`:
```ts
export const GLP1_MEDICATIONS = [
  { name: "Ozempic", doses: [0.25, 0.5, 1.0, 2.0], unit: "mg", scheduleDays: 7 },
  { name: "Mounjaro", doses: [2.5, 5, 7.5, 10, 12.5, 15], unit: "mg", scheduleDays: 7 },
  { name: "Wegovy", doses: [0.25, 0.5, 1.0, 1.7, 2.4], unit: "mg", scheduleDays: 7 },
  { name: "Zepbound", doses: [2.5, 5, 7.5, 10, 12.5, 15], unit: "mg", scheduleDays: 7 },
  { name: "Saxenda", doses: [0.6, 1.2, 1.8, 2.4, 3.0], unit: "mg", scheduleDays: 1 },
] as const;

export const INJECTION_SITE_LABELS: Record<string, string> = {
  left_thigh: "Left Thigh",
  right_thigh: "Right Thigh",
  left_abdomen: "Left Abdomen",
  right_abdomen: "Right Abdomen",
  left_arm: "Left Upper Arm",
  right_arm: "Right Upper Arm",
};

export const BP_RANGES = {
  normal: { systolic: [0, 120], diastolic: [0, 80] },
  elevated: { systolic: [120, 130], diastolic: [0, 80] },
  high1: { systolic: [130, 140], diastolic: [80, 90] },
  high2: { systolic: [140, 300], diastolic: [90, 200] },
} as const;
```

**Step 4: Run tests to verify they pass**

```bash
pnpm turbo test --filter=@glp1/shared
```
Expected: PASS

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Zod validation schemas, TypeScript types, and GLP-1 constants"
```

---

### Task 1.2: Define Drizzle ORM database schema

**Files:**
- Create: `packages/db/src/schema.ts`
- Create: `packages/db/src/relations.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/drizzle.config.ts`

**Step 1: Create the Drizzle schema**

`packages/db/src/schema.ts`:
```ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
  decimal,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// --- Enums ---

export const injectionSiteEnum = pgEnum("injection_site", [
  "left_thigh",
  "right_thigh",
  "left_abdomen",
  "right_abdomen",
  "left_arm",
  "right_arm",
]);

export const mealTypeEnum = pgEnum("meal_type", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export const weightUnitEnum = pgEnum("weight_unit", ["lbs", "kg"]);

// --- Tables ---

export const medications = pgTable("medications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  currentDose: decimal("current_dose", { precision: 6, scale: 2 }).notNull(),
  doseUnit: text("dose_unit").notNull().default("mg"),
  scheduleDays: integer("schedule_days").notNull().default(7),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const injections = pgTable("injections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  medicationId: uuid("medication_id")
    .notNull()
    .references(() => medications.id, { onDelete: "cascade" }),
  site: injectionSiteEnum("site").notNull(),
  dose: decimal("dose", { precision: 6, scale: 2 }).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weightEntries = pgTable("weight_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  date: date("date").notNull(),
  weight: decimal("weight", { precision: 6, scale: 2 }).notNull(),
  unit: weightUnitEnum("unit").notNull().default("lbs"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vitals = pgTable("vitals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  systolic: integer("systolic").notNull(),
  diastolic: integer("diastolic").notNull(),
  heartRate: integer("heart_rate").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const foodEntries = pgTable("food_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  mealType: mealTypeEnum("meal_type").notNull(),
  items: jsonb("items").notNull().$type<{ name: string; quantity?: string; calories?: number; protein?: number; carbs?: number; fat?: number }[]>(),
  calories: integer("calories"),
  protein: decimal("protein", { precision: 6, scale: 1 }),
  carbs: decimal("carbs", { precision: 6, scale: 1 }),
  fat: decimal("fat", { precision: 6, scale: 1 }),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: jsonb("ingredients").notNull().$type<{ name: string; amount: string; unit?: string }[]>(),
  instructions: jsonb("instructions").notNull().$type<string[]>(),
  prepTime: integer("prep_time"),
  cookTime: integer("cook_time"),
  servings: integer("servings"),
  calories: integer("calories"),
  protein: decimal("protein", { precision: 6, scale: 1 }),
  carbs: decimal("carbs", { precision: 6, scale: 1 }),
  fat: decimal("fat", { precision: 6, scale: 1 }),
  tags: text("tags").array(),
  glp1FriendlyNotes: text("glp1_friendly_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userFavorites = pgTable("user_favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**Step 2: Create relations**

`packages/db/src/relations.ts`:
```ts
import { relations } from "drizzle-orm";
import {
  medications,
  injections,
  weightEntries,
  vitals,
  foodEntries,
  recipes,
  userFavorites,
} from "./schema";

export const medicationsRelations = relations(medications, ({ many }) => ({
  injections: many(injections),
}));

export const injectionsRelations = relations(injections, ({ one }) => ({
  medication: one(medications, {
    fields: [injections.medicationId],
    references: [medications.id],
  }),
}));

export const recipesRelations = relations(recipes, ({ many }) => ({
  favorites: many(userFavorites),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  recipe: one(recipes, {
    fields: [userFavorites.recipeId],
    references: [recipes.id],
  }),
}));
```

**Step 3: Create database client**

`packages/db/src/client.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as relations from "./relations";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client, { schema: { ...schema, ...relations } });
```

**Step 4: Create drizzle.config.ts**

`packages/db/drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 5: Update packages/db/src/index.ts**

```ts
export * from "./schema";
export * from "./relations";
export { db } from "./client";
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Drizzle ORM schema with all tables, relations, and client"
```

---

### Task 1.3: Set up Supabase project and run initial migration

**Files:**
- Create: `supabase/config.toml` (via supabase init)
- Create: `.env.local` (template)
- Create: `packages/db/drizzle/` (generated migration)

**Step 1: Install Supabase CLI (if not installed)**

```bash
brew install supabase/tap/supabase
```

**Step 2: Initialize Supabase in the project**

```bash
supabase init
```

**Step 3: Create .env.example at root**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Step 4: Start local Supabase**

```bash
supabase start
```

**Step 5: Generate Drizzle migration**

```bash
cd packages/db && pnpm db:generate
```

**Step 6: Push schema to local Supabase**

```bash
cd packages/db && DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres pnpm db:push
```

**Step 7: Verify tables exist**

```bash
supabase db reset --linked=false
```
Or check via Supabase Studio at http://localhost:54323

**Step 8: Commit**

```bash
git add -A && git commit -m "feat: initialize Supabase, generate and apply Drizzle migration"
```

---

## Phase 2: Auth + Profile Setup

### Task 2.1: Set up Supabase Auth in Next.js

**Files:**
- Create: `apps/web/lib/supabase/server.ts`
- Create: `apps/web/lib/supabase/client.ts`
- Create: `apps/web/lib/supabase/middleware.ts`
- Create: `apps/web/middleware.ts`
- Create: `apps/web/app/auth/login/page.tsx`
- Create: `apps/web/app/auth/signup/page.tsx`
- Create: `apps/web/app/auth/callback/route.ts`

**Step 1: Create Supabase server client**

`apps/web/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

**Step 2: Create Supabase browser client**

`apps/web/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 3: Create auth middleware**

`apps/web/lib/supabase/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    request.nextUrl.pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

`apps/web/middleware.ts`:
```ts
import { updateSession } from "~/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

**Step 4: Create login page**

`apps/web/app/auth/login/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "~/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: "80px auto", padding: 24 }}>
      <h1>Sign In</h1>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: "8px 24px" }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        Don't have an account? <a href="/auth/signup">Sign up</a>
      </p>
    </main>
  );
}
```

**Step 5: Create signup page** (similar structure to login but calls `supabase.auth.signUp`)

**Step 6: Create auth callback route**

`apps/web/app/auth/callback/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could+not+authenticate`);
}
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add Supabase Auth with login, signup, middleware, and callback"
```

---

### Task 2.2: Set up tRPC API layer

**Files:**
- Create: `packages/api/src/trpc.ts`
- Create: `packages/api/src/root.ts`
- Create: `packages/api/src/router/medication.ts`
- Create: `apps/web/app/api/trpc/[trpc]/route.ts`
- Create: `apps/web/lib/trpc/server.ts`
- Create: `apps/web/lib/trpc/react.tsx`

**Step 1: Create tRPC context and initialization**

`packages/api/src/trpc.ts`:
```ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

export type Context = {
  userId: string | null;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { userId: ctx.userId } });
});
```

**Step 2: Create medication router**

`packages/api/src/router/medication.ts`:
```ts
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { medications } from "@glp1/db";
import { createMedicationSchema } from "@glp1/shared";
import { db } from "@glp1/db";

export const medicationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(medications)
      .where(eq(medications.userId, ctx.userId));
  }),

  create: protectedProcedure
    .input(createMedicationSchema)
    .mutation(async ({ ctx, input }) => {
      const [medication] = await db
        .insert(medications)
        .values({
          userId: ctx.userId,
          name: input.name,
          currentDose: String(input.currentDose),
          doseUnit: input.doseUnit,
          scheduleDays: input.scheduleDays,
        })
        .returning();
      return medication;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(medications)
        .where(eq(medications.id, input.id));
    }),
});
```

**Step 3: Create root router**

`packages/api/src/root.ts`:
```ts
import { createTRPCRouter } from "./trpc";
import { medicationRouter } from "./router/medication";

export const appRouter = createTRPCRouter({
  medication: medicationRouter,
});

export type AppRouter = typeof appRouter;
```

**Step 4: Wire tRPC into Next.js**

`apps/web/app/api/trpc/[trpc]/route.ts`:
```ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@glp1/api";
import { createClient } from "~/lib/supabase/server";

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      return { userId: user?.id ?? null };
    },
  });
};

export { handler as GET, handler as POST };
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add tRPC API layer with medication router and Next.js integration"
```

---

## Phase 3: Weight Tracking

### Task 3.1: Weight tRPC router + tests

**Files:**
- Create: `packages/api/src/router/weight.ts`
- Create: `packages/api/src/__tests__/weight.test.ts`
- Modify: `packages/api/src/root.ts` (add weight router)

**Step 1: Write tests for weight router**

Test weight.list returns entries, weight.create validates and inserts, weight.stats calculates total lost / rate.

**Step 2: Implement weight router**

Procedures: `list` (with date range filter), `create`, `delete`, `stats` (total lost, rate per week, current streak).

**Step 3: Run tests, verify pass**

**Step 4: Commit**

---

### Task 3.2: Weight tracking UI components

**Files:**
- Create: `packages/ui/src/WeightEntryForm.tsx`
- Create: `packages/ui/src/WeightChart.tsx`
- Create: `packages/ui/src/WeightStats.tsx`
- Create: `apps/web/app/dashboard/weight/page.tsx`

**Step 1: Build WeightEntryForm** — Tamagui form with number input for weight, unit toggle (lbs/kg), date picker, submit button. Uses Zod schema validation.

**Step 2: Build WeightChart** — Line chart using `victory-native` (works on both platforms) showing weight over time with an optional goal line.

**Step 3: Build WeightStats** — Card showing current weight, total lost, average rate, and logging streak.

**Step 4: Build the weight page** — Combines form + chart + stats, wired to tRPC `weight.list`, `weight.create`, `weight.stats`.

**Step 5: Commit**

---

## Phase 4: Injection Tracker

### Task 4.1: Injection tRPC router + rotation algorithm

**Files:**
- Create: `packages/api/src/router/injection.ts`
- Create: `packages/shared/src/injection-rotation.ts`
- Create: `packages/shared/src/__tests__/injection-rotation.test.ts`
- Modify: `packages/api/src/root.ts`

**Step 1: Write tests for rotation algorithm**

Test: given last N injection sites, suggest the least-recently-used site. Handle edge cases: no history (suggest left_thigh), all sites used equally (round-robin), etc.

**Step 2: Implement rotation algorithm in packages/shared**

**Step 3: Write tests for injection router**

Test: `list`, `create`, `suggestNextSite`, `upcomingReminder`.

**Step 4: Implement injection router**

**Step 5: Commit**

---

### Task 4.2: Interactive body map SVG component

**Files:**
- Create: `packages/ui/src/BodyMap.tsx`
- Create: `packages/ui/src/BodyMapSvg.tsx` (SVG paths for front/back body)
- Create: `packages/ui/src/__tests__/BodyMap.test.tsx`

**Step 1: Create SVG body outline** — Front and back views with 6 tappable regions (left/right thigh, abdomen, arm). Each region is a pressable SVG path.

**Step 2: Add color-coded history overlay** — Recent injections shown with colored dots: bright for recent, fading for older. Uses a gradient scale based on recency.

**Step 3: Add "suggested next site" indicator** — Pulsing highlight on the recommended next injection site.

**Step 4: Wire to tRPC** — On tap, calls `injection.create`. On load, calls `injection.list` for history overlay and `injection.suggestNextSite` for suggestion.

**Step 5: Commit**

---

### Task 4.3: Injection reminder notifications

**Files:**
- Create: `packages/shared/src/reminder-utils.ts`
- Create: `apps/mobile/lib/notifications.ts`
- Create: `apps/web/lib/notifications.ts`

**Step 1: Calculate next injection date** from last injection + medication scheduleDays.

**Step 2: Set up Expo push notifications** on mobile.

**Step 3: Set up Web Push API** for web (future; stub for now).

**Step 4: Commit**

---

## Phase 5: Vitals Tracking

### Task 5.1: Vitals tRPC router

**Files:**
- Create: `packages/api/src/router/vitals.ts`
- Modify: `packages/api/src/root.ts`

Procedures: `list` (date range), `create`, `latest`, `trends` (weekly averages).

**Commit after tests pass.**

---

### Task 5.2: Vitals UI — entry form + trend charts

**Files:**
- Create: `packages/ui/src/VitalsEntryForm.tsx`
- Create: `packages/ui/src/VitalsChart.tsx`
- Create: `packages/ui/src/BPIndicator.tsx` (color-coded normal/elevated/high)
- Create: `apps/web/app/dashboard/vitals/page.tsx`

Uses `BP_RANGES` from constants for color coding.

**Commit after working.**

---

## Phase 6: Food Tracking

### Task 6.1: Food entry tRPC router + USDA API integration

**Files:**
- Create: `packages/api/src/router/food.ts`
- Create: `packages/api/src/services/usda.ts`
- Modify: `packages/api/src/root.ts`

Procedures: `log`, `list` (by date), `dailySummary` (macro totals), `searchFood` (USDA FoodData Central API proxy).

**Commit after tests pass.**

---

### Task 6.2: Food tracking UI — manual entry + search

**Files:**
- Create: `packages/ui/src/FoodEntryForm.tsx`
- Create: `packages/ui/src/FoodSearch.tsx`
- Create: `packages/ui/src/MacroSummary.tsx`
- Create: `apps/web/app/dashboard/food/page.tsx`

Manual entry form with food name, quantity, macros. Search box that queries USDA API and auto-fills macros on selection.

**Commit after working.**

---

### Task 6.3: Photo AI food recognition (Supabase Edge Function)

**Files:**
- Create: `supabase/functions/analyze-food-photo/index.ts`
- Create: `packages/api/src/services/food-photo.ts`
- Modify: `packages/api/src/router/food.ts` (add `analyzePhoto` procedure)

**Step 1: Create Supabase Edge Function** that receives a photo URL, sends it to Claude Vision API with a prompt to identify food items and estimate macros, returns structured JSON.

**Step 2: Add `analyzePhoto` tRPC procedure** — accepts photo upload, stores in Supabase Storage, calls edge function, returns AI-identified items for user confirmation.

**Step 3: Add camera capture UI** in mobile app and file upload in web app.

**Commit after working.**

---

### Task 6.4: Barcode scanning (OpenFoodFacts)

**Files:**
- Create: `packages/api/src/services/openfoodfacts.ts`
- Modify: `packages/api/src/router/food.ts` (add `lookupBarcode` procedure)
- Create: `apps/mobile/components/BarcodeScanner.tsx`

**Step 1: Create OpenFoodFacts API client** — lookup by barcode, extract product name, serving size, calories, protein, carbs, fat.

**Step 2: Add `lookupBarcode` tRPC procedure**.

**Step 3: Add barcode scanner UI** using `expo-camera` barcode scanning.

**Commit after working.**

---

## Phase 7: Recipes

### Task 7.1: Recipe tRPC router + seed data

**Files:**
- Create: `packages/api/src/router/recipe.ts`
- Create: `packages/db/src/seed/recipes.ts`
- Modify: `packages/api/src/root.ts`

**Step 1: Create recipe router** — `list` (with tag/macro filters), `getById`, `search` (text search), `toggleFavorite`, `favorites`.

**Step 2: Create seed data** — 20-30 curated GLP-1-friendly recipes across categories (high-protein, anti-nausea, low-sugar, small-portion).

**Step 3: Create seed script** to insert recipes into database.

**Commit after tests pass.**

---

### Task 7.2: Recipe browsing UI

**Files:**
- Create: `packages/ui/src/RecipeCard.tsx`
- Create: `packages/ui/src/RecipeDetail.tsx`
- Create: `packages/ui/src/RecipeFilters.tsx`
- Create: `apps/web/app/dashboard/recipes/page.tsx`
- Create: `apps/web/app/dashboard/recipes/[id]/page.tsx`

Grid of recipe cards, filterable by tags, searchable. Detail view with ingredients, instructions, macros per serving, GLP-1 notes, favorite toggle.

**Commit after working.**

---

## Phase 8: Dashboard

### Task 8.1: Dashboard tRPC aggregation

**Files:**
- Create: `packages/api/src/router/dashboard.ts`
- Modify: `packages/api/src/root.ts`

Single `dashboard.summary` procedure returning:
- Latest weight + trend direction
- Next injection info (date, suggested site)
- Today's macro totals
- Latest vitals
- Logging streaks (weight, food, injection)

**Commit after tests pass.**

---

### Task 8.2: Dashboard UI

**Files:**
- Create: `packages/ui/src/DashboardSummary.tsx`
- Create: `packages/ui/src/SparklineChart.tsx`
- Create: `packages/ui/src/StreakCounter.tsx`
- Create: `packages/ui/src/NextInjectionCard.tsx`
- Create: `packages/ui/src/TodayMacrosCard.tsx`
- Create: `apps/web/app/dashboard/page.tsx`

Card-based layout: weight sparkline, next injection reminder, today's macros donut chart, latest BP/HR, streak badges. Each card links to its detail page.

**Commit after working.**

---

## Phase 9: Reports & Export

### Task 9.1: Report generation

**Files:**
- Create: `packages/api/src/router/reports.ts`
- Create: `packages/api/src/services/export.ts`

Procedures:
- `reports.weekly` — weight delta, injection count, avg macros, avg BP/HR for the past week
- `reports.monthly` — same but monthly
- `reports.exportCsv` — generate CSV string of all data in date range
- `reports.exportPdf` — generate PDF report (via `@react-pdf/renderer` or server-side)

**Commit after tests pass.**

---

### Task 9.2: Reports UI

**Files:**
- Create: `apps/web/app/dashboard/reports/page.tsx`
- Create: `packages/ui/src/WeeklyReport.tsx`
- Create: `packages/ui/src/ExportButtons.tsx`

Weekly/monthly toggle, charts, download CSV/PDF buttons.

**Commit after working.**

---

## Phase 10: Settings & Polish

### Task 10.1: Settings page

**Files:**
- Create: `apps/web/app/dashboard/settings/page.tsx`
- Create: `packages/ui/src/MedicationManager.tsx`
- Create: `packages/ui/src/UnitPreferences.tsx`

Manage medications (add/edit/delete), select weight unit preference, notification preferences, sign out.

---

### Task 10.2: Navigation & layout

**Files:**
- Create: `apps/web/app/dashboard/layout.tsx`
- Create: `packages/ui/src/Sidebar.tsx`
- Create: `packages/ui/src/MobileNav.tsx`

Dashboard layout with sidebar navigation (web) and bottom tab bar (mobile). Links: Dashboard, Weight, Injections, Vitals, Food, Recipes, Reports, Settings.

---

### Task 10.3: CI/CD with GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

Jobs: lint, typecheck, test (all packages), build (web). Runs on push/PR to main.

---

### Task 10.4: Mobile app screens (Expo Router)

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx` (dashboard)
- Create: `apps/mobile/app/(tabs)/weight.tsx`
- Create: `apps/mobile/app/(tabs)/injections.tsx`
- Create: `apps/mobile/app/(tabs)/food.tsx`
- Create: `apps/mobile/app/(tabs)/recipes.tsx`

Wire Expo Router tab navigation to the shared UI components from `@glp1/ui`, connecting to tRPC via the mobile client.

---

## Execution Notes

- **Total tasks**: ~25 discrete tasks across 10 phases
- **Critical path**: Phase 0 → 1 → 2 must be sequential (infrastructure). Phases 3-7 can be partially parallelized.
- **Test coverage target**: 80%+ for `packages/shared` and `packages/api`, component tests for key UI components.
- **Each task should end with a commit** to maintain a clean, reviewable git history.
- **Environment variables**: Store all secrets in `.env.local` (git-ignored). Template in `.env.example`.
