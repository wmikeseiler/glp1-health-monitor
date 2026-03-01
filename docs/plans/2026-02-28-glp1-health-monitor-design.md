# GLP-1 Health Monitor — Design Document

**Date**: 2026-02-28
**Status**: Approved

## Overview

A personal health monitoring application for tracking GLP-1 medication therapy, weight, vitals, food intake, and discovering GLP-1-optimized recipes. Built as a cross-platform mobile and web app with a shared codebase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo |
| Mobile | Expo (React Native) |
| Web | Next.js 14+ |
| Shared UI | Tamagui |
| API | tRPC (end-to-end type safety) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| ORM | Drizzle ORM |
| Validation | Zod |
| Language | TypeScript everywhere |

## Project Structure

```
glp1-health-monitor/
├── apps/
│   ├── mobile/          # Expo (React Native) app
│   └── web/             # Next.js app
├── packages/
│   ├── api/             # tRPC router + procedures
│   ├── db/              # Supabase client, Drizzle schema, migrations
│   ├── ui/              # Tamagui shared components
│   └── shared/          # Zod schemas, types, constants, utils
├── supabase/            # Supabase config, seed data, edge functions
├── turbo.json
├── package.json
└── tsconfig.json
```

## Data Model

### users
Managed by Supabase Auth. Fields: id, email, name, created_at.

### medications
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| name | text | Ozempic, Mounjaro, Wegovy, etc. |
| current_dose | decimal | Current dose amount |
| dose_unit | text | mg |
| schedule_days | integer | Days between injections (typically 7) |

### injections
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| medication_id | uuid | FK to medications |
| site | enum | Body location (left_thigh, right_thigh, left_abdomen, right_abdomen, left_arm, right_arm) |
| date | timestamptz | When the injection was administered |
| dose | decimal | Dose amount |
| notes | text | Optional notes (side effects, etc.) |

### weight_entries
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| date | date | Entry date |
| weight | decimal | Weight value |
| unit | text | lbs or kg |

### vitals
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| date | timestamptz | Measurement time |
| systolic | integer | Systolic BP (mmHg) |
| diastolic | integer | Diastolic BP (mmHg) |
| heart_rate | integer | Resting HR (bpm) |

### food_entries
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| date | timestamptz | Meal time |
| meal_type | enum | breakfast, lunch, dinner, snack |
| items | jsonb | Array of food items with names, quantities |
| calories | integer | Total calories |
| protein | decimal | Grams of protein |
| carbs | decimal | Grams of carbs |
| fat | decimal | Grams of fat |
| photo_url | text | Optional meal photo URL (Supabase Storage) |

### recipes
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| title | text | Recipe name |
| description | text | Short description |
| ingredients | jsonb | Ingredient list with quantities |
| instructions | jsonb | Step-by-step instructions |
| prep_time | integer | Minutes |
| cook_time | integer | Minutes |
| servings | integer | Number of servings |
| calories | integer | Per serving |
| protein | decimal | Per serving |
| carbs | decimal | Per serving |
| fat | decimal | Per serving |
| tags | text[] | Categories: high-protein, anti-nausea, low-sugar, etc. |
| glp1_friendly_notes | text | Why this recipe works for GLP-1 patients |

### user_favorites
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| recipe_id | uuid | FK to recipes |

## Screens

| Screen | Description |
|--------|------------|
| Home Dashboard | Today's summary: weight trend sparkline, next injection reminder, today's macros, recent vitals, streak counter |
| Injection Tracker | Interactive body map (front/back), tap to log injection site, color-coded history overlay, smart "inject here next" suggestion, dose selection |
| Weight Log | Quick entry, line chart with goal line, weekly/monthly trends, stats (total lost, rate of change) |
| Vitals Log | BP + HR entry, trend charts, normal range indicators |
| Food Tracker | Camera button (AI photo recognition), barcode scanner, manual search/entry, daily macro summary, meal breakdown |
| Recipes | Browse GLP-1-optimized recipes by category, search, filter by macro targets, save favorites |
| Reports | Weekly/monthly summaries, exportable charts (PDF/CSV), progress snapshots |
| Settings | Profile, medication management, units, notification preferences |

## Key Interactions

### Injection Site Rotation
- Interactive body diagram (front and back views) rendered with SVG
- Tap a body region to log an injection at that site
- Color-coded overlay shows recent injection history (fading colors for older entries)
- Algorithm tracks last 8 injection sites and suggests the least-recently-used site
- Push notification reminders based on medication schedule

### Food Photo Recognition
- Camera capture → image sent to Claude Vision API via Supabase Edge Function
- AI identifies food items and estimates portions/macros
- User confirms or edits the AI's suggestions
- Final entry saved with photo to Supabase Storage

### Barcode Scanning
- Camera-based barcode scanner (expo-barcode-scanner)
- Lookup via OpenFoodFacts API (free, open-source)
- Auto-fills nutrition data, user confirms and saves

### Recipe Recommendations
- Curated database of GLP-1-optimized recipes
- Tagged by category: high-protein, anti-nausea, low-sugar, small-portion
- Filterable by macro targets and dietary preferences
- Users can save favorites

## External Integrations

| Integration | Service | Purpose |
|------------|---------|---------|
| Food photo AI | Claude Vision API (Anthropic) | Identify food from photos, estimate macros |
| Barcode lookup | OpenFoodFacts API | Nutrition data for packaged foods |
| Food database | USDA FoodData Central API | Manual food search with nutrition data |
| Push notifications | Expo Notifications / Web Push | Injection reminders, medication alerts |
| File storage | Supabase Storage | Food photos, profile images |
| Authentication | Supabase Auth | Email/password + Google + Apple sign-in |

## Testing Strategy

| Type | Tool | Scope |
|------|------|-------|
| Unit tests | Vitest | Shared packages, API logic, utilities |
| Component tests | React Testing Library | Tamagui shared components |
| E2E tests (web) | Playwright | Web app user flows |
| E2E tests (mobile) | Detox (future) | Mobile app user flows |

## Deployment

| Target | Platform |
|--------|---------|
| Web | Vercel |
| Mobile | EAS Build (Expo Application Services) |
| Database | Supabase (hosted) |
| CI/CD | GitHub Actions (lint, type-check, test on PR; auto-deploy on merge) |

## MVP Phasing

1. Auth + profile setup (medication selection, dose schedule)
2. Weight tracking (log + chart)
3. Injection tracker (body map + reminders)
4. Vitals (BP + HR logging + charts)
5. Food tracking (manual entry first, then photo AI, then barcode)
6. Recipes (browse curated recipes)
7. Dashboard (pull it all together)
8. Reports + export (PDF/CSV)
