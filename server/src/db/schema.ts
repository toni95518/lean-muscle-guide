// Fuel & Move database schema (Drizzle ORM, PostgreSQL).
//
// Canonical units: weight in kg, height in cm, energy in kcal, macros in grams.
// Clients convert for display (lb, jin, ft/in) using the profile's unit preferences.
// Calendar dates are the user's local date, sent by the client as YYYY-MM-DD.
import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const sexEnum = pgEnum("sex", ["female", "male"]);
// lose1: -500 kcal/day (~1 lb/week), lose05: -250, maintain: 0, gain05: +250
export const goalEnum = pgEnum("goal", ["lose1", "lose05", "maintain", "gain05"]);
// jin (斤) = 0.5 kg, for the WeChat Mini Program
export const weightUnitEnum = pgEnum("weight_unit", ["kg", "lb", "jin"]);
export const heightUnitEnum = pgEnum("height_unit", ["cm", "ftin"]);
export const mealEnum = pgEnum("meal", ["breakfast", "lunch", "dinner", "snack"]);
// Where an entry came from, so future integrations (photo AI, Apple Health,
// WeChat Sports, Fitbit) can write entries without schema changes.
export const sourceEnum = pgEnum("source", [
  "manual",
  "library",
  "custom",
  "quick", // calories typed in directly
  "ai", // estimated by the user's own AI assistant and pasted back
  "photo",
  "apple_health",
  "werun",
  "fitbit",
]);
export const platformEnum = pgEnum("platform", ["ios", "android", "web", "wechat"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  wechatOpenId: text("wechat_open_id").unique(),
  name: text("name"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  sex: sexEnum("sex").notNull().default("female"),
  age: integer("age").notNull().default(30),
  heightCm: real("height_cm").notNull().default(168),
  weightKg: real("weight_kg").notNull().default(68),
  activity: real("activity").notNull().default(1.375), // multiplier, 1.2–1.725
  goal: goalEnum("goal").notNull().default("maintain"),
  calorieOverride: integer("calorie_override"),
  proteinPerKg: real("protein_per_kg").notNull().default(1.6),
  waterGoal: integer("water_goal").notNull().default(8), // glasses of 250 ml (shown in liters)
  weightUnit: weightUnitEnum("weight_unit").notNull().default("lb"),
  heightUnit: heightUnitEnum("height_unit").notNull().default("ftin"),
  setupComplete: boolean("setup_complete").notNull().default(false),
  updatedAt: updatedAt(),
});

// One row per user per day for single-value metrics.
export const dayLogs = pgTable(
  "day_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    waterGlasses: integer("water_glasses").notNull().default(0),
    weightKg: real("weight_kg"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("day_logs_user_date").on(t.userId, t.date)],
);

// Shared food library (seeded). Values are per serving.
export const foods = pgTable("foods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  serving: text("serving").notNull(),
  kcal: real("kcal").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
});

// Shared activity library with MET values (Compendium of Physical Activities).
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  met: real("met").notNull(),
});

// Foods a user created; offered again in search.
export const customFoods = pgTable(
  "custom_foods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    serving: text("serving").notNull().default("1 serving"),
    kcal: real("kcal").notNull(),
    protein: real("protein").notNull().default(0),
    carbs: real("carbs").notNull().default(0),
    fat: real("fat").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("custom_foods_user_name").on(t.userId, t.name)],
);

export const foodEntries = pgTable(
  "food_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    meal: mealEnum("meal").notNull(),
    name: text("name").notNull(),
    serving: text("serving").notNull().default("1 serving"),
    // nutrition per serving; totals = value * quantity
    kcal: real("kcal").notNull(),
    protein: real("protein").notNull().default(0),
    carbs: real("carbs").notNull().default(0),
    fat: real("fat").notNull().default(0),
    quantity: real("quantity").notNull().default(1),
    source: sourceEnum("source").notNull().default("manual"),
    foodId: uuid("food_id").references(() => foods.id, { onDelete: "set null" }),
    customFoodId: uuid("custom_food_id").references(() => customFoods.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("food_entries_user_date").on(t.userId, t.date)],
);

export const exerciseEntries = pgTable(
  "exercise_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    name: text("name").notNull(),
    minutes: integer("minutes").notNull().default(0), // 0 = not recorded (quick add)
    kcal: integer("kcal").notNull(),
    met: real("met"),
    note: text("note"),
    source: sourceEnum("source").notNull().default("manual"),
    activityId: uuid("activity_id").references(() => activities.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("exercise_entries_user_date").on(t.userId, t.date)],
);

// Device tokens for push reminders (roadmap v2).
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_tokens_user").on(t.userId)],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  days: many(dayLogs),
  foodEntries: many(foodEntries),
  exerciseEntries: many(exerciseEntries),
  customFoods: many(customFoods),
  pushTokens: many(pushTokens),
}));
export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export type Profile = typeof profiles.$inferSelect;
export type FoodEntry = typeof foodEntries.$inferSelect;
export type ExerciseEntry = typeof exerciseEntries.$inferSelect;
