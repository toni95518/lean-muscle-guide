CREATE TYPE "public"."goal" AS ENUM('lose1', 'lose05', 'maintain', 'gain05');--> statement-breakpoint
CREATE TYPE "public"."height_unit" AS ENUM('cm', 'ftin');--> statement-breakpoint
CREATE TYPE "public"."meal" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('ios', 'android', 'web', 'wechat');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('female', 'male');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('manual', 'library', 'custom', 'photo', 'apple_health', 'werun', 'fitbit');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lb', 'jin');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"met" real NOT NULL,
	CONSTRAINT "activities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "custom_foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"serving" text DEFAULT '1 serving' NOT NULL,
	"kcal" real NOT NULL,
	"protein" real DEFAULT 0 NOT NULL,
	"carbs" real DEFAULT 0 NOT NULL,
	"fat" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"water_glasses" integer DEFAULT 0 NOT NULL,
	"weight_kg" real,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"minutes" integer NOT NULL,
	"kcal" integer NOT NULL,
	"met" real,
	"note" text,
	"source" "source" DEFAULT 'manual' NOT NULL,
	"activity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"meal" "meal" NOT NULL,
	"name" text NOT NULL,
	"serving" text DEFAULT '1 serving' NOT NULL,
	"kcal" real NOT NULL,
	"protein" real DEFAULT 0 NOT NULL,
	"carbs" real DEFAULT 0 NOT NULL,
	"fat" real DEFAULT 0 NOT NULL,
	"quantity" real DEFAULT 1 NOT NULL,
	"source" "source" DEFAULT 'manual' NOT NULL,
	"food_id" uuid,
	"custom_food_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"serving" text NOT NULL,
	"kcal" real NOT NULL,
	"protein" real NOT NULL,
	"carbs" real NOT NULL,
	"fat" real NOT NULL,
	CONSTRAINT "foods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sex" "sex" DEFAULT 'female' NOT NULL,
	"age" integer DEFAULT 30 NOT NULL,
	"height_cm" real DEFAULT 168 NOT NULL,
	"weight_kg" real DEFAULT 68 NOT NULL,
	"activity" real DEFAULT 1.375 NOT NULL,
	"goal" "goal" DEFAULT 'maintain' NOT NULL,
	"calorie_override" integer,
	"protein_per_kg" real DEFAULT 1.6 NOT NULL,
	"water_goal" integer DEFAULT 8 NOT NULL,
	"weight_unit" "weight_unit" DEFAULT 'lb' NOT NULL,
	"height_unit" "height_unit" DEFAULT 'ftin' NOT NULL,
	"setup_complete" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"password_hash" text,
	"wechat_open_id" text,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_wechat_open_id_unique" UNIQUE("wechat_open_id")
);
--> statement-breakpoint
ALTER TABLE "custom_foods" ADD CONSTRAINT "custom_foods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_logs" ADD CONSTRAINT "day_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_entries" ADD CONSTRAINT "exercise_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_entries" ADD CONSTRAINT "exercise_entries_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_custom_food_id_custom_foods_id_fk" FOREIGN KEY ("custom_food_id") REFERENCES "public"."custom_foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "custom_foods_user_name" ON "custom_foods" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "day_logs_user_date" ON "day_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "exercise_entries_user_date" ON "exercise_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "food_entries_user_date" ON "food_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "push_tokens_user" ON "push_tokens" USING btree ("user_id");