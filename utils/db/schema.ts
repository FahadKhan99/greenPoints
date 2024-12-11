import {
  pgTable,
  integer,
  varchar,
  serial,
  text,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

export const Users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const Reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => Users.id)
    .notNull(), // this is how we make relations
  location: text("location").notNull(),
  wasteType: varchar("waste_type", { length: 255 }).notNull(),
  amount: integer("amount").notNull(),
  imageUrl: text("image_url").notNull(),
  verificationResult: jsonb("verification_result"),
  status: varchar("status", { length: 255 }).notNull().default("pending"),
  collectorId: integer("collector_id").references(() => Users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("created_at").defaultNow().notNull(),
});

export const Rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id),
  points: integer()
});
