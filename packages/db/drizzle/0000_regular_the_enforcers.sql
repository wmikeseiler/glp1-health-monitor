CREATE TYPE "public"."injection_site" AS ENUM('left_thigh', 'right_thigh', 'left_abdomen', 'right_abdomen', 'left_arm', 'right_arm');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('lbs', 'kg');--> statement-breakpoint
CREATE TABLE "food_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"items" jsonb NOT NULL,
	"calories" integer,
	"protein" numeric(6, 1),
	"carbs" numeric(6, 1),
	"fat" numeric(6, 1),
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "injections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"site" "injection_site" NOT NULL,
	"dose" numeric(6, 2) NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"current_dose" numeric(6, 2) NOT NULL,
	"dose_unit" text DEFAULT 'mg' NOT NULL,
	"schedule_days" integer DEFAULT 7 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"ingredients" jsonb NOT NULL,
	"instructions" jsonb NOT NULL,
	"prep_time" integer,
	"cook_time" integer,
	"servings" integer,
	"calories" integer,
	"protein" numeric(6, 1),
	"carbs" numeric(6, 1),
	"fat" numeric(6, 1),
	"tags" text[],
	"glp1_friendly_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"systolic" integer NOT NULL,
	"diastolic" integer NOT NULL,
	"heart_rate" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"weight" numeric(6, 2) NOT NULL,
	"unit" "weight_unit" DEFAULT 'lbs' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "injections" ADD CONSTRAINT "injections_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;