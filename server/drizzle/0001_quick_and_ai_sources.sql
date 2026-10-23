ALTER TYPE "public"."source" ADD VALUE 'quick' BEFORE 'photo';--> statement-breakpoint
ALTER TYPE "public"."source" ADD VALUE 'ai' BEFORE 'photo';--> statement-breakpoint
ALTER TABLE "exercise_entries" ALTER COLUMN "minutes" SET DEFAULT 0;